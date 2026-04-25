using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum UserRole
{
    Admin = 0,
    Engineer = 1,
    Student = 2
}

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Name { get; set; } = string.Empty;
    
    [BsonIgnoreIfNull]
    public string? DisplayName { get; set; } // Editable by user; Name is the immutable real name
    
    public string Email { get; set; } = string.Empty;
    
    [BsonIgnoreIfNull]
    public string? Username { get; set; } // For student login
    
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Engineer;
    public bool IsApproved { get; set; }
    public string? AvatarUrl { get; set; }
    
    // Geolocation (set by student on login)
    [BsonIgnoreIfNull]
    public double? Latitude { get; set; }

    [BsonIgnoreIfNull]
    public double? Longitude { get; set; }

    [BsonIgnoreIfNull]
    public string? City { get; set; }
    
    // Student-specific fields
    [BsonIgnoreIfNull]
    public string? StudentId { get; set; } // Unique student identifier
    
    public string? EngineerCode { get; set; } // The engineer code used during student registration

    // Premium System fields
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;
    
    [BsonIgnoreIfNull]
    public string? PaymobCustomerId { get; set; }

    // User Governance — Access Restrictions & Page Blocking
    [BsonIgnoreIfNull]
    public DateTimeOffset? RestrictedUntil { get; set; }

    [BsonIgnoreIfNull]
    public string? RestrictionReason { get; set; }

    [BsonIgnoreIfNull]
    public List<string>? BlockedPages { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonIgnoreIfNull]
    public string? GoogleId { get; set; }

    [BsonIgnoreIfNull]
    public string? FacebookId { get; set; }

    // In MongoDB, we reference by ID rather than using EF Navigation properties
    [BsonIgnore]
    public ICollection<Group> Groups { get; set; } = new List<Group>();
    
    [BsonIgnore]
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    
    [BsonIgnore]
    public ICollection<TimetableEntry> TimetableEntries { get; set; } = new List<TimetableEntry>();
    
    [BsonIgnore]
    public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();

    // Rate limiting for credential resend
    public int ResendCredentialsCount { get; set; } = 0;
    public DateTimeOffset? LastCredentialResendAt { get; set; }
}
