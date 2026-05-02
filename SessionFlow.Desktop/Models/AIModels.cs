using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

// ── AI Conversation Log ───────────────────────────────────────────────────────
public class AILog
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    /// <summary>Groups messages in one conversation.</summary>
    public string SessionId { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string Model { get; set; } = "mock";

    public int PromptTokens { get; set; } = 0;
    public int CompletionTokens { get; set; } = 0;
    public int TotalTokens { get; set; } = 0;
    public int DurationMs { get; set; } = 0;

    /// <summary>Whether this was served from Redis cache.</summary>
    public bool WasCached { get; set; } = false;

    public bool WasError { get; set; } = false;
    public string? ErrorMessage { get; set; }

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

// ── AI Prompt Preset ──────────────────────────────────────────────────────────
public class AIPromptPreset
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string Icon { get; set; } = "Sparkles";
    public string Category { get; set; } = "general";
    public bool IsSystemPreset { get; set; } = false;
    public int UsageCount { get; set; } = 0;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ── AI Request DTOs ───────────────────────────────────────────────────────────
public record AIChatRequest(
    string SessionId,
    string Message,
    List<AIChatMessage> History
);

public record AIChatMessage(string Role, string Content);

public record AIPresetRequest(string Title, string Prompt, string Icon, string Category);
