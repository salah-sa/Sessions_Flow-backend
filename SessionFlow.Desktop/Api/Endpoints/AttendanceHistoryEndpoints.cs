using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

/// <summary>
/// Attendance history endpoints for the new AttendanceHistoryPage.
/// GET /api/attendance/history — paginated personal history
/// GET /api/attendance/summary — aggregate statistics
/// </summary>
public static class AttendanceHistoryEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/attendance").RequireAuthorization();

        // ── Heatmap aggregation ───────────────────────────────────────────
        group.MapGet("/heatmap", async (
            ClaimsPrincipal principal,
            MongoService db,
            int? year,
            int? month,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
            if (user is null) return Results.Unauthorized();

            var filterBuilder = Builders<AttendanceRecord>.Filter;
            FilterDefinition<AttendanceRecord> filter;

            if (user.Role == UserRole.Student)
                filter = filterBuilder.Eq(ar => ar.StudentId, userId);
            else if (user.Role == UserRole.Admin)
                filter = filterBuilder.Empty;
            else
            {
                var engineerGroupIds = await db.Groups
                    .Find(g => g.EngineerId == userId && !g.IsDeleted)
                    .Project(g => g.Id)
                    .ToListAsync(ct);
                var nullableIds = engineerGroupIds.Cast<Guid?>().ToList();
                filter = filterBuilder.In(ar => ar.GroupId, nullableIds);
            }

            // Date range filter
            var targetYear = year ?? DateTime.UtcNow.Year;
            var startDate = month.HasValue
                ? new DateTime(targetYear, month.Value, 1, 0, 0, 0, DateTimeKind.Utc)
                : new DateTime(targetYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var endDate = month.HasValue
                ? startDate.AddMonths(1)
                : startDate.AddYears(1);

            filter = filterBuilder.And(filter,
                filterBuilder.Gte(ar => ar.MarkedAt, startDate),
                filterBuilder.Lt(ar => ar.MarkedAt, endDate));

            var records = await db.AttendanceRecords.Find(filter).ToListAsync(ct);

            var grouped = records
                .GroupBy(r => r.MarkedAt.ToString("yyyy-MM-dd"))
                .Select(g =>
                {
                    var total = g.Count();
                    var present = g.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late);
                    var absent = g.Count(r => r.Status == AttendanceStatus.Absent);
                    return new
                    {
                        date = g.Key,
                        sessionCount = g.Select(r => r.SessionId).Distinct().Count(),
                        presentCount = present,
                        absentCount = absent,
                        total,
                        rate = total > 0 ? Math.Round((double)present / total * 100, 1) : 0.0
                    };
                })
                .OrderBy(x => x.date)
                .ToList();

            return Results.Ok(grouped);
        });

        // ── Paginated history ─────────────────────────────────────────────
        group.MapGet("/history", async (
            ClaimsPrincipal principal,
            MongoService db,
            int page = 1,
            int pageSize = 20,
            string? status = null,
            CancellationToken ct = default) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
            if (user is null) return Results.Unauthorized();

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var filterBuilder = Builders<AttendanceRecord>.Filter;
            FilterDefinition<AttendanceRecord> filter;

            if (user.Role == UserRole.Student)
            {
                // Students see only their own records
                filter = filterBuilder.Eq(ar => ar.StudentId, userId);
            }
            else if (user.Role == UserRole.Admin)
            {
                // Admins see all records
                filter = filterBuilder.Empty;
            }
            else
            {
                // Engineers see records for their groups only
                var engineerGroupIds = await db.Groups
                    .Find(g => g.EngineerId == userId && !g.IsDeleted)
                    .Project(g => g.Id)
                    .ToListAsync(ct);

                var nullableIds = engineerGroupIds.Cast<Guid?>().ToList();
                filter = filterBuilder.In(ar => ar.GroupId, nullableIds);
            }

            // Apply optional status filter
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AttendanceStatus>(status, true, out var parsedStatus))
            {
                filter = filterBuilder.And(filter, filterBuilder.Eq(ar => ar.Status, parsedStatus));
            }

            var totalCount = await db.AttendanceRecords.CountDocumentsAsync(filter, cancellationToken: ct);

            var records = await db.AttendanceRecords
                .Find(filter)
                .SortByDescending(ar => ar.MarkedAt)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync(ct);

            var items = records.Select(ar => new
            {
                id            = ar.Id,
                sessionId     = ar.SessionId,
                groupName     = ar.GroupName ?? "—",
                sessionNumber = ar.SessionNumber,
                status        = ar.Status.ToString(),
                markedAt      = ar.MarkedAt,
                scheduledAt   = ar.ScheduledAt,
                studentId     = ar.StudentId,
                engineerId    = ar.EngineerId,
            });

            return Results.Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        });

        // ── Summary stats ─────────────────────────────────────────────────
        group.MapGet("/summary", async (
            ClaimsPrincipal principal,
            MongoService db,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
            if (user is null) return Results.Unauthorized();

            // For students: their own records. For others: their group's records.
            FilterDefinition<AttendanceRecord> filter;
            if (user.Role == UserRole.Student)
            {
                filter = Builders<AttendanceRecord>.Filter.Eq(ar => ar.StudentId, userId);
            }
            else
            {
                var groupIds = await db.Groups
                    .Find(g => g.EngineerId == userId && !g.IsDeleted)
                    .Project(g => g.Id)
                    .ToListAsync(ct);
                var nullableGroupIds = groupIds.Cast<Guid?>().ToList();
                filter = Builders<AttendanceRecord>.Filter.In(ar => ar.GroupId, nullableGroupIds);
            }

            var allRecords = await db.AttendanceRecords
                .Find(filter)
                .ToListAsync(ct);

            var total    = allRecords.Count;
            var present  = allRecords.Count(r => r.Status == AttendanceStatus.Present);
            var late     = allRecords.Count(r => r.Status == AttendanceStatus.Late);
            var absent   = allRecords.Count(r => r.Status == AttendanceStatus.Absent);
            var attended = present + late;

            var rate = total > 0 ? Math.Round((double)attended / total * 100, 1) : 0.0;

            return Results.Ok(new
            {
                totalSessions  = total,
                attended,
                present,
                lateCount      = late,
                absent,
                attendanceRate = rate
            });
        });
    }
}
