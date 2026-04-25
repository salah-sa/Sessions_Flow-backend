using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Data;
using MongoDB.Driver;
using System.Text.Json;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AdminUserEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/admin/users").RequireAuthorization();

        // GET: /api/admin/users — List all users (paginated, searchable)
        group.MapGet("/", async (HttpContext ctx, AuthService auth, MongoService db,
            string? search, string? role, int page = 1, int pageSize = 50) =>
        {
            var caller = await auth.GetUserFromClaimsAsync(ctx.User);
            if (caller?.Role != UserRole.Admin) return Results.Forbid();

            var filterBuilder = Builders<User>.Filter;
            var filters = new List<FilterDefinition<User>>();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var regex = new MongoDB.Bson.BsonRegularExpression(search, "i");
                filters.Add(filterBuilder.Or(
                    filterBuilder.Regex(u => u.Name, regex),
                    filterBuilder.Regex(u => u.Email, regex)
                ));
            }

            if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var parsedRole))
            {
                filters.Add(filterBuilder.Eq(u => u.Role, parsedRole));
            }

            // Exclude the admin themselves from the list
            filters.Add(filterBuilder.Ne(u => u.Id, caller.Id));

            var filter = filters.Count > 0 ? filterBuilder.And(filters) : filterBuilder.Empty;

            var totalCount = await db.Users.CountDocumentsAsync(filter);
            var users = await db.Users.Find(filter)
                .SortByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

            var items = users.Select(u => new
            {
                id = u.Id,
                name = u.DisplayName ?? u.Name,
                email = u.Email,
                role = u.Role.ToString(),
                subscriptionTier = u.SubscriptionTier.ToString(),
                isApproved = u.IsApproved,
                restrictedUntil = u.RestrictedUntil,
                restrictionReason = u.RestrictionReason,
                blockedPages = u.BlockedPages ?? new List<string>(),
                createdAt = u.CreatedAt,
                avatarUrl = u.AvatarUrl,
                status = GetUserStatus(u)
            });

            return Results.Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                hasMore = page * pageSize < totalCount
            });
        });

        // POST: /api/admin/users/{id}/restrict — Apply timed access restriction
        group.MapPost("/{id}/restrict", async (Guid id, HttpContext ctx, AuthService auth, MongoService db) =>
        {
            var caller = await auth.GetUserFromClaimsAsync(ctx.User);
            if (caller?.Role != UserRole.Admin) return Results.Forbid();

            using var reader = new StreamReader(ctx.Request.Body);
            var body = await reader.ReadToEndAsync();
            var payload = JsonSerializer.Deserialize<RestrictRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (payload == null) return Results.BadRequest(new { error = "Invalid payload." });

            var user = await db.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (user == null) return Results.NotFound(new { error = "User not found." });

            DateTimeOffset restrictUntil;
            string reason;

            if (payload.Days == -1)
            {
                restrictUntil = DateTimeOffset.MaxValue;
                reason = "Lifetime restriction";
            }
            else if (payload.Days > 0)
            {
                restrictUntil = DateTimeOffset.UtcNow.AddDays(payload.Days);
                reason = $"Restricted for {payload.Days} day(s)";
            }
            else
            {
                return Results.BadRequest(new { error = "Days must be 7, 30, or -1 (lifetime)." });
            }

            if (!string.IsNullOrWhiteSpace(payload.Reason))
            {
                reason = payload.Reason;
            }

            var update = Builders<User>.Update
                .Set(u => u.RestrictedUntil, restrictUntil)
                .Set(u => u.RestrictionReason, reason)
                .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

            await db.Users.UpdateOneAsync(u => u.Id == id, update);

            // Audit log
            var audit = new AuditLog
            {
                UserId = caller.Id,
                UserName = caller.Name,
                Action = "UserRestricted",
                Entity = "User",
                EntityId = id.ToString(),
                Details = $"{caller.Name} restricted user {user.Name} ({reason})"
            };
            await db.AuditLogs.InsertOneAsync(audit);

            return Results.Ok(new { success = true, restrictedUntil = restrictUntil, reason });
        });

        // POST: /api/admin/users/{id}/restore — Clear restriction
        group.MapPost("/{id}/restore", async (Guid id, HttpContext ctx, AuthService auth, MongoService db) =>
        {
            var caller = await auth.GetUserFromClaimsAsync(ctx.User);
            if (caller?.Role != UserRole.Admin) return Results.Forbid();

            var user = await db.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (user == null) return Results.NotFound(new { error = "User not found." });

            var update = Builders<User>.Update
                .Set(u => u.RestrictedUntil, (DateTimeOffset?)null)
                .Set(u => u.RestrictionReason, (string?)null)
                .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

            await db.Users.UpdateOneAsync(u => u.Id == id, update);

            // Audit log
            var audit = new AuditLog
            {
                UserId = caller.Id,
                UserName = caller.Name,
                Action = "UserRestored",
                Entity = "User",
                EntityId = id.ToString(),
                Details = $"{caller.Name} restored access for user {user.Name}"
            };
            await db.AuditLogs.InsertOneAsync(audit);

            return Results.Ok(new { success = true });
        });

        // PUT: /api/admin/users/{id}/blocked-pages — Update blocked pages
        group.MapPut("/{id}/blocked-pages", async (Guid id, HttpContext ctx, AuthService auth, MongoService db) =>
        {
            var caller = await auth.GetUserFromClaimsAsync(ctx.User);
            if (caller?.Role != UserRole.Admin) return Results.Forbid();

            using var reader = new StreamReader(ctx.Request.Body);
            var body = await reader.ReadToEndAsync();
            var payload = JsonSerializer.Deserialize<BlockedPagesRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (payload == null) return Results.BadRequest(new { error = "Invalid payload." });

            var user = await db.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (user == null) return Results.NotFound(new { error = "User not found." });

            var update = Builders<User>.Update
                .Set(u => u.BlockedPages, payload.Pages ?? new List<string>())
                .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

            await db.Users.UpdateOneAsync(u => u.Id == id, update);

            // Audit log
            var audit = new AuditLog
            {
                UserId = caller.Id,
                UserName = caller.Name,
                Action = "UserPagesBlocked",
                Entity = "User",
                EntityId = id.ToString(),
                Details = $"{caller.Name} updated blocked pages for {user.Name}: [{string.Join(", ", payload.Pages ?? new List<string>())}]"
            };
            await db.AuditLogs.InsertOneAsync(audit);

            return Results.Ok(new { success = true, blockedPages = payload.Pages });
        });
    }

    private static string GetUserStatus(User user)
    {
        if (user.RestrictedUntil.HasValue)
        {
            if (user.RestrictedUntil.Value == DateTimeOffset.MaxValue)
                return "Banned";
            if (user.RestrictedUntil.Value > DateTimeOffset.UtcNow)
                return "Restricted";
        }
        if (!user.IsApproved) return "Pending";
        return "Active";
    }

    public record RestrictRequest(int Days, string? Reason);
    public record BlockedPagesRequest(List<string>? Pages);
}
