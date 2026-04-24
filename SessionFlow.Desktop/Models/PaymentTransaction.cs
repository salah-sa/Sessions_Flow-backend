using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum PaymentMethod
{
    Card = 0,
    VodafoneCash = 1,
    OrangeMoney = 2,
    EtisalatCash = 3,
    Fawry = 4,
    Meeza = 5
}

public enum TransactionStatus
{
    Pending = 0,
    Processing = 1,
    Succeeded = 2,
    Failed = 3,
    Refunded = 4,
    Disputed = 5
}

public class PaymentTransaction
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? SubscriptionId { get; set; }

    public long AmountPiasters { get; set; }
    public decimal Amount { get; set; } // Added for higher-level API usage
    public string Currency { get; set; } = "EGP";
    
    public PaymentMethod Method { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public SubscriptionTier TierSnapshot { get; set; } // Track what they bought
    public bool IsAnnual { get; set; } // Track cycle

    [BsonIgnoreIfNull]
    public string? PaymobOrderId { get; set; } // Required for reconciliation
    
    [BsonIgnoreIfNull]
    public string? PaymobTransactionId { get; set; } // May be null initially for pending wallet/fawry
    
    [BsonIgnoreIfNull]
    public string? ErrorMessage { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
