using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using SessionFlow.Desktop.Api.Helpers;
using SessionFlow.Desktop.Api.Hubs;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Helpers;
using Microsoft.Extensions.Configuration;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SessionEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/sessions").RequireAuthorization();

        // GET /api/sessions — list sessions with filters
        group.MapGet("/", async (MongoService db, SessionService sessionService, HttpContext ctx, IConfiguration config,
            int? page, int? pageSize, string? groupId, string? status, string? date, 
            string? startDate, string? endDate) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var cairoTz = TimeZoneHelper.GetConfiguredTimeZone(config);
            var builder = Builders<Session>.Filter;
            var filter = builder.Eq(s => s.IsDeleted, false);

            if (role == "Engineer")
            {
                filter &= builder.Eq(s => s.EngineerId, userId);
            }
            else if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user != null && !string.IsNullOrEmpty(user.StudentId))
                {
                    var studentInfo = await db.Students.Find(s => s.StudentId == user.StudentId && !s.IsDeleted).FirstOrDefaultAsync();
                    if (studentInfo != null)
                    {
                        filter &= builder.Eq(s => s.GroupId, studentInfo.GroupId);
                    }
                    else
                    {
                        return Results.Ok(PaginationHelper.Envelope(new List<object>(), 0, page ?? 1, pageSize ?? 20));
                    }
                }
                else
                {
                    return Results.Ok(PaginationHelper.Envelope(new List<object>(), 0, page ?? 1, pageSize ?? 20));
                }
            }

            if (Guid.TryParse(groupId, out var gid))
                filter &= builder.Eq(s => s.GroupId, gid);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<SessionStatus>(status, true, out var st))
                filter &= builder.Eq(s => s.Status, st);

            if (!string.IsNullOrEmpty(date) && DateTimeOffset.TryParse(date, out var d))
            {
                // Auto-fill missing sessions for today before querying
                var cairoTodayStr = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz).ToString("yyyy-MM-dd");
                if (d.Date.ToString("yyyy-MM-dd") == cairoTodayStr)
                {
                    await sessionService.EnsureTodaysSessionsAsync();
                }

                var dayStart = new DateTimeOffset(d.Date, cairoTz.GetUtcOffset(d.Date)).ToUniversalTime();
                var dayEnd = dayStart.AddDays(1);
                filter &= builder.Gte(s => s.ScheduledAt, dayStart) & builder.Lt(s => s.ScheduledAt, dayEnd);
            }
            else if (!string.IsNullOrEmpty(startDate) && DateTimeOffset.TryParse(startDate, out var sD) &&
                     !string.IsNullOrEmpty(endDate) && DateTimeOffset.TryParse(endDate, out var eD))
            {
                // Auto-fill missing sessions if range includes today
                var cairoNowForRange = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz);
                if (sD.Date <= cairoNowForRange.Date && eD.Date >= cairoNowForRange.Date)
                {
                    await sessionService.EnsureTodaysSessionsAsync();
                }

                var rangeStart = new DateTimeOffset(sD.Date, cairoTz.GetUtcOffset(sD.Date)).ToUniversalTime();
                var rangeEnd = new DateTimeOffset(eD.Date, cairoTz.GetUtcOffset(eD.Date)).ToUniversalTime().AddDays(1);
                filter &= builder.Gte(s => s.ScheduledAt, rangeStart) & builder.Lt(s => s.ScheduledAt, rangeEnd);
            }

            var (skip, take) = PaginationHelper.Normalize(page, pageSize);
            var totalCount = await db.Sessions.CountDocumentsAsync(filter);

            var sessions = await db.Sessions
                .Find(filter)
                .SortByDescending(s => s.ScheduledAt)
                .Skip(skip)
                .Limit(take)
                .ToListAsync();

            var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
            var engineerIds = sessions.Select(s => s.EngineerId).Distinct().ToList();
            var sessionIds = sessions.Select(s => s.Id).ToList();

            var groupsList = await db.Groups.Find(g => groupIds.Contains(g.Id) && !g.IsDeleted).ToListAsync();
            var engineersList = await db.Users.Find(e => engineerIds.Contains(e.Id)).ToListAsync();
            var allRecords = await db.AttendanceRecords.Find(ar => sessionIds.Contains(ar.SessionId)).ToListAsync();
            var allActiveStudents = await db.Students.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted).ToListAsync();

            var groupDict = groupsList.ToDictionary(g => g.Id);
            var engDict = engineersList.ToDictionary(e => e.Id);
            var recordsLookup = allRecords.GroupBy(ar => ar.SessionId).ToDictionary(g => g.Key, g => g.ToList());
            var studentsLookup = allActiveStudents.GroupBy(s => s.GroupId).ToDictionary(g => g.Key, g => g.Count());

            var result = new List<object>();
            foreach (var s in sessions)
            {
                groupDict.TryGetValue(s.GroupId, out var g);
                if (g == null) continue;

                engDict.TryGetValue(s.EngineerId, out var eng);
                var records = recordsLookup.GetValueOrDefault(s.Id, new List<AttendanceRecord>());

                result.Add(new
                {
                    id = s.Id,
                    groupId = s.GroupId,
                    groupName = g?.Name,
                    groupColorTag = g?.ColorTag,
                    engineerId = s.EngineerId,
                    engineerName = eng?.Name,
                    sessionNumber = s.SessionNumber,
                    scheduledAt = s.ScheduledAt,
                    startedAt = s.StartedAt,
                    endedAt = s.EndedAt,
                    status = s.Status.ToString(),
                    notes = s.Notes,
                    attendanceCount = records.Count,
                    presentCount = records.Count(ar => ar.Status == AttendanceStatus.Present),
                    totalStudents = studentsLookup.GetValueOrDefault(s.GroupId, 0),
                    durationMinutes = s.DurationMinutes,
                    isSkipped = s.IsSkipped,
                    skipReason = s.SkipReason,
                    createdAt = s.CreatedAt
                });
            }

            return Results.Ok(PaginationHelper.Envelope(result, totalCount, page ?? 1, take));
        });

        // GET /api/sessions/{id} — session detail
        group.MapGet("/{id:guid}", async (Guid id, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var session = await db.Sessions.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (session == null)
                return Results.NotFound(new { error = "Session not found." });

            if (role == "Engineer" && session.EngineerId != userId)
                return Results.Forbid();

            if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null || string.IsNullOrEmpty(user.StudentId)) return Results.Forbid();
                var studentInfo = await db.Students.Find(s => s.StudentId == user.StudentId && !s.IsDeleted).FirstOrDefaultAsync();
                if (studentInfo == null || studentInfo.GroupId != session.GroupId) return Results.Forbid();
            }

            var g = await db.Groups.Find(x => x.Id == session.GroupId).FirstOrDefaultAsync();
            var eng = await db.Users.Find(u => u.Id == session.EngineerId).FirstOrDefaultAsync();
            var records = await db.AttendanceRecords.Find(ar => ar.SessionId == id).ToListAsync();
            
            // Fetch ALL active students for the group (not just those with records)
            var groupStudents = await db.Students.Find(s => s.GroupId == session.GroupId && !s.IsDeleted)
                .SortBy(s => s.Name)
                .ToListAsync();
            var studentDict = groupStudents.ToDictionary(s => s.Id);

            var attendanceDetails = records.Select(ar =>
            {
                studentDict.TryGetValue(ar.StudentId, out var student);
                return new
                {
                    id = ar.Id,
                    studentId = ar.StudentId,
                    studentName = student?.Name,
                    status = ar.Status.ToString(),
                    markedAt = ar.MarkedAt
                };
            }).OrderBy(ar => ar.studentName).ToList();

            return Results.Ok(new
            {
                id = session.Id,
                groupId = session.GroupId,
                groupName = g?.Name,
                groupColorTag = g?.ColorTag,
                groupLevel = g?.Level,
                engineerId = session.EngineerId,
                engineerName = eng?.Name,
                sessionNumber = session.SessionNumber,
                totalSessions = g?.TotalSessions,
                currentSessionNumber = g?.CurrentSessionNumber,
                scheduledAt = session.ScheduledAt,
                startedAt = session.StartedAt,
                endedAt = session.EndedAt,
                status = session.Status.ToString(),
                notes = session.Notes,
                durationMinutes = session.DurationMinutes,
                students = groupStudents.Select(s => new
                {
                    id = s.Id,
                    name = s.Name,
                    groupId = s.GroupId
                }),
                attendanceRecords = attendanceDetails,
                createdAt = session.CreatedAt,
                isSkipped = session.IsSkipped,
                skipReason = session.SkipReason,
                isEditable = ctx.User.FindFirst(ClaimTypes.Role)?.Value == "Admin" || (session.Status == SessionStatus.Ended && session.EndedAt.HasValue && session.EndedAt.Value.AddHours(24) > DateTimeOffset.UtcNow) || (session.Status == SessionStatus.Active),
                canStart = ctx.User.FindFirst(ClaimTypes.Role)?.Value == "Admin" || (session.Status == SessionStatus.Scheduled && session.ScheduledAt <= DateTimeOffset.UtcNow.AddMinutes(30))
            });
        });

        // GET /api/sessions/{id}/attendance — attendance records for a session
        group.MapGet("/{id:guid}/attendance", async (Guid id, MongoService db) =>
        {
            var session = await db.Sessions.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (session == null)
                return Results.NotFound(new { error = "Session not found." });

            var records = await db.AttendanceRecords.Find(ar => ar.SessionId == id).ToListAsync();
            var studentIds = records.Select(r => r.StudentId).Distinct().ToList();
            var students = await db.Students.Find(s => studentIds.Contains(s.Id)).ToListAsync();
            var studentDict = students.ToDictionary(s => s.Id);

            var result = records.Select(ar =>
            {
                studentDict.TryGetValue(ar.StudentId, out var student);
                return new
                {
                    id = ar.Id,
                    sessionId = ar.SessionId,
                    studentId = ar.StudentId,
                    studentName = student?.Name,
                    status = ar.Status.ToString(),
                    markedAt = ar.MarkedAt
                };
            }).OrderBy(r => r.studentName).ToList();

            return Results.Ok(result);
        });

        // POST /api/sessions — create session manually
        group.MapPost("/", async (CreateSessionRequest req, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var engineerId))
                return Results.Unauthorized();

            if (!Guid.TryParse(req.GroupId, out var groupId))
                return Results.BadRequest(new { error = "Invalid group ID." });

            var targetGroup = await db.Groups.Find(g => g.Id == groupId).FirstOrDefaultAsync();
            if (targetGroup == null)
                return Results.NotFound(new { error = "Group not found." });

            if (ctx.User.FindFirstValue(ClaimTypes.Role) != "Admin" && targetGroup.EngineerId != engineerId)
                return Results.Forbid();

            var maxSession = await db.Sessions.Find(s => s.GroupId == groupId && !s.IsDeleted)
                                              .SortByDescending(s => s.SessionNumber)
                                              .FirstOrDefaultAsync();
            var nextSessionNumber = maxSession != null ? maxSession.SessionNumber + 1 : targetGroup.StartingSessionNumber;

            var session = new Session
            {
                GroupId = groupId,
                EngineerId = engineerId,
                ScheduledAt = req.ScheduledAt.ToUniversalTime(),
                Status = SessionStatus.Scheduled,
                SessionNumber = nextSessionNumber
            };

            await db.Sessions.InsertOneAsync(session);

            return Results.Created($"/api/sessions/{session.Id}", new { id = session.Id });
        });

        // POST /api/sessions/{id}/start
        group.MapPost("/{id:guid}/start", async (Guid id, SessionService sessionService, Services.EventBus.IEventBus eventBus) =>
        {
            var (session, error) = await sessionService.StartSessionAsync(id);
            if (error != null)
                return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Services.EventBus.Events.SessionStatusChanged, Services.EventBus.EventTargetType.Group, $"session_{id}", new { sessionId = id.ToString(), status = "Active" });
            return Results.Ok(new { id = session!.Id, status = session.Status.ToString(), startedAt = session.StartedAt });
        });

        // POST /api/sessions/{id}/end
        group.MapPost("/{id:guid}/end", async (Guid id, EndSessionRequest? req, bool? force, SessionService sessionService, Services.EventBus.IEventBus eventBus, MongoService db) =>
        {
            var (session, error) = await sessionService.EndSessionAsync(id, req?.Notes, force ?? false);
            if (error != null)
                return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Services.EventBus.Events.SessionStatusChanged, Services.EventBus.EventTargetType.Group, $"session_{id}", new { sessionId = id.ToString(), status = "Ended" });

            // AUTO-ARCHIVE: Check if all sessions in the group are now completed
            var groupId = session!.GroupId;
            var remainingSessions = await db.Sessions.CountDocumentsAsync(
                s => s.GroupId == groupId && !s.IsDeleted && s.Status != SessionStatus.Ended && s.Status != SessionStatus.Cancelled && !s.IsSkipped
            );

            if (remainingSessions == 0)
            {
                // All sessions completed — auto-transition group to Completed
                var groupUpdate = Builders<Group>.Update
                    .Set(g => g.Status, GroupStatus.Completed)
                    .Set(g => g.UpdatedAt, DateTimeOffset.UtcNow);
                await db.Groups.UpdateOneAsync(g => g.Id == groupId && g.Status == GroupStatus.Active, groupUpdate);
            }

            return Results.Ok(new { id = session!.Id, status = session.Status.ToString(), endedAt = session.EndedAt, notes = session.Notes });
        });

        // PUT /api/sessions/{id}/attendance
        group.MapPut("/{id:guid}/attendance", async (Guid id, List<AttendanceUpdateItem> items,
            SessionService sessionService, Services.EventBus.IEventBus eventBus, HttpContext ctx) =>
        {
            var userRole = ctx.User.FindFirst(ClaimTypes.Role)?.Value ?? "Engineer";

            if (items == null || items.Count == 0)
                return Results.BadRequest(new { error = "Validation Error: Payload must contain at least one attendance record." });

            var validStatuses = new HashSet<string>(Enum.GetNames(typeof(AttendanceStatus)), StringComparer.OrdinalIgnoreCase);
            
            var allowedStatuses = string.Join(", ", validStatuses);
            foreach (var item in items)
            {
                if (!Guid.TryParse(item.StudentId, out _))
                    return Results.BadRequest(new { error = $"Validation Error: Invalid Student ID format ('{item.StudentId}')." });
                    
                if (!validStatuses.Contains(item.Status))
                    return Results.BadRequest(new { error = $"Validation Error: Invalid status '{item.Status}'. Allowed values are: {allowedStatuses}." });
            }

            var updates = items.Select(i =>
            {
                Enum.TryParse<AttendanceStatus>(i.Status, true, out var status);
                return (Guid.Parse(i.StudentId), status);
            }).ToList();

            var (records, error) = await sessionService.UpdateAttendanceAsync(id, updates, userRole);
            if (error != null)
                return Results.BadRequest(new { error });

            var recordData = records!.Select(r => new
            {
                id = r.Id,
                studentId = r.StudentId,
                status = r.Status.ToString(),
                markedAt = r.MarkedAt
            }).ToArray();

            await eventBus.PublishAsync(Services.EventBus.Events.AttendanceUpdated, Services.EventBus.EventTargetType.Group, $"session_{id}", new { sessionId = id.ToString(), records = recordData });
            return Results.Ok(recordData);
        });

        // DELETE /api/sessions/{id}
        group.MapDelete("/{id:guid}", async (Guid id, MongoService db) =>
        {
            var update = Builders<Session>.Update
                .Set(s => s.IsDeleted, true)
                .Set(s => s.DeletedAt, DateTimeOffset.UtcNow)
                .Set(s => s.Status, SessionStatus.Cancelled)
                .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
            
            var result = await db.Sessions.UpdateOneAsync(s => s.Id == id, update);
            if (result.MatchedCount == 0) return Results.NotFound(new { error = "Session not found." });

            return Results.Ok(new { message = "Session cancelled." });
        });

        // POST /api/sessions/{id}/skip — mark session as skipped (does NOT advance session number)
        group.MapPost("/{id:guid}/skip", async (Guid id, SkipSessionRequest? req,
            SessionService sessionService, Services.EventBus.IEventBus eventBus) =>
        {
            var (session, error) = await sessionService.SkipSessionAsync(id, req?.Reason);
            if (error != null)
                return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Services.EventBus.Events.SessionStatusChanged, Services.EventBus.EventTargetType.Group, $"session_{id}", new { sessionId = id.ToString(), status = "Skipped" });
            return Results.Ok(new { id = session!.Id, status = session.Status.ToString(), isSkipped = true, skipReason = session.SkipReason });
        });

        // POST /api/sessions/{id}/sign — ONE-CLICK COMPLETION & PROGRESSION
        group.MapPost("/{id:guid}/sign", async (Guid id, SessionService sessionService, Services.EventBus.IEventBus eventBus, MongoService db) =>
        {
            var session = await db.Sessions.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (session == null) return Results.NotFound(new { error = "Session not found." });

            // 1. If Scheduled, transition to Active first (simulates starting the lecture)
            if (session.Status == SessionStatus.Scheduled)
            {
                var (started, startErr) = await sessionService.StartSessionAsync(id);
                if (startErr != null) return Results.BadRequest(new { error = startErr });
            }

            // 2. Transition to Ended with Force=true (One-click bypass for attendance)
            var (ended, endErr) = await sessionService.EndSessionAsync(id, "Automated via Quick Sign", force: true);
            if (endErr != null) return Results.BadRequest(new { error = endErr });

            // 3. Publish Events
            await eventBus.PublishAsync(Services.EventBus.Events.SessionStatusChanged, Services.EventBus.EventTargetType.Group, $"session_{id}", new { sessionId = id.ToString(), status = "Ended" });
            
            return Results.Ok(new { 
                id = ended!.Id, 
                status = ended.Status.ToString(), 
                endedAt = ended.EndedAt,
                nextSessionNumber = (await db.Groups.Find(g => g.Id == ended.GroupId).FirstOrDefaultAsync())?.CurrentSessionNumber
            });
        });
    }

    public record CreateSessionRequest(string GroupId, DateTimeOffset ScheduledAt);
    public record EndSessionRequest(string? Notes);
    public record AttendanceUpdateItem(string StudentId, string Status);
    public record SkipSessionRequest(string? Reason);
}
