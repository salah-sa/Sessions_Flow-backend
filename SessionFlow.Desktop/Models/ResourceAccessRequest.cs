using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum RequestStatus
{
    Pending,
    Approved,
    Rejected
}

public class ResourceAccessRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid RequesterId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid OwnerId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid ResourceId { get; set; }

    public string ResourceType { get; set; } = string.Empty; // e.g. "Group", "Student"

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
}

public class AccessGrant
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; } // The engineer who has been granted access

    [BsonRepresentation(BsonType.String)]
    public Guid ResourceId { get; set; }

    public string ResourceType { get; set; } = string.Empty;

    public string Permissions { get; set; } = "ReadWrite";

    public DateTimeOffset GrantedAt { get; set; } = DateTimeOffset.UtcNow;
}
