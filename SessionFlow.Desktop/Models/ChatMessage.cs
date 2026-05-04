using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class ChatMessage
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid SenderId { get; set; }
    
    public string Text { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; } // MIME type for media preview
    public bool IsDeleted { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset SentAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Emoji reactions on this message. Key = emoji string, Value = list of user IDs.
    /// </summary>
    public Dictionary<string, List<string>> Reactions { get; set; } = new();

    /// <summary>
    /// Tracks who has read this message. Populated when a client calls MarkMessagesAsRead.
    /// Visible only to the message sender (engineer) for the "Seen By" feature.
    /// </summary>
    public List<ReadByEntry> ReadBy { get; set; } = new();

    // Navigation (Ignored)
    [BsonIgnore]
    public Group? Group { get; set; }
    
    [BsonIgnore]
    public User? Sender { get; set; }
}

public class ReadByEntry
{
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public DateTimeOffset ReadAt { get; set; } = DateTimeOffset.UtcNow;
}
