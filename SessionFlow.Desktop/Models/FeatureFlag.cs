using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class FeatureFlag
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Unique machine key, e.g. "ai.center", "chat.voice_calls"</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Human-readable display name shown in the UI.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Short description of what this flag controls.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Global kill switch. If false, nobody sees this feature.</summary>
    public bool Enabled { get; set; } = false;

    /// <summary>Tiers that have access when Enabled = true. Empty = all tiers.</summary>
    public List<string> AllowedTiers { get; set; } = new();

    /// <summary>Specific userIds that bypass tier restrictions (whitelist).</summary>
    public List<string> OverrideUserIds { get; set; } = new();

    /// <summary>Category for UI grouping: "ai", "chat", "payment", "admin"</summary>
    public string Category { get; set; } = "general";

    /// <summary>Danger zone flags require extra confirmation before toggling.</summary>
    public bool IsDangerZone { get; set; } = false;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string UpdatedBy { get; set; } = "System";
}
