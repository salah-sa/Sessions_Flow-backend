namespace SessionFlow.Desktop.Models;

public record CreateWalletRequest(string PhoneNumber, string Pin);

// Added IdempotencyKey to prevent double-spending
public record TransferRequest(string ToPhone, decimal AmountEGP, string Pin, string? Note, Guid IdempotencyKey);

public record AdminTopUpRequest(string TargetPhone, decimal AmountEGP, string? Note);

public record VerifyPinRequest(string Pin);

public record SendOtpRequest(string Phone, string Purpose);

public record VerifyPhoneRequest(string Phone, string Code);

public record ForgotPinSendOtpRequest(string Phone);

public record ForgotPinResetRequest(string Phone, string Code, string NewPin);

public record CreateDepositRequest(decimal AmountEGP, string PaymentMethod);

public record AdminApproveDepositRequest(string DepositRequestId, string? AdminNote);

public record AdminRejectDepositRequest(string DepositRequestId, string AdminNote);

// ─── Response Records ───────────────────────────────────────────────────────

public record WalletResponse(string WalletId, string PhoneNumber, decimal BalanceEGP,
                             decimal DailyLimitEGP, decimal DailyUsedEGP, bool IsActive, bool IsPhoneVerified);

public record TransferResponse(string ReferenceCode, decimal AmountEGP, decimal FeeEGP, string ToPhone,
                               decimal NewBalanceEGP, DateTimeOffset CompletedAt);

public record TransactionDto(string ReferenceCode, string Type, string Direction,
                             decimal AmountEGP, decimal? FeeEGP, string CounterpartyPhone,
                             string? Note, string Status, DateTimeOffset CreatedAt);

public record DepositRequestDto(
    string Id,
    decimal AmountEGP,
    string PaymentMethod,
    string TargetPaymentPhone,
    string Status,
    bool IsFirstDeposit,
    decimal BonusEGP,
    string? AdminNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReviewedAt
);
