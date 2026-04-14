namespace SessionFlow.Desktop.Services;

/// <summary>
/// Abstraction for presence tracking.
/// Implemented by both PresenceService (in-memory fallback) and RedisPresenceService (primary).
/// </summary>
public interface IPresenceService
{
    void UserConnected(string userId, string connectionId);
    Task<bool> UserDisconnectedAsync(string connectionId);
    bool IsOnline(string userId);
    List<string> GetOnlineUserIds();
    void RecordHeartbeat(string userId);
    List<object> GetPresenceSnapshot(IEnumerable<string> userIds);
    string? GetUserIdForConnection(string connectionId);
    Task SetPresenceAsync(string userId, bool isOnline, string connectionId);
    Task SetAwayAsync(string userId);
    string GetStatus(string userId);
    /// <summary>
    /// Returns how many active connections exist for a user.
    /// Used by the hub to suppress duplicate presence broadcasts on multi-client connect.
    /// </summary>
    int GetConnectionCount(string userId);
}
