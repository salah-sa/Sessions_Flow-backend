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
    public Guid SenderId { get; set; }
    
    public string Text { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; } // MIME type for media preview
    public DateTimeOffset SentAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation (Ignored)
    [BsonIgnore]
    public Group? Group { get; set; }
    
    [BsonIgnore]
    public User? Sender { get; set; }
}
