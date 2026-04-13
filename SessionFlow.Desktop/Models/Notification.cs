using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.Info;
    public bool IsRead { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum NotificationType
{
    Info,
    Success,
    Warning,
    Error
}
