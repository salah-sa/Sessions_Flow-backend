using System.Collections.Concurrent;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// In-memory fallback presence service.
/// Used when Redis is unavailable. Implements IPresenceService.
/// </summary>
public class PresenceService : IPresenceService
{
    // Maps userId → set of connectionIds (a user can have multiple connections)
    private readonly ConcurrentDictionary<string, HashSet<string>> _onlineUsers = new();

    // Maps connectionId → userId for reverse lookup on disconnect
    private readonly ConcurrentDictionary<string, string> _connectionUserMap = new();

    // Maps userId → last heartbeat timestamp
    private readonly ConcurrentDictionary<string, DateTimeOffset> _lastSeen = new();

    // Maps userId → status (online, away, offline)
    private readonly ConcurrentDictionary<string, string> _statusMap = new();

    public void UserConnected(string userId, string connectionId)
    {
        _connectionUserMap[connectionId] = userId;
        RecordHeartbeat(userId);
        _statusMap[userId] = "online";

        var connections = _onlineUsers.GetOrAdd(userId, _ => new HashSet<string>());
        lock (connections)
        {
            connections.Add(connectionId);
        }
    }

    public Task<bool> UserDisconnectedAsync(string connectionId)
    {
        if (_connectionUserMap.TryRemove(connectionId, out var userId))
        {
            if (_onlineUsers.TryGetValue(userId, out var connections))
            {
                lock (connections)
                {
                    connections.Remove(connectionId);
                    if (connections.Count == 0)
                    {
                        _onlineUsers.TryRemove(userId, out _);
                        _statusMap[userId] = "offline";
                        return Task.FromResult(true);
                    }
                }
            }
        }
        return Task.FromResult(false);
    }

    public bool IsOnline(string userId)
    {
        return _onlineUsers.ContainsKey(userId);
    }

    public List<string> GetOnlineUserIds()
    {
        return _onlineUsers.Keys.ToList();
    }

    public void RecordHeartbeat(string userId)
    {
        _lastSeen[userId] = DateTimeOffset.UtcNow;
    }

    public List<object> GetPresenceSnapshot(IEnumerable<string> userIds)
    {
        var snapshot = new List<object>();
        foreach (var id in userIds)
        {
            snapshot.Add(new
            {
                userId = id,
                isOnline = IsOnline(id),
                status = GetStatus(id),
                lastSeen = _lastSeen.TryGetValue(id, out var ls) ? ls : (DateTimeOffset?)null
            });
        }
        return snapshot;
    }

    public string? GetUserIdForConnection(string connectionId)
    {
        _connectionUserMap.TryGetValue(connectionId, out var userId);
        return userId;
    }

    public async Task SetPresenceAsync(string userId, bool isOnline, string connectionId)
    {
        if (isOnline)
        {
            UserConnected(userId, connectionId);
        }
        else
        {
            await UserDisconnectedAsync(connectionId);
        }
    }

    public Task SetAwayAsync(string userId)
    {
        _statusMap[userId] = "away";
        RecordHeartbeat(userId); // Still alive, just away
        return Task.CompletedTask;
    }

    public string GetStatus(string userId)
    {
        if (_statusMap.TryGetValue(userId, out var status)) return status;
        return IsOnline(userId) ? "online" : "offline";
    }

    public int GetConnectionCount(string userId)
    {
        if (_onlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                return connections.Count;
            }
        }
        return 0;
    }
}
