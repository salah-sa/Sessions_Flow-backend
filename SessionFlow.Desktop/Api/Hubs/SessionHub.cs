using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Hubs;

[Authorize]
public class SessionHub : Hub
{
    private readonly MongoService _db;
    private readonly PresenceService _presence;
    private readonly AuthService _auth;

    public SessionHub(MongoService db, PresenceService presence, AuthService auth)
    {
        _db = db;
        _presence = presence;
        _auth = auth;
    }

    private string? GetUserId() => Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    private async Task<List<Guid>> GetUserGroupIds(string userId)
    {
        if (!Guid.TryParse(userId, out var userGuid)) return new List<Guid>();

        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        if (role == "Admin")
        {
            return new List<Guid>(); // Admins use global dashboard, not scoped chat presence
        }
        if (role == "Engineer")
        {
            return await _db.Groups.Find(g => g.EngineerId == userGuid && !g.IsDeleted).Project(g => g.Id).ToListAsync();
        }
        if (role == "Student")
        {
            var user = await _db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
            if (user == null) return new List<Guid>();
            
            var students = await _auth.ResolveAllStudentsForUser(user);
            if (students != null && students.Any()) return students.Select(s => s.GroupId).ToList();
        }
        
        return new List<Guid>();
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            _presence.UserConnected(userId, Context.ConnectionId);

            var groups = await GetUserGroupIds(userId);

            // CACHE GROUPS IN CONNECTION
            Context.Items["groups"] = groups;

            foreach (var gId in groups)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{gId}");

            foreach (var gId in groups)
                await Clients.Group($"chat_{gId}").SendAsync("UserOnline", userId);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            _presence.UserDisconnected(Context.ConnectionId);

            var groups = Context.Items["groups"] as List<Guid> ?? new();

            foreach (var gId in groups)
                await Clients.Group($"chat_{gId}").SendAsync("UserOffline", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a session group to receive real-time attendance updates.
    /// </summary>
    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"session_{sessionId}");
    }

    /// <summary>
    /// Leave a session group.
    /// </summary>
    public async Task LeaveSession(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"session_{sessionId}");
    }

    /// <summary>
    /// Join a chat group to receive real-time messages.
    /// SECURED: Validates group membership before joining.
    /// </summary>
    public async Task JoinChat(string groupId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            return; // Silently reject unauthenticated

        if (!Guid.TryParse(groupId, out var groupGuid))
            return;

        // Verify group exists
        var group = await _db.Groups.Find(g => g.Id == groupGuid && !g.IsDeleted).FirstOrDefaultAsync();
        if (group == null) return;

        // Verify membership by role
        if (role == "Engineer" && group.EngineerId != userGuid) return;
        if (role == "Student")
        {
            var user = await _db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
            if (user == null || string.IsNullOrEmpty(user.StudentId)) return;
            var students = await _auth.ResolveAllStudentsForUser(user);
            if (students == null || !students.Any(s => s.GroupId == groupGuid)) return;
        }
        // Admin: allowed for all groups

        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{groupId}");
    }

    /// <summary>
    /// Leave a chat group.
    /// </summary>
    public async Task LeaveChat(string groupId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat_{groupId}");
    }

    /// <summary>
    /// Send a chat message: persist to DB and broadcast to the chat group.
    /// </summary>
    public async Task SendChatMessage(string groupId, string text)
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userGuid))
            return;

        if (!Guid.TryParse(groupId, out var groupGuid))
            return;

        var message = new ChatMessage
        {
            GroupId = groupGuid,
            SenderId = userGuid,
            Text = text.Trim(),
            SentAt = DateTimeOffset.UtcNow
        };

        await _db.ChatMessages.InsertOneAsync(message);

        // Load the sender for the broadcast
        var sender = await _db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();

        await Clients.Group($"chat_{groupId}").SendAsync("NewChatMessage", groupId, new
        {
            id = message.Id,
            groupId = message.GroupId,
            senderId = message.SenderId,
            senderName = sender?.Name ?? userName,
            text = message.Text,
            sentAt = message.SentAt,
            sender = sender == null ? null : new { 
                id = sender.Id, 
                name = sender.Name, 
                role = sender.Role.ToString(), 
                avatarUrl = sender.AvatarUrl 
            }
        });
    }

    /// <summary>
    /// Notify others in the group that messages have been read.
    /// </summary>
    public async Task MarkMessagesAsRead(string groupId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return;

        await Clients.Group($"chat_{groupId}").SendAsync("MessagesRead", groupId, userId);
    }

    /// <summary>
    /// Update the user's online/offline presence.
    /// </summary>
    public async Task UpdatePresence(bool isOnline)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return;

        _presence.SetPresence(userId, isOnline, Context.ConnectionId);

        var groups = Context.Items["groups"] as List<Guid>;

        if (groups == null)
            groups = await GetUserGroupIds(userId); // fallback only

        foreach (var gId in groups)
            await Clients.Group($"chat_{gId}")
                .SendAsync(isOnline ? "UserOnline" : "UserOffline", userId);
    }
}
