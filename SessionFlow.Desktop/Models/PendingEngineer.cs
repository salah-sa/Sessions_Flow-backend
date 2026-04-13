using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum PendingStatus
{
    Pending = 0,
    Approved = 1,
    Denied = 2
}

public class PendingEngineer
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string AccessCode { get; set; } = string.Empty;
    public DateTimeOffset RequestedAt { get; set; } = DateTimeOffset.UtcNow;
    public PendingStatus Status { get; set; } = PendingStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
