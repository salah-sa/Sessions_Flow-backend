using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

// ── Analytics Event (Hybrid tracking — FE + BE emits these) ──────────────────
public class AnalyticsEvent
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid? UserId { get; set; }

    public string UserRole { get; set; } = string.Empty;

    /// <summary>e.g. "page_view", "feature_used", "session_created", "login", "export"</summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Route or feature identifier, e.g. "/dashboard", "ai.chat"</summary>
    public string Route { get; set; } = string.Empty;

    /// <summary>Flexible JSON metadata — duration, itemId, itemType, etc.</summary>
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>Session ID linking events in one browser session.</summary>
    public string BrowserSessionId { get; set; } = string.Empty;

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

// ── Analytics Ingest Request (from frontend) ──────────────────────────────────
public record AnalyticsEventRequest(
    string EventType,
    string Route,
    string BrowserSessionId,
    Dictionary<string, object>? Metadata = null
);

public record AnalyticsBatchRequest(List<AnalyticsEventRequest> Events);
