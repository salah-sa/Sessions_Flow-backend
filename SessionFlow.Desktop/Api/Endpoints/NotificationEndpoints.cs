using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class NotificationEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/notifications").RequireAuthorization();

        group.MapGet("/", async (NotificationService service, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var notifications = await service.GetUserNotificationsAsync(userId);
            var unreadCount = await service.GetUnreadCountAsync(userId);
            
            return Results.Ok(new { notifications, unreadCount });
        });

        group.MapPut("/{id}/read", async (Guid id, NotificationService service) =>
        {
            await service.MarkAsReadAsync(id);
            return Results.Ok();
        });

        group.MapPut("/read-all", async (NotificationService service, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await service.MarkAllAsReadAsync(userId);
            return Results.Ok();
        });
    }
}
