using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum WalletTransactionType
{
    Transfer,
    AdminTopUp,
    AdminDeduct,
    Reversed
}

public enum WalletTransactionStatus
{
    Pending,
    Completed,
    Failed,
    Reversed
}

public class Transaction
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid IdempotencyKey { get; set; }

    public string ReferenceCode { get; set; } = string.Empty; // TXN-YYYYMMDD-XXXXXXXX

    [BsonRepresentation(BsonType.String)]
    public WalletTransactionType Type { get; set; }

    [BsonRepresentation(BsonType.String)]
    public WalletTransactionStatus Status { get; set; }

    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.String)]
    public Guid? FromWalletId { get; set; }

    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.String)]
    public Guid? ToWalletId { get; set; }

    [BsonIgnoreIfNull]
    public string? FromPhone { get; set; }

    [BsonIgnoreIfNull]
    public string? ToPhone { get; set; }

    public long AmountPiasters { get; set; }

    public long BalanceAfterSenderPiasters { get; set; }

    public long BalanceAfterReceiverPiasters { get; set; }

    [BsonIgnoreIfNull]
    public string? Note { get; set; }

    public string IpAddress { get; set; } = string.Empty;

    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.String)]
    public Guid? InitiatedByUserId { get; set; }

    [BsonIgnoreIfNull]
    public string? FailureReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonIgnoreIfNull]
    public DateTimeOffset? CompletedAt { get; set; }
}
