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
    public const string ReactionToggled = "reaction:toggled";

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
    public const string CallBusy = "call:busy";
    public const string CallInCall = "call:in-call";
    public const string CallAvailable = "call:available";
    public const string CallOffer = "call:offer";
    public const string CallAnswer = "call:answer";
    public const string CallIce = "call:ice";
    // Group Calls
    public const string CallGroupStarted = "call:group-started";
    public const string CallGroupJoined = "call:group-joined";
    public const string CallGroupLeft = "call:group-left";
    public const string CallGroupOffer = "call:group-offer";
    public const string CallGroupAnswer = "call:group-answer";
    public const string CallGroupIce = "call:group-ice";

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
    public const string UserUpdated = "user:updated";

    // ═══════════════════════════════════════════════
    // Broadcast
    // ═══════════════════════════════════════════════
    /// <summary>Platform-wide broadcast sent to ALL connected clients simultaneously.</summary>
    public const string BroadcastMessage = "broadcast:message";

    // ═══════════════════════════════════════════════
    // Wallet
    // ═══════════════════════════════════════════════
    public const string WalletBalanceUpdated = "wallet:balance-updated";
    public const string WalletTransactionReceived = "wallet:transaction-received";
    public const string WalletDepositApproved = "wallet:deposit-approved";
    public const string WalletDepositRejected = "wallet:deposit-rejected";

    // ═══════════════════════════════════════════════
    // Subscription
    // ═══════════════════════════════════════════════
    /// <summary>Emitted when a user's subscription tier changes (upgrade or downgrade).</summary>
    public const string SubscriptionChanged = "subscription:changed";

    // ═══════════════════════════════════════════════
    // Usage / Quotas
    // ═══════════════════════════════════════════════
    /// <summary>Emitted when a user's daily usage counter is incremented.</summary>
    public const string UsageUpdated = "usage:updated";

    // ═══════════════════════════════════════════════
    // Feature Flags
    // ═══════════════════════════════════════════════
    /// <summary>Emitted when an admin creates, updates, or deletes a feature flag.</summary>
    public const string FlagUpdated = "flag:updated";
}
