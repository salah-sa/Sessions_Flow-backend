using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Services.EventBus;

namespace SessionFlow.Desktop.Api.Hubs;

[Authorize]
public class SessionHub : Hub
{
    private readonly MongoService _db;
    private readonly IPresenceService _presence;
    private readonly AuthService _auth;
    private readonly IEventBus _eventBus;

    public SessionHub(MongoService db, IPresenceService presence, AuthService auth, IEventBus eventBus)
    {
        _db = db;
        _presence = presence;
        _auth = auth;
        _eventBus = eventBus;
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

            await BroadcastPresenceUpdate(userId, Events.PresenceOnline);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            bool isFullyOffline = await _presence.UserDisconnectedAsync(Context.ConnectionId);
            if (isFullyOffline)
            {
                await BroadcastPresenceUpdate(userId, Events.PresenceOffline);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ═══════════════════════════════════════════════
    // Session Management
    // ═══════════════════════════════════════════════

    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"session_{sessionId}");
    }

    public async Task LeaveSession(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"session_{sessionId}");
    }

    // ═══════════════════════════════════════════════
    // Chat — Secured Group Join/Leave
    // ═══════════════════════════════════════════════

    public async Task JoinChat(string groupId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            return;

        if (!Guid.TryParse(groupId, out var groupGuid))
            return;

        var group = await _db.Groups.Find(g => g.Id == groupGuid && !g.IsDeleted).FirstOrDefaultAsync();
        if (group == null) return;

        if (role == "Engineer" && group.EngineerId != userGuid) return;
        if (role == "Student")
        {
            var user = await _db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
            if (user == null || string.IsNullOrEmpty(user.StudentId)) return;
            var students = await _auth.ResolveAllStudentsForUser(user);
            if (students == null || !students.Any(s => s.GroupId == groupGuid)) return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{groupId}");
    }

    public async Task LeaveChat(string groupId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat_{groupId}");
    }

    // ═══════════════════════════════════════════════
    // Messaging — via Event Bus
    // ═══════════════════════════════════════════════

    // Redundant hub-based sending removed in favor of REST API for consistency and security.
    // Use POST /api/chat/{groupId}/messages instead.

    /// <summary>
    /// Notify others in the group that messages have been read.
    /// </summary>
    public async Task MarkMessagesAsRead(string groupId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
        if (string.IsNullOrEmpty(userId)) return;

        await _eventBus.PublishAsync(Events.MessageRead, EventTargetType.Group, $"chat_{groupId}", new
        {
            groupId,
            userId,
            userName
        });
    }

    // ═══════════════════════════════════════════════
    // Presence — via Event Bus + Redis
    // ═══════════════════════════════════════════════

    public async Task UpdatePresence(bool isOnline)
    {
        var userIdStr = GetUserId();
        if (string.IsNullOrEmpty(userIdStr))
            return;

        if (isOnline)
        {
            _presence.UserConnected(userIdStr, Context.ConnectionId);
            await BroadcastPresenceUpdate(userIdStr, Events.PresenceOnline);
        }
        else
        {
            bool isFullyOffline = await _presence.UserDisconnectedAsync(Context.ConnectionId);
            if (isFullyOffline)
            {
                await BroadcastPresenceUpdate(userIdStr, Events.PresenceOffline);
            }
        }
    }

    public async Task Heartbeat()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return;
        _presence.RecordHeartbeat(userId);
    }

    public async Task GoOffline()
    {
        await UpdatePresence(false);
    }

    public async Task SetAway()
    {
        var userIdStr = GetUserId();
        if (string.IsNullOrEmpty(userIdStr)) return;

        await _presence.SetAwayAsync(userIdStr);
        await BroadcastPresenceUpdate(userIdStr, Events.PresenceAway);
    }

    public async Task RejoinGroups()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return;

        var groups = await GetUserGroupIds(userId);
        Context.Items["groups"] = groups;

        foreach (var gId in groups)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{gId}");

        await UpdatePresence(true);
    }

    /// <summary>
    /// Centralized presence broadcaster.
    /// Routes to chat groups + admins via event bus.
    /// </summary>
    private async Task BroadcastPresenceUpdate(string userId, string eventName)
    {
        // Simple safety to prevent re-entrant broadcasts from same connection
        var broadcastKey = $"presence_msg_{eventName}";
        if (Context.Items.ContainsKey(broadcastKey)) return;
        Context.Items[broadcastKey] = true;

        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        var payload = new { userId };

        if (role == "Admin")
        {
            // Admins are seen by everyone
            await _eventBus.PublishAsync(eventName, EventTargetType.All, "", payload);
        }
        else
        {
            // For non-admins, we broadcast to their chat groups
            var groups = Context.Items["groups"] as List<Guid> ?? await GetUserGroupIds(userId);
            foreach (var gId in groups)
            {
                await _eventBus.PublishAsync(eventName, EventTargetType.Group, $"chat_{gId}", payload);
            }

            // And to all admins (admins monitor everyone)
            await _eventBus.PublishAsync(eventName, EventTargetType.Role, "Admin", payload);
        }
    }

    // ═══════════════════════════════════════════════
    // Call Signaling — via Event Bus
    // ═══════════════════════════════════════════════

    public async Task CallUser(string targetUserId)
    {
        var callerIdStr = GetUserId();
        var callerName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
        if (string.IsNullOrEmpty(callerIdStr)) return;

        if (Guid.TryParse(callerIdStr, out var callerGuid))
        {
            var caller = await _db.Users.Find(u => u.Id == callerGuid).FirstOrDefaultAsync();
            await _eventBus.PublishAsync(Events.CallIncoming, EventTargetType.User, targetUserId, new
            {
                callerId = callerIdStr,
                callerName = caller?.Name ?? callerName,
                callerAvatar = caller?.AvatarUrl
            });
        }
    }

    public async Task AnswerCall(string callerId, bool accepted)
    {
        var responderId = GetUserId();
        var responderName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
        if (string.IsNullOrEmpty(responderId)) return;

        var eventName = accepted ? Events.CallAccepted : Events.CallRejected;
        await _eventBus.PublishAsync(eventName, EventTargetType.User, callerId, new
        {
            responderId,
            responderName
        });
    }

    public async Task SendOffer(string targetUserId, string sdpOffer)
    {
        var senderId = GetUserId();
        if (string.IsNullOrEmpty(senderId)) return;
        await _eventBus.PublishAsync(Events.CallOffer, EventTargetType.User, targetUserId, new { senderId, sdp = sdpOffer });
    }

    public async Task SendAnswer(string targetUserId, string sdpAnswer)
    {
        var senderId = GetUserId();
        if (string.IsNullOrEmpty(senderId)) return;
        await _eventBus.PublishAsync(Events.CallAnswer, EventTargetType.User, targetUserId, new { senderId, sdp = sdpAnswer });
    }

    public async Task SendIceCandidate(string targetUserId, string candidate)
    {
        var senderId = GetUserId();
        if (string.IsNullOrEmpty(senderId)) return;
        await _eventBus.PublishAsync(Events.CallIce, EventTargetType.User, targetUserId, new { senderId, candidate });
    }

    public async Task EndCall(string targetUserId)
    {
        var senderId = GetUserId();
        if (string.IsNullOrEmpty(senderId)) return;
        await _eventBus.PublishAsync(Events.CallEnded, EventTargetType.User, targetUserId, new { senderId });
    }

    // ═══════════════════════════════════════════════
    // Presence Snapshot (Reconnection Sync)
    // ═══════════════════════════════════════════════

    public async Task RequestPresenceSnapshot()
    {
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        var userIdStr = GetUserId();
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userGuid)) return;

        var onlineUsers = _presence.GetOnlineUserIds();

        if (role == "Admin") 
        {
            var adminSnapshot = _presence.GetPresenceSnapshot(onlineUsers);
            await Clients.Caller.SendAsync(Events.PresenceSnapshot, adminSnapshot);
            return;
        }

        var visibleUserIds = new HashSet<string>();
        visibleUserIds.Add(userIdStr);

        if (role == "Engineer")
        {
            var groups = await _db.Groups.Find(g => g.EngineerId == userGuid && !g.IsDeleted).ToListAsync();
            var groupIds = groups.Select(g => g.Id).ToList();
            var students = await _db.Students.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted).ToListAsync();
            foreach (var s in students) {
                var studentUserId = s.UserId.ToString();
                if (s.UserId != Guid.Empty && !string.IsNullOrEmpty(studentUserId)) visibleUserIds.Add(studentUserId);
            }
        }
        else if (role == "Student")
        {
            var user = await _db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
            if (user != null) {
                var studentInfos = await _auth.ResolveAllStudentsForUser(user);
                var groupIds = studentInfos.Select(s => s.GroupId).ToList();
                
                // Add Engineers
                var groups = await _db.Groups.Find(g => groupIds.Contains(g.Id) && !g.IsDeleted).ToListAsync();
                foreach (var g in groups) {
                    visibleUserIds.Add(g.EngineerId.ToString());
                }

                // Add Peer Students
                var peers = await _db.Students.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted && s.UserId != null).ToListAsync();
                foreach (var p in peers) {
                    visibleUserIds.Add(p.UserId!.Value.ToString());
                }
            }
        }

        var admins = await _db.Users.Find(u => u.Role == UserRole.Admin).ToListAsync();
        foreach(var admin in admins) {
            visibleUserIds.Add(admin.Id.ToString());
        }

        var filteredUsers = onlineUsers.Where(u => visibleUserIds.Contains(u)).ToList();
        var snapshot = _presence.GetPresenceSnapshot(filteredUsers);
        
        await Clients.Caller.SendAsync(Events.PresenceSnapshot, snapshot);
    }
}
