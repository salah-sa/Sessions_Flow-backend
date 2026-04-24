using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class Invoice
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid SubscriptionId { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid? PaymentTransactionId { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Paid"; // Paid, Refunded, Void
    
    public SubscriptionTier Tier { get; set; } // Snapshot at time of payment
    public long AmountPaid { get; set; }
    
    public DateTimeOffset PeriodStart { get; set; }
    public DateTimeOffset PeriodEnd { get; set; }
    
    [BsonIgnoreIfNull]
    public string? ReceiptUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
