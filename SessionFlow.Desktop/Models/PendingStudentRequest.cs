using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class PendingStudentRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    
    public string GroupName { get; set; } = string.Empty;
    
    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }

    public DateTimeOffset RequestedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
    
    public PendingStatus Status { get; set; } = PendingStatus.Pending;
}
