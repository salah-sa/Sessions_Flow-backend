namespace SessionFlow.Desktop.Models;

public record CreateWalletRequest(string PhoneNumber, string Pin);

// Added IdempotencyKey to prevent double-spending
public record TransferRequest(string ToPhone, decimal AmountEGP, string Pin, string? Note, Guid IdempotencyKey);

public record AdminTopUpRequest(string TargetPhone, decimal AmountEGP, string Note);

public record VerifyPinRequest(string Pin);

public record WalletResponse(string WalletId, string PhoneNumber, decimal BalanceEGP, 
                             decimal DailyLimitEGP, decimal DailyUsedEGP, bool IsActive);

public record TransferResponse(string ReferenceCode, decimal AmountEGP, string ToPhone,
                               decimal NewBalanceEGP, DateTimeOffset CompletedAt);

public record TransactionDto(string ReferenceCode, string Type, string Direction,
                             decimal AmountEGP, string CounterpartyPhone, 
                             string? Note, string Status, DateTimeOffset CreatedAt);
