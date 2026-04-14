namespace SessionFlow.Desktop.Services;

/// <summary>
/// Abstraction for presence tracking.
/// Implemented by both PresenceService (in-memory fallback) and RedisPresenceService (primary).
/// </summary>
public interface IPresenceService
{
    void UserConnected(string userId, string connectionId);
    void UserDisconnected(string connectionId);
    bool IsOnline(string userId);
    List<string> GetOnlineUserIds();
    void RecordHeartbeat(string userId);
    List<object> GetPresenceSnapshot(IEnumerable<string> userIds);
    string? GetUserIdForConnection(string connectionId);
    void SetPresence(string userId, bool isOnline, string connectionId);
    Task SetAwayAsync(string userId);
    string GetStatus(string userId);
}
