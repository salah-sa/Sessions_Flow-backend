using System.Collections.Concurrent;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// PresenceService tracks which users are currently online.
/// Uses an in-memory ConcurrentDictionary for fast lookups.
/// Updated by the SignalR hub on connect/disconnect and UpdatePresence calls.
/// </summary>
public class PresenceService
{
    // Maps userId → set of connectionIds (a user can have multiple connections)
    private readonly ConcurrentDictionary<string, HashSet<string>> _onlineUsers = new();

    // Maps connectionId → userId for reverse lookup on disconnect
    private readonly ConcurrentDictionary<string, string> _connectionUserMap = new();

    public void UserConnected(string userId, string connectionId)
    {
        _connectionUserMap[connectionId] = userId;

        _onlineUsers.AddOrUpdate(
            userId,
            _ => new HashSet<string> { connectionId },
            (_, connections) =>
            {
                lock (connections)
                {
                    connections.Add(connectionId);
                }
                return connections;
            });
    }

    public void UserDisconnected(string connectionId)
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
                    }
                }
            }
        }
    }

    public bool IsOnline(string userId)
    {
        return _onlineUsers.ContainsKey(userId);
    }

    public List<string> GetOnlineUserIds()
    {
        return _onlineUsers.Keys.ToList();
    }

    public string? GetUserIdForConnection(string connectionId)
    {
        _connectionUserMap.TryGetValue(connectionId, out var userId);
        return userId;
    }

    public void SetPresence(string userId, bool isOnline, string connectionId)
    {
        if (isOnline)
        {
            UserConnected(userId, connectionId);
        }
        else
        {
            UserDisconnected(connectionId);
        }
    }
}
