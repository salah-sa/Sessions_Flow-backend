namespace SessionFlow.Desktop.Services.EventBus;

/// <summary>
/// Standardized event contract names for the entire real-time system.
/// These names are shared between backend and frontend.
/// Every event in the system MUST use one of these constants.
/// </summary>
public static class Events
{
    // ═══════════════════════════════════════════════
    // Messages
    // ═══════════════════════════════════════════════
    public const string MessageReceive = "message:receive";
    public const string MessageRead = "message:read";
    public const string MessageTyping = "message:typing";

    // ═══════════════════════════════════════════════
    // Presence
    // ═══════════════════════════════════════════════
    public const string PresenceOnline = "presence:online";
    public const string PresenceOffline = "presence:offline";
    public const string PresenceAway = "presence:away";
    public const string PresenceSnapshot = "presence:snapshot";

    // ═══════════════════════════════════════════════
    // Calls
    // ═══════════════════════════════════════════════
    public const string CallIncoming = "call:incoming";
    public const string CallAccepted = "call:accepted";
    public const string CallRejected = "call:rejected";
    public const string CallEnded = "call:ended";
    public const string CallOffer = "call:offer";
    public const string CallAnswer = "call:answer";
    public const string CallIce = "call:ice";

    // ═══════════════════════════════════════════════
    // Student Requests
    // ═══════════════════════════════════════════════
    public const string RequestCreated = "request:created";
    public const string RequestAccepted = "request:accepted";
    public const string RequestRejected = "request:rejected";

    // ═══════════════════════════════════════════════
    // Groups
    // ═══════════════════════════════════════════════
    public const string GroupCreated = "group:created";
    public const string GroupDeleted = "group:deleted";
    public const string GroupCompleted = "group:completed";
    public const string GroupDescriptionUpdated = "group:description-updated";
    public const string GroupStatusChanged = "group:status-changed";

    // ═══════════════════════════════════════════════
    // Sessions
    // ═══════════════════════════════════════════════
    public const string SessionStatusChanged = "session:status-changed";
    public const string SessionGenerated = "session:generated";
    public const string AttendanceUpdated = "session:attendance-updated";

    // ═══════════════════════════════════════════════
    // Notifications
    // ═══════════════════════════════════════════════
    public const string NotificationCreated = "notification:created";
    public const string NotificationRead = "notification:read";

    // ═══════════════════════════════════════════════
    // Avatar
    // ═══════════════════════════════════════════════
    public const string AvatarUpdated = "avatar:updated";

    // ═══════════════════════════════════════════════
    // System / Sync
    // ═══════════════════════════════════════════════
    public const string SyncState = "sync:state";
}
