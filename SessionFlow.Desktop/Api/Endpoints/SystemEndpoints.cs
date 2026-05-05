using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SystemEndpoints
{
    public static void Map(WebApplication app)
    {
        var system = app.MapGroup("/api/v1/system").RequireAuthorization();

        // POST /api/system/broadcast-update - Broadcasts a system update to all connected users
        system.MapPost("/broadcast-update", async (BroadcastUpdateRequest req, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus, SessionFlow.Desktop.Data.MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (role != "Admin" || !Guid.TryParse(userIdStr, out var uid)) return Results.Forbid();

            if (req.Notes == null || req.Notes.Count == 0)
                return Results.BadRequest(new { error = "Release notes are required." });

            var payload = new 
            {
                Version = req.Version ?? "Latest",
                Notes = req.Notes,
                Timestamp = DateTimeOffset.UtcNow
            };

            // Save to database
            var broadcast = new SessionFlow.Desktop.Models.SystemBroadcast
            {
                Version = payload.Version,
                Notes = payload.Notes,
                BroadcastedBy = uid,
                CreatedAt = payload.Timestamp
            };
            await db.SystemBroadcasts.InsertOneAsync(broadcast);

            // Broadcast to ALL connected clients via EventBus (not direct hub)
            await eventBus.PublishAsync("SystemUpdateAvailable",
                SessionFlow.Desktop.Services.EventBus.EventTargetType.All, "",
                payload);

            return Results.Ok(new { message = "Update broadcasted successfully.", payload });
        });

        // GET /api/system/broadcast-update/history - Retrieve past broadcasts
        system.MapGet("/broadcast-update/history", async (SessionFlow.Desktop.Data.MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin") return Results.Forbid();

            var history = await MongoDB.Driver.IAsyncCursorSourceExtensions.ToListAsync(
                db.SystemBroadcasts.Find(MongoDB.Driver.Builders<SessionFlow.Desktop.Models.SystemBroadcast>.Filter.Empty)
                  .SortByDescending(b => b.CreatedAt)
            );

            return Results.Ok(history);
        });
        // GET /api/system/broadcast-update/latest - Retrieve the latest broadcast (Accessible to all authenticated users)
        system.MapGet("/broadcast-update/latest", async (SessionFlow.Desktop.Data.MongoService db, HttpContext ctx) =>
        {
            var latest = await db.SystemBroadcasts
                .Find(MongoDB.Driver.Builders<SessionFlow.Desktop.Models.SystemBroadcast>.Filter.Empty)
                .SortByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();

            if (latest == null) return Results.NotFound();

            return Results.Ok(new {
                version = latest.Version,
                notes = latest.Notes,
                timestamp = latest.CreatedAt
            });
        });
    }

    public record BroadcastUpdateRequest(string? Version, List<string> Notes);
}
