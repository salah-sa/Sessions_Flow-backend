using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum SubscriptionStatus
{
    Active = 0,
    PastDue = 1,
    Canceled = 2,
    Trialing = 3,
    Expired = 4
}

public enum SubscriptionTier
{
    Free = 0,
    Pro = 1,
    Ultra = 2
}

public class Subscription
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    public SubscriptionTier Tier { get; set; } = SubscriptionTier.Free;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
    
    public string BillingCycle { get; set; } = "monthly"; // "monthly" or "annual"
    public long PriceAmountPiasters { get; set; } // Locked-in price at time of sub

    [BsonIgnoreIfNull]
    public string? PaymobCustomerId { get; set; }

    [BsonIgnoreIfNull]
    public string? PaymobCardToken { get; set; } // TODO: Encrypt at rest in Phase 17

    public DateTimeOffset CurrentPeriodStart { get; set; }
    public DateTimeOffset CurrentPeriodEnd { get; set; }
    
    [BsonIgnoreIfNull]
    public DateTimeOffset? TrialEnd { get; set; }
    
    public bool CancelAtPeriodEnd { get; set; }
    
    // Retry Logic for PastDue state
    public int RetryCount { get; set; } = 0;
    
    [BsonIgnoreIfNull]
    public DateTimeOffset? NextRetryAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
