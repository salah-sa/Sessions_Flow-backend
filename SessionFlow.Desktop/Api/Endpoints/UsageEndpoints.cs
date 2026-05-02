using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

/// <summary>
/// GET /api/usage/today — returns daily usage counters vs plan limits for the calling user.
/// </summary>
public static class UsageEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/usage").RequireAuthorization();

        group.MapGet("/today", async (
            ClaimsPrincipal principal,
            UsageService usageService,
            MongoService db,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
            if (user is null) return Results.Unauthorized();

            // Admin always bypass — return "unlimited" counters
            if (user.Role == UserRole.Admin)
            {
                var inf = int.MaxValue;
                return Results.Ok(new
                {
                    messages   = new { used = 0, limit = inf, remaining = inf },
                    images     = new { used = 0, limit = inf, remaining = inf },
                    videos     = new { used = 0, limit = inf, remaining = inf },
                    files      = new { used = 0, limit = inf, remaining = inf },
                    attendance = new { used = 0, limit = inf, remaining = inf },
                    groups     = new { used = 0, limit = inf, remaining = inf },
                    isAdmin = true
                });
            }

            // Count current groups for this user
            var currentGroupCount = (int)await db.Groups
                .CountDocumentsAsync(g => g.EngineerId == userId && !g.IsDeleted, cancellationToken: ct);

            var summary = await usageService.GetSummaryAsync(userId, user.SubscriptionTier, currentGroupCount, ct);

            static object ToDto(UsageService.ResourceUsage r) => new
            {
                used      = r.Used,
                limit     = r.Limit == int.MaxValue ? -1 : r.Limit,      // -1 = unlimited sentinel for frontend
                remaining = r.Remaining == int.MaxValue ? -1 : r.Remaining
            };

            return Results.Ok(new
            {
                messages   = ToDto(summary.Messages),
                images     = ToDto(summary.Images),
                videos     = ToDto(summary.Videos),
                files      = ToDto(summary.Files),
                attendance = ToDto(summary.Attendance),
                groups     = ToDto(summary.Groups),
                tier       = user.SubscriptionTier.ToString(),
                isAdmin    = false
            });
        });
    }
}
