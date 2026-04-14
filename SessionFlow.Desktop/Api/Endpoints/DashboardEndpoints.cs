using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using MongoDB.Bson;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Linq;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/dashboard").RequireAuthorization();

        group.MapGet("/summary", async (MongoService db, HttpContext ctx, AuthService auth) =>
        {
            var roleStr = ctx.User.FindFirst(ClaimTypes.Role)?.Value ?? "Admin";

            // Egypt Standard Time — handles DST automatically
            var cairoTz = TimeZoneInfo.FindSystemTimeZoneById(
                System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(
                    System.Runtime.InteropServices.OSPlatform.Windows)
                    ? "Egypt Standard Time"
                    : "Africa/Cairo");
            var now = DateTimeOffset.UtcNow;
            var cairoNow = TimeZoneInfo.ConvertTime(now, cairoTz);
            var cairoOffset = cairoTz.GetUtcOffset(now);
            var todayStart = new DateTimeOffset(cairoNow.Date, cairoOffset).ToUniversalTime();
            var todayEnd = todayStart.AddDays(1);

            Guid userId = Guid.Empty;
            if (!Guid.TryParse(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier), out userId))
            {
                // If not authenticated, we allow anonymous as Admin for debugging only
                userId = Guid.Empty; 
            }

            // Fetch aggregate stats efficiently
            var baseGroupFilter = Builders<Group>.Filter.Eq(g => g.IsDeleted, false);
            var activeGroupFilter = baseGroupFilter & Builders<Group>.Filter.Ne(g => g.Status, GroupStatus.Completed) & Builders<Group>.Filter.Ne(g => g.Status, GroupStatus.Archived);
            var groupFilter = baseGroupFilter; // For total groups count

            var sessionFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) & Builders<Session>.Filter.Gte(s => s.ScheduledAt, todayStart) & Builders<Session>.Filter.Lt(s => s.ScheduledAt, todayEnd);
            var activeFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Active);

            List<Guid> studentGroupIds = new List<Guid>();
            if (roleStr == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user != null)
                {
                    var studentInfos = await auth.ResolveAllStudentsForUser(user);
                    if (studentInfos != null && studentInfos.Any())
                    {
                        studentGroupIds = studentInfos.Select(s => s.GroupId).ToList();
                    }
                }
            }

            if (roleStr == "Engineer")
            {
                groupFilter &= Builders<Group>.Filter.Eq(g => g.EngineerId, userId);
                activeGroupFilter &= Builders<Group>.Filter.Eq(g => g.EngineerId, userId);
                sessionFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
                activeFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            }
            else if (roleStr == "Student")
            {
                if (studentGroupIds.Count > 0)
                {
                    groupFilter &= Builders<Group>.Filter.In(g => g.Id, studentGroupIds);
                    activeGroupFilter &= Builders<Group>.Filter.In(g => g.Id, studentGroupIds);
                    sessionFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);
                    activeFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);
                }
                else
                {
                    return Results.Ok(new { totalGroups = 0, todaySessions = 0, activeSessions = 0, pendingApprovals = 0, todayTimeline = new List<object>(), recentActivity = new List<object>(), nextUpcomingSession = (object?)null });
                }
            }

            var totalGroupsTask = db.Groups.CountDocumentsAsync(groupFilter);
            var todaySessionsTask = db.Sessions.CountDocumentsAsync(sessionFilter);
            var activeSessionsTask = db.Sessions.CountDocumentsAsync(activeFilter);
            
            var pendingApprovalsTask = roleStr == "Admin" 
                ? db.PendingEngineers.CountDocumentsAsync(p => p.Status == PendingStatus.Pending)
                : Task.FromResult(0L);

            // Total students (all non-deleted)
            var totalStudentsTask = db.Students.CountDocumentsAsync(
                Builders<Student>.Filter.Eq(s => s.IsDeleted, false));

            // Completed sessions all time (role-filtered)
            var completedSessionFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false)
                & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Ended);
            if (roleStr == "Engineer") completedSessionFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            else if (roleStr == "Student" && studentGroupIds.Count > 0) completedSessionFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);
            var completedSessionsTask = db.Sessions.CountDocumentsAsync(completedSessionFilter);

            // Upcoming scheduled sessions in the future (role-filtered)
            var upcomingFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false)
                & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Scheduled)
                & Builders<Session>.Filter.Gt(s => s.ScheduledAt, now);
            if (roleStr == "Engineer") upcomingFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            else if (roleStr == "Student" && studentGroupIds.Count > 0) upcomingFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);
            var upcomingSessionsTask = db.Sessions.CountDocumentsAsync(upcomingFilter);

            // Completed groups (role-filtered)
            var completedGroupFilter = Builders<Group>.Filter.Eq(g => g.IsDeleted, false)
                & Builders<Group>.Filter.Eq(g => g.Status, GroupStatus.Completed);
            if (roleStr == "Engineer") completedGroupFilter &= Builders<Group>.Filter.Eq(g => g.EngineerId, userId);
            var completedGroupsTask = db.Groups.CountDocumentsAsync(completedGroupFilter);

            var timelineFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) & Builders<Session>.Filter.Gte(s => s.ScheduledAt, todayStart) & Builders<Session>.Filter.Lt(s => s.ScheduledAt, todayEnd);
            if (roleStr == "Engineer") timelineFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            else if (roleStr == "Student" && studentGroupIds.Count > 0) timelineFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);

            var todayTimelineTask = db.Sessions
                .Find(timelineFilter)
                .SortBy(s => s.ScheduledAt)
                .ToListAsync();

            var recentFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Ended);
            if (roleStr == "Engineer") recentFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            else if (roleStr == "Student" && studentGroupIds.Count > 0) recentFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);

            var recentActivityTask = db.Sessions
                .Find(recentFilter)
                .SortByDescending(s => s.UpdatedAt)
                .Limit(5)
                .ToListAsync();

            // Total Revenue (Sum of stamped revenue from all ended sessions — ACTIVE groups only)
            var revenueTask = db.Sessions.Aggregate(new AggregateOptions())
                .Match(completedSessionFilter)
                .Group<BsonDocument>(new BsonDocument { { "_id", BsonNull.Value }, { "total", new BsonDocument("$sum", "$StampedRevenue") } })
                .FirstOrDefaultAsync();

            await Task.WhenAll(
                totalGroupsTask, todaySessionsTask, activeSessionsTask, 
                pendingApprovalsTask, todayTimelineTask, recentActivityTask,
                totalStudentsTask, completedSessionsTask, upcomingSessionsTask, completedGroupsTask,
                revenueTask
            );

            // Extract revenue value
            decimal totalRevenue = 0;
            if (revenueTask.Result != null && revenueTask.Result.Contains("total") && !revenueTask.Result["total"].IsBsonNull)
            {
                totalRevenue = revenueTask.Result["total"].ToDecimal();
            }

            // ═══════════════════════════════════════════════════════════════
            // NEW ANALYTICS — Active Groups Only + Monthly Attendance
            // ═══════════════════════════════════════════════════════════════

            // --- Attendance Rate (Average of Ended sessions) ---
            var attendanceAgg = await db.Sessions.Aggregate(new AggregateOptions())
                .Match(completedSessionFilter)
                .Group<BsonDocument>(new BsonDocument { { "_id", BsonNull.Value }, { "avg", new BsonDocument("$avg", "$AttendanceRate") } })
                .FirstOrDefaultAsync();
            double attendanceRateOverall = 0;
            if (attendanceAgg != null && attendanceAgg.Contains("avg") && !attendanceAgg["avg"].IsBsonNull) {
                attendanceRateOverall = attendanceAgg["avg"].ToDouble();
            }

            // --- This Month Attendance Balance (present vs absent for current month) ---
            var monthStart = new DateTimeOffset(cairoNow.Year, cairoNow.Month, 1, 0, 0, 0, cairoOffset).ToUniversalTime();
            var monthEnd = monthStart.AddMonths(1);
            var monthSessionFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) 
                & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Ended)
                & Builders<Session>.Filter.Gte(s => s.ScheduledAt, monthStart) 
                & Builders<Session>.Filter.Lt(s => s.ScheduledAt, monthEnd);
            if (roleStr == "Engineer") monthSessionFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            else if (roleStr == "Student" && studentGroupIds.Count > 0) monthSessionFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);

            var monthAttendanceAgg = await db.Sessions.Aggregate(new AggregateOptions())
                .Match(monthSessionFilter)
                .Group<BsonDocument>(new BsonDocument { 
                    { "_id", BsonNull.Value }, 
                    { "totalPresent", new BsonDocument("$sum", "$PresentCount") },
                    { "totalAbsent", new BsonDocument("$sum", "$AbsentCount") },
                    { "totalStudents", new BsonDocument("$sum", "$TotalStudents") },
                    { "sessionCount", new BsonDocument("$sum", 1) },
                    { "avgRate", new BsonDocument("$avg", "$AttendanceRate") },
                    { "totalRevenue", new BsonDocument("$sum", "$StampedRevenue") }
                })
                .FirstOrDefaultAsync();

            int monthPresent = 0, monthAbsent = 0, monthTotalStudents = 0, monthSessionCount = 0;
            double monthAttendanceRate = 0;
            decimal monthRevenue = 0;
            if (monthAttendanceAgg != null)
            {
                monthPresent = monthAttendanceAgg.Contains("totalPresent") && !monthAttendanceAgg["totalPresent"].IsBsonNull ? monthAttendanceAgg["totalPresent"].ToInt32() : 0;
                monthAbsent = monthAttendanceAgg.Contains("totalAbsent") && !monthAttendanceAgg["totalAbsent"].IsBsonNull ? monthAttendanceAgg["totalAbsent"].ToInt32() : 0;
                monthTotalStudents = monthAttendanceAgg.Contains("totalStudents") && !monthAttendanceAgg["totalStudents"].IsBsonNull ? monthAttendanceAgg["totalStudents"].ToInt32() : 0;
                monthSessionCount = monthAttendanceAgg.Contains("sessionCount") && !monthAttendanceAgg["sessionCount"].IsBsonNull ? monthAttendanceAgg["sessionCount"].ToInt32() : 0;
                monthAttendanceRate = monthAttendanceAgg.Contains("avgRate") && !monthAttendanceAgg["avgRate"].IsBsonNull ? monthAttendanceAgg["avgRate"].ToDouble() : 0;
                monthRevenue = monthAttendanceAgg.Contains("totalRevenue") && !monthAttendanceAgg["totalRevenue"].IsBsonNull ? monthAttendanceAgg["totalRevenue"].ToDecimal() : 0;
            }

            // --- Revenue by Level (active groups only) ---
            // Get all active group IDs first
            var activeGroups = await db.Groups.Find(activeGroupFilter).ToListAsync();
            var activeGroupIds = activeGroups.Select(g => g.Id).ToList();
            var activeGroupDict = activeGroups.ToDictionary(g => g.Id);

            var revenueByLevel = activeGroups
                .GroupBy(g => g.Level)
                .Select(grp => new { level = grp.Key, groupCount = grp.Count() })
                .OrderBy(x => x.level)
                .ToList();

            var activeSessionFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false)
                & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Ended);
                
            if (activeGroupIds.Count > 0)
                activeSessionFilter &= Builders<Session>.Filter.In(s => s.GroupId, activeGroupIds);
            else
                activeSessionFilter &= Builders<Session>.Filter.Eq(s => s.GroupId, Guid.Empty);

            if (roleStr == "Engineer") activeSessionFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
            
            var activeSessions2 = await db.Sessions.Find(activeSessionFilter).ToListAsync();
            var revenueByLevelData = activeSessions2
                .GroupBy(s => activeGroupDict.ContainsKey(s.GroupId) ? activeGroupDict[s.GroupId].Level : 0)
                .Where(g => g.Key > 0)
                .Select(g => new { level = g.Key, total = g.Sum(s => s.StampedRevenue), count = g.Count() })
                .OrderBy(x => x.level)
                .ToList();

            // --- Session Status Distribution (active groups only) ---
            var allForActiveFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false);
            
            if (activeGroupIds.Count > 0)
                allForActiveFilter &= Builders<Session>.Filter.In(s => s.GroupId, activeGroupIds);
            else
                allForActiveFilter &= Builders<Session>.Filter.Eq(s => s.GroupId, Guid.Empty);

            var allSessionsForActive = await db.Sessions.Find(allForActiveFilter).ToListAsync();

            var sessionsByStatus = allSessionsForActive
                .GroupBy(s => s.Status.ToString())
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToList();

            // --- Top Groups (by completed sessions, active groups only) ---
            var topGroups = activeGroups
                .Select(g => {
                    var gSessions = activeSessions2.Where(s => s.GroupId == g.Id).ToList();
                    return new {
                        id = g.Id,
                        name = g.Name,
                        level = g.Level,
                        colorTag = g.ColorTag,
                        sessionsCompleted = gSessions.Count,
                        totalSessions = g.TotalSessions,
                        attendanceRate = gSessions.Count > 0 ? gSessions.Average(s => s.AttendanceRate) : 0,
                        revenue = gSessions.Sum(s => s.StampedRevenue),
                        studentCount = g.NumberOfStudents
                    };
                })
                .OrderByDescending(x => x.sessionsCompleted)
                .ThenByDescending(x => x.attendanceRate)
                .Take(5)
                .ToList();

            // --- Student Growth Trend (last 8 weeks) ---
            var studentGrowth = new List<int>();
            for (int i = 7; i >= 0; i--)
            {
                var bucketEnd2 = now.AddDays(-(i * 7));
                var studentCountAtDate = await db.Students.CountDocumentsAsync(
                    Builders<Student>.Filter.Eq(s => s.IsDeleted, false) 
                    & Builders<Student>.Filter.Lte(s => s.CreatedAt, bucketEnd2)
                );
                studentGrowth.Add((int)studentCountAtDate);
            }

            // --- Attendance Trend (last 8 weeks avg attendance rate) ---
            var attendanceTrend = new List<double>();
            for (int i = 7; i >= 0; i--)
            {
                var bucketStart = now.AddDays(-i * 7);
                var bucketEnd3 = bucketStart.AddDays(7);
                var bucketAttFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false)
                    & Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Ended)
                    & Builders<Session>.Filter.Gte(s => s.ScheduledAt, bucketStart)
                    & Builders<Session>.Filter.Lt(s => s.ScheduledAt, bucketEnd3);
                if (roleStr == "Engineer") bucketAttFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
                
                var bucketAtt = await db.Sessions.Aggregate(new AggregateOptions())
                    .Match(bucketAttFilter)
                    .Group<BsonDocument>(new BsonDocument { { "_id", BsonNull.Value }, { "avg", new BsonDocument("$avg", "$AttendanceRate") } })
                    .FirstOrDefaultAsync();
                
                double val = 0;
                if (bucketAtt != null && bucketAtt.Contains("avg") && !bucketAtt["avg"].IsBsonNull)
                    val = bucketAtt["avg"].ToDouble();
                attendanceTrend.Add(Math.Round(val * 100, 1));
            }

            // --- Weekly Session Trend (last 8 weeks) ---
            var weeklyTrend = new List<int>();
            for (int i = 7; i >= 0; i--)
            {
                var bucketStart = now.AddDays(-i * 7);
                var bucketEnd4 = bucketStart.AddDays(7);
                var bucketFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) & 
                                 Builders<Session>.Filter.Gte(s => s.ScheduledAt, bucketStart) & 
                                 Builders<Session>.Filter.Lt(s => s.ScheduledAt, bucketEnd4);
                
                if (roleStr == "Engineer") bucketFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
                else if (roleStr == "Student" && studentGroupIds.Count > 0) bucketFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);
                
                var count = await db.Sessions.CountDocumentsAsync(bucketFilter);
                weeklyTrend.Add((int)count);
            }

            // --- Avg Session Duration (ended sessions, in minutes) ---
            double avgSessionDuration = 0;
            var endedWithTime = activeSessions2.Where(s => s.StartedAt.HasValue && s.EndedAt.HasValue).ToList();
            if (endedWithTime.Count > 0)
            {
                avgSessionDuration = endedWithTime.Average(s => (s.EndedAt!.Value - s.StartedAt!.Value).TotalMinutes);
            }

            // --- Completion Rate (active groups) ---
            double completionRate = 0;
            if (activeGroups.Count > 0)
            {
                var totalPossible = activeGroups.Sum(g => g.TotalSessions);
                var totalDone = activeSessions2.Count;
                completionRate = totalPossible > 0 ? (double)totalDone / totalPossible : 0;
            }

            // ═══════════════════════════════════════════════════════════════
            // Timeline Enrichment
            // ═══════════════════════════════════════════════════════════════

            var sessionList = todayTimelineTask.Result.Concat(recentActivityTask.Result).ToList();
            var timelineGroupIds = sessionList.Select(s => s.GroupId).Distinct().ToList();
            var timelineGroups = await db.Groups.Find(g => timelineGroupIds.Contains(g.Id)).ToListAsync();
            var groupDict = timelineGroups.ToDictionary(g => g.Id);

            var enrichSession = (Session s) => {
                var g = groupDict.GetValueOrDefault(s.GroupId);
                if (g == null || g.IsDeleted) return null;
                return new {
                    id = s.Id,
                    groupName = g.Name,
                    groupLevel = g.Level,
                    groupColorTag = g.ColorTag,
                    scheduledAt = s.ScheduledAt,
                    startedAt = s.StartedAt,
                    endedAt = s.EndedAt,
                    status = s.Status.ToString(),
                    sessionNumber = s.SessionNumber,
                    presentCount = s.PresentCount,
                    absentCount = s.AbsentCount,
                    totalStudents = s.TotalStudents,
                    attendanceRate = s.AttendanceRate,
                    stampedRevenue = s.StampedRevenue,
                    updatedAt = s.UpdatedAt
                };
            };

            var todayTimelineFiltered = todayTimelineTask.Result.Select(enrichSession).Where(x => x != null).ToList();
            
            object? nextUpcomingSession = todayTimelineFiltered
                .FirstOrDefault(s => (string)s!.GetType().GetProperty("status")?.GetValue(s)! == "Active" || 
                                    (DateTimeOffset)s!.GetType().GetProperty("scheduledAt")?.GetValue(s)! > now);

            // If no sessions today, fallback to querying the absolute next upcoming session globally
            if (nextUpcomingSession == null)
            {
                var nextGlobalFilter = Builders<Session>.Filter.Eq(s => s.IsDeleted, false) & 
                                       Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Scheduled) &
                                       Builders<Session>.Filter.Gt(s => s.ScheduledAt, todayEnd);

                if (roleStr == "Engineer") nextGlobalFilter &= Builders<Session>.Filter.Eq(s => s.EngineerId, userId);
                else if (roleStr == "Student" && studentGroupIds.Count > 0) nextGlobalFilter &= Builders<Session>.Filter.In(s => s.GroupId, studentGroupIds);

                var nextGlobal = await db.Sessions
                    .Find(nextGlobalFilter)
                    .SortBy(s => s.ScheduledAt)
                    .FirstOrDefaultAsync();

                if (nextGlobal != null)
                {
                    nextUpcomingSession = enrichSession(nextGlobal);
                }
            }

            return Results.Ok(new
            {
                // Core counts
                totalGroups = totalGroupsTask.Result,
                todaySessions = todaySessionsTask.Result,
                activeSessions = activeSessionsTask.Result,
                pendingApprovals = pendingApprovalsTask.Result,
                totalStudents = totalStudentsTask.Result,
                completedSessionsAllTime = completedSessionsTask.Result,
                upcomingSessions = upcomingSessionsTask.Result,
                completedGroups = completedGroupsTask.Result,
                totalRevenue = totalRevenue,
                
                // Analytics
                attendanceRateOverall = attendanceRateOverall,
                avgSessionDuration = Math.Round(avgSessionDuration, 1),
                completionRate = Math.Round(completionRate, 4),

                // Monthly attendance balance
                monthlyAttendance = new {
                    present = monthPresent,
                    absent = monthAbsent,
                    totalStudents = monthTotalStudents,
                    sessionCount = monthSessionCount,
                    attendanceRate = Math.Round(monthAttendanceRate, 4),
                    revenue = monthRevenue
                },

                // Trend data (8 data points each)
                weeklyTrend = weeklyTrend,
                attendanceTrend = attendanceTrend,
                studentGrowth = studentGrowth,

                // Breakdown data
                revenueByLevel = revenueByLevelData,
                sessionsByStatus = sessionsByStatus,
                topGroups = topGroups,

                // Timeline
                todayTimeline = todayTimelineFiltered,
                recentActivity = recentActivityTask.Result.Select(enrichSession).Where(x => x != null),
                nextUpcomingSession = nextUpcomingSession
            });
        });


    }
}
