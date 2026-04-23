using MongoDB.Driver;
using Microsoft.Extensions.Configuration;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class SessionService
{
    private readonly MongoService _db;
    private readonly IConfiguration? _config;

    public SessionService(MongoService db, IConfiguration? config = null)
    {
        _db = db;
        _config = config;
    }

    public async Task AutoGenerateSessionsAsync(Group group, CancellationToken ct = default)
    {
        var schedules = await _db.GroupSchedules
            .Find(gs => gs.GroupId == group.Id)
            .ToListAsync(ct);

        if (schedules.Count == 0)
            return;

        // Use the refined ScheduleEngine to generate the full timeline
        var generatedSessions = ScheduleEngine.GenerateFromGroup(group, schedules);
        var cairoTz = GetConfiguredTimeZone();

        if (generatedSessions.Count > 0)
        {
            var sessionsToInsert = generatedSessions.Select(gs => 
            {
                var localTime = gs.ScheduledDate.Add(gs.StartTime);
                var offset = cairoTz.GetUtcOffset(localTime);
                return new Session
                {
                    GroupId = group.Id,
                    EngineerId = group.EngineerId,
                    SessionNumber = gs.SessionNumber,
                    ScheduledAt = new DateTimeOffset(localTime, offset).ToUniversalTime(),
                    Status = SessionStatus.Scheduled,
                    DurationMinutes = gs.DurationMinutes
                };
            }).ToList();

            await _db.Sessions.InsertManyAsync(sessionsToInsert, cancellationToken: ct);
        }
    }

    public async Task MaintainAllGroupsSessionsAsync(CancellationToken ct = default)
    {
        var activeGroups = await _db.Groups.Find(g => g.Status == GroupStatus.Active && !g.IsDeleted).ToListAsync(ct);
        foreach (var group in activeGroups)
        {
            if (ct.IsCancellationRequested) break;
            await MaintainSessionsAsync(group, ct);
        }
    }

    public async Task MaintainSessionsAsync(Group group, CancellationToken ct = default)
    {
        // Ensure at least 4 future sessions exist
        var futureCount = await _db.Sessions.CountDocumentsAsync(s => s.GroupId == group.Id && s.ScheduledAt > DateTimeOffset.UtcNow && !s.IsDeleted, cancellationToken: ct);
        if (futureCount >= 4) return;

        var lastSession = await _db.Sessions
            .Find(s => s.GroupId == group.Id && !s.IsDeleted)
            .SortByDescending(s => s.ScheduledAt)
            .FirstOrDefaultAsync();

        var lastSessionNum = lastSession?.SessionNumber ?? (group.StartingSessionNumber - 1);
        var lastDate = lastSession?.ScheduledAt ?? DateTimeOffset.UtcNow;

        if (lastSessionNum >= group.TotalSessions) return;

        var schedules = await _db.GroupSchedules.Find(gs => gs.GroupId == group.Id).ToListAsync();
        if (schedules.Count == 0) return;

        var cairoTz = GetConfiguredTimeZone();
        var sessionsToGenerate = Math.Min(4, group.TotalSessions - lastSessionNum);
        var newSessions = new List<Session>();

        // Find the next available schedule slots after lastDate
        var currentRefDate = TimeZoneInfo.ConvertTime(lastDate, cairoTz);
        int generated = 0;
        int safetyBreak = 0;

        while (generated < sessionsToGenerate && safetyBreak < 50)
        {
            safetyBreak++;
            currentRefDate = currentRefDate.AddDays(1);
            var dayOfWeek = (int)currentRefDate.DayOfWeek;

            var daySchedules = schedules.Where(s => s.DayOfWeek == dayOfWeek).OrderBy(s => s.StartTime).ToList();
            foreach (var schedule in daySchedules)
            {
                if (generated >= sessionsToGenerate) break;

                var scheduledAt = new DateTimeOffset(
                    currentRefDate.Year, currentRefDate.Month, currentRefDate.Day,
                    schedule.StartTime.Hours, schedule.StartTime.Minutes, 0,
                    cairoTz.GetUtcOffset(currentRefDate.DateTime)
                );

                if (scheduledAt > lastDate)
                {
                    newSessions.Add(new Session
                    {
                        GroupId = group.Id,
                        EngineerId = group.EngineerId,
                        SessionNumber = ++lastSessionNum,
                        ScheduledAt = scheduledAt.ToUniversalTime(),
                        Status = SessionStatus.Scheduled
                    });
                    generated++;
                }
            }
        }

        if (newSessions.Count > 0)
        {
            await _db.Sessions.InsertManyAsync(newSessions);
        }
    }

    public async Task<(Session? session, string? error)> StartSessionAsync(Guid sessionId)
    {
        var session = await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null)
            return (null, "Session not found.");

        if (session.Status != SessionStatus.Scheduled)
            return (null, $"Cannot start a session with status '{session.Status}'. Only scheduled sessions can be started.");

        // Timing Restriction: Cannot start a session more than 30 minutes early
        var now = DateTimeOffset.UtcNow;
        if (session.ScheduledAt > now.AddMinutes(30))
        {
            var diff = session.ScheduledAt - now;
            return (null, $"Security Restriction: This session is scheduled for later. You can only start it within 30 minutes of the scheduled time (Wait another {Math.Floor(diff.TotalMinutes - 30)} minutes).");
        }

        var hasActive = await _db.Sessions
            .Find(s => s.GroupId == session.GroupId && s.Status == SessionStatus.Active && s.Id != sessionId)
            .AnyAsync();

        if (hasActive)
            return (null, "There is already an active session for this group. End it before starting a new one.");

        // Sequential Validation: Ensure we are starting the CORRECT session number
        var group = await _db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync();
        if (group == null)
            return (null, "Group not found.");

        if (session.SessionNumber != group.CurrentSessionNumber)
        {
            return (null, $"Sequential Error: Group is currently on Session {group.CurrentSessionNumber}, but you are trying to start Session {session.SessionNumber}. Please start the correct session.");
        }

        var update = Builders<Session>.Update
            .Set(s => s.Status, SessionStatus.Active)
            .Set(s => s.StartedAt, DateTimeOffset.UtcNow)
            .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
        
        var result = await _db.Sessions.UpdateOneAsync(s => s.Id == sessionId && s.Status == SessionStatus.Scheduled, update);
        if (result.ModifiedCount == 0)
        {
            return (null, "Session could not be started. It might already be active or ended.");
        }
        
        session.Status = SessionStatus.Active;

        // Create attendance records — batch check for existing
        var students = await _db.Students.Find(s => s.GroupId == session.GroupId && !s.IsDeleted).ToListAsync();
        var existingRecords = await _db.AttendanceRecords
            .Find(ar => ar.SessionId == sessionId)
            .ToListAsync();
        var existingStudentIds = new HashSet<Guid>(existingRecords.Select(ar => ar.StudentId));

        var newRecords = students
            .Where(student => !existingStudentIds.Contains(student.Id))
            .Select(student => new AttendanceRecord
            {
                SessionId = sessionId,
                StudentId = student.Id,
                Status = AttendanceStatus.Unmarked,
                MarkedAt = DateTimeOffset.UtcNow
            })
            .ToList();

        if (newRecords.Count > 0)
        {
            await _db.AttendanceRecords.InsertManyAsync(newRecords);
        }

        return (session, null);
    }

    public async Task<(Session? session, string? error)> EndSessionAsync(Guid sessionId, string? notes = null)
    {
        var session = await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null)
            return (null, "Session not found.");

        if (session.Status != SessionStatus.Active)
            return (null, $"Cannot end a session with status '{session.Status}'. Only active sessions can be ended.");

        var records = await _db.AttendanceRecords.Find(ar => ar.SessionId == sessionId).ToListAsync();
        
        if (records.Any(r => r.Status == AttendanceStatus.Unmarked))
        {
            return (null, "Completion Error: One or more students have not been marked. Please record attendance for all members before ending the session.");
        }

        var total = records.Count;
        var present = records.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late);
        var absent = records.Count(r => r.Status == AttendanceStatus.Absent);
        var late = records.Count(r => r.Status == AttendanceStatus.Late);

        var group = await _db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync();
        
        // Calculate Stamped Revenue & Unified Attendance Stats
        decimal stampedRevenue = 0;
        if (group != null)
        {
            var priceKey = $"price_level_{group.Level}";
            var priceSetting = await _db.Settings.Find(s => s.Key == priceKey).FirstOrDefaultAsync();
            stampedRevenue = decimal.TryParse(priceSetting?.Value, out var val) ? val : 0;
        }

        var attendanceRate = total > 0 ? (double)present / total : 0;
        var summary = $"Attendance: {present}/{total} present ({Math.Round(attendanceRate * 100)}%), {absent} absent, {late} late. Revenue: EGP {stampedRevenue}";
        var finalNotes = string.IsNullOrWhiteSpace(notes) ? summary : $"{notes}\n{summary}";

        var update = Builders<Session>.Update
            .Set(s => s.Status, SessionStatus.Ended)
            .Set(s => s.EndedAt, DateTimeOffset.UtcNow)
            .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow)
            .Set(s => s.Notes, finalNotes)
            .Set(s => s.StampedRevenue, stampedRevenue)
            .Set(s => s.PresentCount, present)
            .Set(s => s.AbsentCount, absent)
            .Set(s => s.TotalStudents, total)
            .Set(s => s.AttendanceRate, attendanceRate);
        
        var result = await _db.Sessions.UpdateOneAsync(s => s.Id == sessionId && s.Status == SessionStatus.Active, update);
        if (result.ModifiedCount == 0)
        {
            return (null, "Session could not be ended. It might already be ended.");
        }
        
        session.Status = SessionStatus.Ended;
        session.Notes = finalNotes;
        session.StampedRevenue = stampedRevenue;
        session.PresentCount = present;
        session.AbsentCount = absent;
        session.TotalStudents = total;
        session.AttendanceRate = attendanceRate;

        // Auto-advance group's current session number and check for completion
        if (group != null)
        {
            var nextSessionNum = group.CurrentSessionNumber + 1;
            var groupUpdate = Builders<Group>.Update
                .Set(g => g.CurrentSessionNumber, nextSessionNum)
                .Set(g => g.UpdatedAt, DateTimeOffset.UtcNow);

            if (nextSessionNum > group.TotalSessions)
            {
                groupUpdate = groupUpdate
                    .Set(g => g.Status, GroupStatus.Completed)
                    .Set(g => g.CompletedAt, DateTimeOffset.UtcNow);
            }

            await _db.Groups.UpdateOneAsync(g => g.Id == group.Id, groupUpdate);
        }

        return (session, null);
    }

    public async Task<(List<AttendanceRecord>? records, string? error)> UpdateAttendanceAsync(
        Guid sessionId, List<(Guid studentId, AttendanceStatus status)> updates, string userRole = "Engineer")
    {
        var session = await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null)
            return (null, "Session not found.");

        if (session.Status != SessionStatus.Active && session.Status != SessionStatus.Ended)
            return (null, "Can only update attendance for active or ended sessions.");

        // Timing/Role Restriction
        if (userRole != "Admin")
        {
            var now = DateTimeOffset.UtcNow;
            if (session.Status == SessionStatus.Ended)
            {
                if (session.EndedAt.HasValue && session.EndedAt.Value.AddHours(24) < now)
                {
                    return (null, "Permission Denied: Attendance for finished sessions can only be edited within 24 hours of ending. Please contact an Administrator for late corrections.");
                }
            }
        }

        var updatedRecords = new List<AttendanceRecord>();

        foreach (var (studentId, status) in updates)
        {
            var filter = Builders<AttendanceRecord>.Filter.Eq(ar => ar.SessionId, sessionId) &
                         Builders<AttendanceRecord>.Filter.Eq(ar => ar.StudentId, studentId);
                         
            var update = Builders<AttendanceRecord>.Update
                .Set(ar => ar.Status, status)
                .Set(ar => ar.MarkedAt, DateTimeOffset.UtcNow)
                .SetOnInsert(ar => ar.Id, Guid.NewGuid())
                .SetOnInsert(ar => ar.SessionId, sessionId)
                .SetOnInsert(ar => ar.StudentId, studentId);

            var options = new FindOneAndUpdateOptions<AttendanceRecord>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After
            };

            var record = await _db.AttendanceRecords.FindOneAndUpdateAsync(filter, update, options);
            if (record != null)
            {
                updatedRecords.Add(record);
            }
        }

        return (updatedRecords, null);
    }

    public async Task<List<Session>> GetTodaysSessionsAsync()
    {
        var cairoTz = GetConfiguredTimeZone();
        var cairoNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz);
        var todayStart = new DateTimeOffset(cairoNow.Date, cairoTz.GetUtcOffset(cairoNow));
        var todayEnd = todayStart.AddDays(1);

        var sessions = await _db.Sessions
            .Find(s => s.ScheduledAt >= todayStart && s.ScheduledAt < todayEnd && !s.IsDeleted)
            .SortBy(s => s.ScheduledAt)
            .ToListAsync();

        // Hydrate navigation properties safely
        var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
        var engineerIds = sessions.Select(s => s.EngineerId).Distinct().ToList();

        var groups = await _db.Groups.Find(g => groupIds.Contains(g.Id) && !g.IsDeleted).ToListAsync();
        var engineers = await _db.Users.Find(u => engineerIds.Contains(u.Id)).ToListAsync();

        var groupDict = groups.ToDictionary(g => g.Id);
        var engDict = engineers.ToDictionary(u => u.Id);

        foreach (var s in sessions)
        {
            s.Group = groupDict.GetValueOrDefault(s.GroupId);
            s.Engineer = engDict.GetValueOrDefault(s.EngineerId);
        }

        return sessions.Where(s => s.Group != null).ToList();
    }

    public async Task<List<Session>> GetTomorrowsSessionsAsync()
    {
        var cairoTz = GetConfiguredTimeZone();
        var cairoNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz);
        var tomorrowStart = new DateTimeOffset(cairoNow.Date.AddDays(1), cairoTz.GetUtcOffset(cairoNow.AddDays(1)));
        var tomorrowEnd = tomorrowStart.AddDays(1);

        var sessions = await _db.Sessions
            .Find(s => s.ScheduledAt >= tomorrowStart && s.ScheduledAt < tomorrowEnd && !s.IsDeleted)
            .SortBy(s => s.ScheduledAt)
            .ToListAsync();

        var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
        var engineerIds = sessions.Select(s => s.EngineerId).Distinct().ToList();
        var groups = await _db.Groups.Find(g => groupIds.Contains(g.Id) && !g.IsDeleted).ToListAsync();
        var engineers = await _db.Users.Find(u => engineerIds.Contains(u.Id)).ToListAsync();
        var groupDict = groups.ToDictionary(g => g.Id);
        var engDict = engineers.ToDictionary(u => u.Id);

        foreach (var s in sessions)
        {
            s.Group = groupDict.GetValueOrDefault(s.GroupId);
            s.Engineer = engDict.GetValueOrDefault(s.EngineerId);
        }

        return sessions.Where(s => s.Group != null).ToList();
    }

    public async Task<List<Session>> GetUpcomingSessionsAsync(int withinMinutes)
    {
        var now = DateTimeOffset.UtcNow;
        var cutoff = now.AddMinutes(withinMinutes);

        var sessions = await _db.Sessions
            .Find(s => s.Status == SessionStatus.Scheduled
                        && s.ScheduledAt > now
                        && s.ScheduledAt <= cutoff
                        && !s.IsDeleted)
            .ToListAsync();

        var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
        var engineerIds = sessions.Select(s => s.EngineerId).Distinct().ToList();
        var groups = await _db.Groups.Find(g => groupIds.Contains(g.Id) && !g.IsDeleted).ToListAsync();
        var engineers = await _db.Users.Find(u => engineerIds.Contains(u.Id)).ToListAsync();
        var groupDict = groups.ToDictionary(g => g.Id);
        var engDict = engineers.ToDictionary(u => u.Id);

        foreach (var s in sessions)
        {
            s.Group = groupDict.GetValueOrDefault(s.GroupId);
            s.Engineer = engDict.GetValueOrDefault(s.EngineerId);
        }

        return sessions.Where(s => s.Group != null).ToList();
    }

    public async Task RegenerateFutureSessionsAsync(Group group)
    {
        // 1. Delete all future scheduled sessions
        var filter = Builders<Session>.Filter.Eq(s => s.GroupId, group.Id) & 
                     Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Scheduled) &
                     Builders<Session>.Filter.Gte(s => s.ScheduledAt, DateTimeOffset.UtcNow);
        
        await _db.Sessions.DeleteManyAsync(filter);

        // 2. Find the last session (Ended or Active) to determine the next session number
        var lastCompletedSession = await _db.Sessions
            .Find(s => s.GroupId == group.Id && !s.IsDeleted)
            .SortByDescending(s => s.SessionNumber)
            .FirstOrDefaultAsync();

        var startFromNum = (lastCompletedSession?.SessionNumber ?? (group.StartingSessionNumber - 1)) + 1;
        
        if (startFromNum > group.TotalSessions) return;

        var schedules = await _db.GroupSchedules.Find(gs => gs.GroupId == group.Id).ToListAsync();
        if (schedules.Count == 0) return;

        // 3. Refill up to TotalSessions
        var sessionsToGenerate = group.TotalSessions - (startFromNum - 1);
        if (sessionsToGenerate <= 0) return;

        var cairoTz = GetConfiguredTimeZone();
        var lastDate = lastCompletedSession?.ScheduledAt ?? DateTimeOffset.UtcNow;
        var currentRefDate = TimeZoneInfo.ConvertTime(lastDate, cairoTz);
        
        var newSessions = new List<Session>();
        int generated = 0;
        int safetyBreak = 0;
        int currentNum = startFromNum;

        while (generated < sessionsToGenerate && safetyBreak < 500)
        {
            safetyBreak++;
            currentRefDate = currentRefDate.AddDays(1);
            var dayOfWeek = (int)currentRefDate.DayOfWeek;

            var daySchedules = schedules.Where(s => s.DayOfWeek == dayOfWeek).OrderBy(s => s.StartTime).ToList();
            foreach (var schedule in daySchedules)
            {
                if (generated >= sessionsToGenerate) break;

                var scheduledAt = new DateTimeOffset(
                    currentRefDate.Year, currentRefDate.Month, currentRefDate.Day,
                    schedule.StartTime.Hours, schedule.StartTime.Minutes, 0,
                    cairoTz.GetUtcOffset(currentRefDate.DateTime)
                );

                if (scheduledAt > lastDate)
                {
                    newSessions.Add(new Session
                    {
                        GroupId = group.Id,
                        EngineerId = group.EngineerId,
                        SessionNumber = currentNum++,
                        ScheduledAt = scheduledAt.ToUniversalTime(),
                        Status = SessionStatus.Scheduled,
                        DurationMinutes = schedule.DurationMinutes
                    });
                    generated++;
                }
            }
        }

        if (newSessions.Count > 0)
        {
            await _db.Sessions.InsertManyAsync(newSessions);
        }
    }

    /// <summary>
    /// Ensures every active group that has a schedule for today's day-of-week
    /// has at least one session record for today. Auto-generates missing ones.
    /// Called before listing today's sessions so the Attendance page is always complete.
    /// </summary>
    public async Task EnsureTodaysSessionsAsync(CancellationToken ct = default)
    {
        var cairoTz = GetConfiguredTimeZone();
        var cairoNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz);
        var todayDow = (int)cairoNow.DayOfWeek; // 0=Sun .. 6=Sat

        // 1. Find all schedules that match today's day
        var todaySchedules = await _db.GroupSchedules
            .Find(gs => gs.DayOfWeek == todayDow)
            .ToListAsync(ct);

        if (todaySchedules.Count == 0) return;

        var groupIdsWithSchedule = todaySchedules.Select(s => s.GroupId).Distinct().ToList();

        // 2. Get all active groups that own those schedules
        var activeGroups = await _db.Groups
            .Find(g => groupIdsWithSchedule.Contains(g.Id) && g.Status == GroupStatus.Active && !g.IsDeleted)
            .ToListAsync(ct);

        if (activeGroups.Count == 0) return;

        // 3. Get all existing sessions for today (Cairo day boundaries in UTC)
        var cairoOffset = cairoTz.GetUtcOffset(cairoNow);
        var todayStart = new DateTimeOffset(cairoNow.Date, cairoOffset).ToUniversalTime();
        var todayEnd = todayStart.AddDays(1);

        var existingSessions = await _db.Sessions
            .Find(s => s.ScheduledAt >= todayStart && s.ScheduledAt < todayEnd && !s.IsDeleted)
            .ToListAsync(ct);

        var existingGroupIds = new HashSet<Guid>(existingSessions.Select(s => s.GroupId));

        // 4. Generate missing sessions
        var newSessions = new List<Session>();

        foreach (var group in activeGroups)
        {
            if (existingGroupIds.Contains(group.Id)) continue; // Already has a session today
            if (group.CurrentSessionNumber > group.TotalSessions) continue; // Group completed

            var groupSchedules = todaySchedules.Where(s => s.GroupId == group.Id).OrderBy(s => s.StartTime).ToList();

            foreach (var schedule in groupSchedules)
            {
                var scheduledAt = new DateTimeOffset(
                    cairoNow.Year, cairoNow.Month, cairoNow.Day,
                    schedule.StartTime.Hours, schedule.StartTime.Minutes, 0,
                    cairoOffset
                );

                newSessions.Add(new Session
                {
                    GroupId = group.Id,
                    EngineerId = group.EngineerId,
                    SessionNumber = group.CurrentSessionNumber,
                    ScheduledAt = scheduledAt.ToUniversalTime(),
                    Status = SessionStatus.Scheduled,
                    DurationMinutes = schedule.DurationMinutes
                });
            }
        }

        if (newSessions.Count > 0)
        {
            await _db.Sessions.InsertManyAsync(newSessions, cancellationToken: ct);
        }
    }

    /// <summary>
    /// Resolves the configured timezone with fallback chain: Windows ID → IANA ID → UTC+2 custom.
    /// Reads from Application:Timezone in appsettings.json (default: "Africa/Cairo").
    /// </summary>
    private TimeZoneInfo GetConfiguredTimeZone()
    {
        var tzId = _config?.GetValue<string>("Application:Timezone") ?? "Africa/Cairo";
        
        // Try the configured value first (supports both Windows and IANA IDs)
        try { return TimeZoneInfo.FindSystemTimeZoneById(tzId); }
        catch (TimeZoneNotFoundException) { }
        
        // Fallback: try Windows-style "Egypt Standard Time"
        try { return TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time"); }
        catch (TimeZoneNotFoundException) { }
        
        // Final fallback: UTC+2
        return TimeZoneInfo.CreateCustomTimeZone("Cairo", TimeSpan.FromHours(2), "Cairo", "Cairo");
    }
}
