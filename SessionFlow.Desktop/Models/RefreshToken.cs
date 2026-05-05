using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

/// <summary>
/// Persisted refresh token for secure JWT rotation.
/// Stored in MongoDB with TTL auto-expiry.
/// </summary>
public class RefreshToken
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    /// <summary>
    /// SHA-256 hash of the token value (never store raw tokens).
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Populated when this token is used to issue a new one (rotation).
    /// </summary>
    [BsonIgnoreIfNull]
    public DateTimeOffset? RevokedAt { get; set; }

    /// <summary>
    /// The token that replaced this one (for replay detection).
    /// </summary>
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.String)]
    public Guid? ReplacedByTokenId { get; set; }

    /// <summary>
    /// IP address that created this token.
    /// </summary>
    [BsonIgnoreIfNull]
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent that created this token.
    /// </summary>
    [BsonIgnoreIfNull]
    public string? UserAgent { get; set; }

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt.HasValue;
    public bool IsActive => !IsRevoked && !IsExpired;
}
