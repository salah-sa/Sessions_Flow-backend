using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Hubs;

/// <summary>
/// NotificationHub — Real-time push for:
///   - User-specific notifications (new broadcast, system alert, etc.)
///   - Role-based broadcasts (Admin-only announcements)
///   - Platform-wide broadcasts
///
/// Connected at: /hub/notifications
/// Auth: JWT Bearer (query param ?access_token= supported for SignalR upgrade)
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    private readonly IPresenceService _presence;

    public NotificationHub(IPresenceService presence)
    {
        _presence = presence;
    }

    private string? GetUserId() => Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    private string? GetUserRole() => Context.User?.FindFirst(ClaimTypes.Role)?.Value;

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (!string.IsNullOrEmpty(userId))
        {
            // Join personal notification channel
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");

            // Join role channel (e.g., role_Admin, role_Engineer, role_Student)
            if (!string.IsNullOrEmpty(role))
                await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role}");

            Serilog.Log.Debug("[NotificationHub] Connected: userId={UserId}, role={Role}", userId, role);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            Serilog.Log.Debug("[NotificationHub] Disconnected: userId={UserId}", userId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client calls this to acknowledge receipt of a notification (optional handshake).
    /// </summary>
    public Task Ack(string notificationId)
    {
        Serilog.Log.Debug("[NotificationHub] ACK from {UserId} for {NotifId}", GetUserId(), notificationId);
        return Task.CompletedTask;
    }
}
