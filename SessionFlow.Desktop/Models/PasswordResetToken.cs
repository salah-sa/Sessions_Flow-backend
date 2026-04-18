using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class PasswordResetToken
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty; // 6-char alphanumeric
    
    public int Attempts { get; set; } = 0;
    public bool IsUsed { get; set; } = false;
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } // TTL expiration time
}
