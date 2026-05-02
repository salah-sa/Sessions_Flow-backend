using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

/// <summary>
/// Session Timeline Endpoint
/// GET /api/admin/session-timeline?days=7
/// Returns paginated session history with attendance stats for the timeline view.
/// Admin-only.
/// </summary>
public static class SessionTimelineEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/admin").RequireAuthorization("AdminOnly");

        group.MapGet("/session-timeline", async (
            MongoService db,
            ClaimsPrincipal principal,
            int days = 7,
            CancellationToken ct = default) =>
        {
            days = Math.Clamp(days, 1, 90);

            var from = DateTimeOffset.UtcNow.AddDays(-days);

            // Fetch sessions in time window
            var sessions = await db.Sessions
                .Find(s => s.ScheduledAt >= from && !s.IsDeleted)
                .SortByDescending(s => s.ScheduledAt)
                .Limit(500)
                .ToListAsync(ct);

            if (sessions.Count == 0)
            {
                return Results.Ok(new
                {
                    sessions = Array.Empty<object>(),
                    totalSessions = 0,
                    avgAttendanceRate = 0,
                    peakDay = (string?)null
                });
            }

            // Fetch attendance counts per session (batch)
            var sessionIds = sessions.Select(s => s.Id).ToList();
            var attendanceCounts = await db.AttendanceRecords
                .Aggregate()
                .Match(ar => sessionIds.Contains(ar.SessionId))
                .Group(ar => ar.SessionId, g => new { SessionId = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            var countMap = attendanceCounts.ToDictionary(x => x.SessionId, x => x.Count);

            // Fetch group names (batch)
            var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
            var groups = await db.Groups
                .Find(g => groupIds.Contains(g.Id))
                .Project(g => new { g.Id, g.Name })
                .ToListAsync(ct);
            var groupMap = groups.ToDictionary(g => g.Id, g => g.Name);

            // Fetch engineer names (batch)
            var engineerIds = sessions.Select(s => s.EngineerId).Distinct().ToList();
            var engineers = await db.Users
                .Find(u => engineerIds.Contains(u.Id))
                .Project(u => new { u.Id, u.Name })
                .ToListAsync(ct);
            var engineerMap = engineers.ToDictionary(e => e.Id, e => e.Name);

            // Fetch total students per group (batch)
            var studentCounts = await db.Students
                .Aggregate()
                .Match(s => groupIds.Contains(s.GroupId) && !s.IsDeleted)
                .Group(s => s.GroupId, g => new { GroupId = g.Key, Count = g.Count() })
                .ToListAsync(ct);
            var studentMap = studentCounts.ToDictionary(x => x.GroupId, x => x.Count);

            // Build response items
            var items = sessions.Select(s => new
            {
                sessionId      = s.Id,
                groupName      = groupMap.GetValueOrDefault(s.GroupId, "Unknown Group"),
                engineerName   = engineerMap.GetValueOrDefault(s.EngineerId, "Unknown"),
                scheduledAt    = s.ScheduledAt,
                status         = s.Status.ToString(),
                attendanceCount = countMap.GetValueOrDefault(s.Id, 0),
                totalStudents  = studentMap.GetValueOrDefault(s.GroupId, 0),
            }).ToList();

            // Compute avg attendance rate
            var completedItems = items.Where(i => i.totalStudents > 0).ToList();
            var avgRate = completedItems.Count > 0
                ? (int)Math.Round(completedItems.Average(i => i.totalStudents > 0 ? (double)i.attendanceCount / i.totalStudents * 100 : 0))
                : 0;

            // Find busiest day
            var peakDay = items
                .GroupBy(i => i.scheduledAt.ToString("dddd"))
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefault();

            return Results.Ok(new
            {
                sessions       = items,
                totalSessions  = items.Count,
                avgAttendanceRate = avgRate,
                peakDay
            });
        });
    }
}
