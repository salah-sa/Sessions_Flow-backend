using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class AuditLog
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid? UserId { get; set; }
    
    public string UserName { get; set; } = "System";
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}
