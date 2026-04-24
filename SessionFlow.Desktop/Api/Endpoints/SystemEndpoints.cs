using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using SessionFlow.Desktop.Hubs;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SystemEndpoints
{
    public static void Map(WebApplication app)
    {
        var system = app.MapGroup("/api/system").RequireAuthorization();

        // POST /api/system/broadcast-update - Broadcasts a system update to all connected users
        system.MapPost("/broadcast-update", async (BroadcastUpdateRequest req, IHubContext<ChatHub> hubContext, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin") return Results.Forbid();

            if (req.Notes == null || req.Notes.Count == 0)
                return Results.BadRequest(new { error = "Release notes are required." });

            var payload = new 
            {
                Version = req.Version ?? "Latest",
                Notes = req.Notes,
                Timestamp = DateTimeOffset.UtcNow
            };

            // Broadcast to ALL connected clients
            await hubContext.Clients.All.SendAsync("SystemUpdateAvailable", payload);

            return Results.Ok(new { message = "Update broadcasted successfully.", payload });
        });
    }

    public record BroadcastUpdateRequest(string? Version, List<string> Notes);
}
