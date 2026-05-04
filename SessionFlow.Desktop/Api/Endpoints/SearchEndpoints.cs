using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SearchEndpoints
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/search", async (
            string? q,
            int? limit,
            ClaimsPrincipal principal,
            MongoService db,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
            if (user is null) return Results.Unauthorized();

            var term = (q ?? "").Trim();
            if (string.IsNullOrEmpty(term) || term.Length < 2)
                return Results.Ok(Array.Empty<object>());

            var maxPerCategory = Math.Min(limit ?? 5, 10);
            var results = new List<object>();

            // ── Search Groups ─────────────────────────────────────────────
            {
                var groupFilter = Builders<Group>.Filter.And(
                    Builders<Group>.Filter.Regex(g => g.Name, new MongoDB.Bson.BsonRegularExpression(term, "i")),
                    Builders<Group>.Filter.Eq(g => g.IsDeleted, false)
                );

                // Scope: engineers see only their groups; students see enrolled groups; admin sees all
                if (user.Role == UserRole.Engineer)
                    groupFilter = Builders<Group>.Filter.And(groupFilter, Builders<Group>.Filter.Eq(g => g.EngineerId, userId));
                else if (user.Role == UserRole.Student)
                {
                    var studentGroupIds = await db.Students
                        .Find(s => s.UserId == userId && !s.IsDeleted)
                        .Project(s => s.GroupId)
                        .ToListAsync(ct);
                    groupFilter = Builders<Group>.Filter.And(groupFilter, Builders<Group>.Filter.In(g => g.Id, studentGroupIds));
                }

                var groups = await db.Groups.Find(groupFilter).Limit(maxPerCategory).ToListAsync(ct);
                results.AddRange(groups.Select(g => new
                {
                    category = "Groups",
                    id = g.Id.ToString(),
                    label = g.Name,
                    sublabel = $"L{g.Level} · {g.CurrentSessionNumber}/{g.TotalSessions} sessions",
                    route = $"/groups/{g.Id}"
                }));
            }

            // ── Search Students ───────────────────────────────────────────
            if (user.Role != UserRole.Student)
            {
                var studentFilter = Builders<Student>.Filter.And(
                    Builders<Student>.Filter.Regex(s => s.Name, new MongoDB.Bson.BsonRegularExpression(term, "i")),
                    Builders<Student>.Filter.Eq(s => s.IsDeleted, false)
                );

                if (user.Role == UserRole.Engineer)
                {
                    var engineerGroupIds = await db.Groups
                        .Find(g => g.EngineerId == userId && !g.IsDeleted)
                        .Project(g => g.Id)
                        .ToListAsync(ct);
                    studentFilter = Builders<Student>.Filter.And(studentFilter, Builders<Student>.Filter.In(s => s.GroupId, engineerGroupIds));
                }

                var students = await db.Students.Find(studentFilter).Limit(maxPerCategory).ToListAsync(ct);
                results.AddRange(students.Select(s => new
                {
                    category = "Students",
                    id = s.Id.ToString(),
                    label = s.Name,
                    sublabel = !string.IsNullOrEmpty(s.UniqueStudentCode) ? s.UniqueStudentCode : s.StudentId ?? "—",
                    route = $"/students/{s.Id}"
                }));
            }

            // ── Search Sessions ───────────────────────────────────────────
            {
                // Sessions don't have a name field, but we can search by group name
                var groupsMatchingTerm = await db.Groups
                    .Find(Builders<Group>.Filter.And(
                        Builders<Group>.Filter.Regex(g => g.Name, new MongoDB.Bson.BsonRegularExpression(term, "i")),
                        Builders<Group>.Filter.Eq(g => g.IsDeleted, false)))
                    .Limit(maxPerCategory)
                    .ToListAsync(ct);

                var matchingGroupIds = groupsMatchingTerm.Select(g => g.Id).ToList();

                if (matchingGroupIds.Count > 0)
                {
                    var sessionFilter = Builders<Session>.Filter.In(s => s.GroupId, matchingGroupIds);
                    var sessions = await db.Sessions.Find(sessionFilter)
                        .SortByDescending(s => s.ScheduledAt)
                        .Limit(maxPerCategory)
                        .ToListAsync(ct);

                    var groupLookup = groupsMatchingTerm.ToDictionary(g => g.Id, g => g.Name);

                    results.AddRange(sessions.Select(s => new
                    {
                        category = "Sessions",
                        id = s.Id.ToString(),
                        label = $"Session #{s.SessionNumber}",
                        sublabel = $"{(groupLookup.TryGetValue(s.GroupId, out var gn) ? gn : "Unknown")} · {s.Status}",
                        route = $"/sessions/{s.Id}"
                    }));
                }
            }

            // ── Search Users (Admin only) ─────────────────────────────────
            if (user.Role == UserRole.Admin)
            {
                var userFilter = Builders<User>.Filter.Regex(u => u.Name, new MongoDB.Bson.BsonRegularExpression(term, "i"));
                var users = await db.Users.Find(userFilter).Limit(maxPerCategory).ToListAsync(ct);
                results.AddRange(users.Select(u => new
                {
                    category = "Users",
                    id = u.Id.ToString(),
                    label = u.Name,
                    sublabel = $"{u.Role} · {u.SubscriptionTier}",
                    route = $"/admin/users"
                }));
            }

            return Results.Ok(results);
        }).RequireAuthorization();
    }
}
