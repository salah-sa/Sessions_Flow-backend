using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class Wallet
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    public string PhoneNumber { get; set; } = string.Empty;
    
    public long BalancePiasters { get; set; } = 0;
    
    public string PinHash { get; set; } = string.Empty;
    
    public bool IsActive { get; set; } = true;
    
    public long DailyTransferLimitPiasters { get; set; } = 500000; // Default 5000 EGP
    
    public long DailyTransferredPiasters { get; set; } = 0;
    
    [BsonIgnoreIfNull]
    public DateTimeOffset? LastDailyReset { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
