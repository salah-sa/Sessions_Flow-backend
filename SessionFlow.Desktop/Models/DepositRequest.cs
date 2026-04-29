using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum DepositStatus
{
    Pending,
    Approved,
    Rejected
}

public enum DepositPaymentMethod
{
    WePay,
    VodafoneCash
}

public class DepositRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid WalletId { get; set; }

    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>The amount the user claims to have sent (in EGP).</summary>
    public decimal AmountEGP { get; set; }

    [BsonRepresentation(BsonType.String)]
    public DepositPaymentMethod PaymentMethod { get; set; }

    /// <summary>The platform account the user sent money to (WePay or Vodafone Cash number).</summary>
    public string TargetPaymentPhone { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.String)]
    public DepositStatus Status { get; set; } = DepositStatus.Pending;

    /// <summary>True if this is the user's first ever approved deposit — qualifies for 20% bonus.</summary>
    public bool IsFirstDeposit { get; set; } = false;

    /// <summary>Bonus amount credited (in piasters). Set only after approval.</summary>
    public long BonusPiasters { get; set; } = 0;

    [BsonIgnoreIfNull]
    public string? AdminNote { get; set; }

    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.String)]
    public Guid? ReviewedByAdminId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonIgnoreIfNull]
    public DateTimeOffset? ReviewedAt { get; set; }
}
