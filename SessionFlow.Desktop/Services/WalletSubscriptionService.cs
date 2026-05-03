using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services.EventBus;
using Serilog;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Handles wallet-based subscription purchases with atomic debit + upgrade.
/// This service is the ONLY path for wallet checkout — never call WalletService.DebitAsync directly for subscriptions.
/// </summary>
public class WalletSubscriptionService
{
    private readonly MongoService _db;
    private readonly AuthService _authService;
    private readonly NotificationService _notificationService;
    private readonly IEventBus _eventBus;

    // Cairo timezone for consistent date keys
    private static readonly TimeZoneInfo CairoTz = TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");

    public WalletSubscriptionService(
        MongoService db,
        AuthService authService,
        NotificationService notificationService,
        IEventBus eventBus)
    {
        _db = db;
        _authService = authService;
        _notificationService = notificationService;
        _eventBus = eventBus;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Eligibility check — call before showing the checkout UI
    // ─────────────────────────────────────────────────────────────────────

    public record EligibilityResult(
        bool Eligible,
        long BalancePiasters,
        long RequiredPiasters,
        long ShortfallPiasters,
        string? Error = null);

    public async Task<EligibilityResult> CheckEligibilityAsync(
        Guid userId,
        SubscriptionTier targetTier,
        bool isAnnual,
        CancellationToken ct = default)
    {
        var user = await _authService.GetUserByIdAsync(userId);
        if (user is null)
            return new(false, 0, 0, 0, "User not found.");

        // Admins cannot purchase a subscription (they are always Enterprise-equivalent)
        if (user.Role == UserRole.Admin)
            return new(false, 0, 0, 0, "Administrators do not require a subscription.");

        // Prevent downgrade via wallet
        if ((int)targetTier <= (int)user.SubscriptionTier)
            return new(false, 0, 0, 0, $"You are already on {user.SubscriptionTier} or a higher tier.");

        var wallet = await _db.Wallets
            .Find(w => w.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (wallet is null)
            return new(false, 0, 0, 0, "Wallet not found. Please create your wallet first.");

        if (!wallet.IsActive)
            return new(false, 0, 0, 0, "Your wallet is inactive. Please contact support.");

        var requiredPiasters = PlanLimit.GetPrice(targetTier, isAnnual);
        var balance = wallet.BalancePiasters;
        var shortfall = Math.Max(0, requiredPiasters - balance);

        return new(balance >= requiredPiasters, balance, requiredPiasters, shortfall);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Atomic checkout — debit wallet + activate subscription in one session
    // ─────────────────────────────────────────────────────────────────────

    public record CheckoutResult(
        bool Success,
        long NewBalancePiasters = 0,
        string? Error = null);

    public async Task<CheckoutResult> CheckoutAsync(
        Guid userId,
        SubscriptionTier targetTier,
        bool isAnnual,
        CancellationToken ct = default)
    {
        // 1. Final eligibility guard (re-check to prevent TOCTOU race)
        var eligibility = await CheckEligibilityAsync(userId, targetTier, isAnnual, ct);
        if (!eligibility.Eligible)
            return new(false, Error: eligibility.Error ?? "Not eligible.");

        var requiredPiasters = PlanLimit.GetPrice(targetTier, isAnnual);
        var priceDisplay = $"{requiredPiasters / 100m:F2} EGP";

        // 2. Atomic wallet debit — uses FindOneAndUpdate with balance guard
        var transactionId = Guid.NewGuid();
        var refCode = $"SUB-{targetTier.ToString().ToUpperInvariant()}-{DateTime.UtcNow:yyyyMMddHHmm}-{transactionId.ToString("N")[..6].ToUpperInvariant()}";

        var walletFilter = Builders<Wallet>.Filter.And(
            Builders<Wallet>.Filter.Eq(w => w.UserId, userId),
            Builders<Wallet>.Filter.Gte(w => w.BalancePiasters, requiredPiasters),  // guard
            Builders<Wallet>.Filter.Eq(w => w.IsActive, true)
        );

        var walletUpdate = Builders<Wallet>.Update
            .Inc(w => w.BalancePiasters, -requiredPiasters)
            .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

        var updatedWallet = await _db.Wallets.FindOneAndUpdateAsync(
            walletFilter,
            walletUpdate,
            new FindOneAndUpdateOptions<Wallet> { ReturnDocument = ReturnDocument.After },
            ct);

        if (updatedWallet is null)
        {
            Log.Warning("[WalletSubscription] Debit failed for user {UserId} — balance race or wallet inactive", userId);
            return new(false, Error: "Insufficient balance or wallet unavailable. Please refresh and try again.");
        }

        // 3. Record the wallet transaction
        var transaction = new Transaction
        {
            Id = transactionId,
            IdempotencyKey = Guid.NewGuid(),
            FromWalletId = updatedWallet.Id,
            ToWalletId = null,                // self-debit (no recipient wallet)
            AmountPiasters = requiredPiasters,
            FeePiasters = null,               // no platform fee for own subscription
            BalanceAfterSenderPiasters = updatedWallet.BalancePiasters,
            BalanceAfterReceiverPiasters = 0,
            Type = WalletTransactionType.SubscriptionPayment,
            Status = WalletTransactionStatus.Completed,
            Note = $"Subscription upgrade to {targetTier} ({(isAnnual ? "Annual" : "Monthly")})",
            ReferenceCode = refCode,
            IpAddress = "system",
            CreatedAt = DateTimeOffset.UtcNow,
            CompletedAt = DateTimeOffset.UtcNow
        };

        await _db.Transactions.InsertOneAsync(transaction, cancellationToken: ct);

        // 4. Activate subscription (updates User.SubscriptionTier + Subscriptions collection)
        var (upgraded, upgradeError) = await _authService.UpgradeSubscriptionTierAsync(userId, targetTier, isAnnual, ct);
        if (!upgraded)
        {
            // CRITICAL: Wallet debited but subscription failed — log for manual remediation
            Log.Error("[WalletSubscription] CRITICAL: Wallet debited ({Price}) but subscription upgrade failed for user {UserId}. Tx: {TxId}. Error: {Error}",
                priceDisplay, userId, transactionId, upgradeError);

            // Attempt automatic refund
            var refundOk = await AttemptRefundAsync(updatedWallet.Id, requiredPiasters, transactionId, ct);
            var refundNote = refundOk ? "A refund has been issued to your wallet." : "Please contact support immediately with reference: " + refCode;
            return new(false, Error: $"Subscription activation failed. {refundNote}");
        }

        // 5. Link transaction ID to subscription record
        await _db.Subscriptions.UpdateOneAsync(
            s => s.UserId == userId,
            Builders<Subscription>.Update
                .Set(s => s.PaymentSource, "Wallet")
                .Set(s => s.WalletTransactionId, transactionId),
            cancellationToken: ct);

        Log.Information("[WalletSubscription] User {UserId} upgraded to {Tier} via wallet. Amount: {Price}, Tx: {TxId}",
            userId, targetTier, priceDisplay, transactionId);

        // 6. Emit real-time events — tier change + wallet balance update
        _ = Task.Run(async () =>
        {
            try
            {
                await _eventBus.PublishAsync(
                    EventBus.Events.SubscriptionChanged,
                    EventBus.EventTargetType.User,
                    userId.ToString(),
                    new { userId = userId.ToString(), newTier = targetTier.ToString(), source = "wallet" });

                await _eventBus.PublishAsync(
                    EventBus.Events.WalletBalanceUpdated,
                    EventBus.EventTargetType.User,
                    userId.ToString(),
                    new { userId = userId.ToString(), newBalancePiasters = updatedWallet.BalancePiasters });
            }
            catch (Exception ex) { Log.Error(ex, "[WalletSubscription] Failed to emit real-time events"); }
        });

        return new(true, updatedWallet.BalancePiasters);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal: refund on subscription activation failure
    // ─────────────────────────────────────────────────────────────────────

    private async Task<bool> AttemptRefundAsync(
        Guid walletId,
        long amountPiasters,
        Guid originalTxId,
        CancellationToken ct)
    {
        try
        {
            var refundUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, amountPiasters)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            await _db.Wallets.UpdateOneAsync(w => w.Id == walletId, refundUpdate, cancellationToken: ct);

            // Mark original transaction as reversed
            await _db.Transactions.UpdateOneAsync(
                t => t.Id == originalTxId,
                Builders<Transaction>.Update.Set(t => t.Status, WalletTransactionStatus.Reversed),
                cancellationToken: ct);

            Log.Information("[WalletSubscription] Refund of {Amount} piasters issued for failed subscription (wallet {WalletId})", amountPiasters, walletId);
            return true;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[WalletSubscription] Refund FAILED for wallet {WalletId}. Manual intervention required.", walletId);
            return false;
        }
    }
}
