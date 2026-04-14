namespace SessionFlow.Desktop.Services.EventBus;

/// <summary>
/// Event routing target types for the event dispatcher.
/// </summary>
public enum EventTargetType
{
    /// <summary>Broadcast to a SignalR group (e.g., chat_{groupId})</summary>
    Group,
    /// <summary>Send to a specific user by userId</summary>
    User,
    /// <summary>Broadcast to all connected clients</summary>
    All,
    /// <summary>Send only to the connection that raised the event (caller)</summary>
    Caller,
    /// <summary>Broadcast to all users in a specific role (managed via role_{roleName} groups)</summary>
    Role
}

/// <summary>
/// Standard envelope for all events passing through the event bus.
/// </summary>
public class EventEnvelope
{
    /// <summary>Event name from EventContracts (e.g., "message:receive")</summary>
    public string EventName { get; set; } = string.Empty;

    /// <summary>How to route this event to clients</summary>
    public EventTargetType TargetType { get; set; } = EventTargetType.Group;

    /// <summary>Target identifier (group name, userId, etc.)</summary>
    public string Target { get; set; } = string.Empty;

    /// <summary>JSON-serialized payload</summary>
    public string Payload { get; set; } = string.Empty;

    /// <summary>Originating server instance (for dedup in multi-server)</summary>
    public string OriginServerId { get; set; } = string.Empty;

    /// <summary>UTC timestamp of creation</summary>
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

/// <summary>
/// Abstraction for the centralized event bus.
/// All real-time events flow through this interface.
/// </summary>
public interface IEventBus
{
    /// <summary>
    /// Publish an event to the bus. The EventDispatcher will route it to the correct SignalR target.
    /// </summary>
    Task PublishAsync(EventEnvelope envelope);

    /// <summary>
    /// Convenience: publish an event with auto-constructed envelope.
    /// </summary>
    Task PublishAsync(string eventName, EventTargetType targetType, string target, object payload);

    /// <summary>
    /// Subscribe to events on this bus (used by the EventDispatcher).
    /// Returns an IDisposable to unsubscribe.
    /// </summary>
    IDisposable Subscribe(Action<EventEnvelope> handler);
}
