using MongoDB.Driver;
using StackExchange.Redis;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services;

public class WalletService
{
    private readonly MongoService _db;
    private readonly WalletValidationService _validationService;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<WalletService> _logger;

    private const string PlatformPhone = "SYSTEM_PLATFORM";
    private const decimal FeeRate = 0.01m; // 1%

    public WalletService(MongoService db, WalletValidationService validationService, IConnectionMultiplexer redis, ILogger<WalletService> logger)
    {
        _db = db;
        _validationService = validationService;
        _redis = redis;
        _logger = logger;
    }

    // ─── Lookups ─────────────────────────────────────────────────────────────

    public async Task<Wallet?> GetWalletByPhoneAsync(string phone, CancellationToken ct = default)
        => await _db.Wallets.Find(w => w.PhoneNumber == phone).FirstOrDefaultAsync(ct);

    public async Task<Wallet?> GetWalletByUserIdAsync(Guid userId, CancellationToken ct = default)
        => await _db.Wallets.Find(w => w.UserId == userId).FirstOrDefaultAsync(ct);

    // ─── Platform Wallet ──────────────────────────────────────────────────────

    /// <summary>Ensures the system platform wallet exists. Called once at startup.</summary>
    public async Task EnsurePlatformWalletAsync(CancellationToken ct = default)
    {
        var exists = await _db.Wallets.Find(w => w.PhoneNumber == PlatformPhone).AnyAsync(ct);
        if (!exists)
        {
            await _db.Wallets.InsertOneAsync(new Wallet
            {
                UserId = Guid.Empty,
                PhoneNumber = PlatformPhone,
                PinHash = "SYSTEM",
                IsActive = true,
                IsPhoneVerified = true,
                DailyTransferLimitPiasters = long.MaxValue,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            }, cancellationToken: ct);
            _logger.LogInformation("[Wallet] Platform wallet created.");
        }
    }

    // ─── Create Wallet ───────────────────────────────────────────────────────

    public async Task<(Wallet? wallet, string? error)> CreateWalletAsync(
        Guid userId, string phone, string pin, bool isPhoneVerified = false, CancellationToken ct = default)
    {
        if (!_validationService.IsValidEgyptianNumber(phone))
            return (null, "Invalid Egyptian phone number format.");

        if (!_validationService.IsValidPin(pin))
            return (null, "PIN must be exactly 4 or 6 numeric digits.");

        if (await _db.Wallets.Find(w => w.PhoneNumber == phone || w.UserId == userId).AnyAsync(ct))
            return (null, "A wallet already exists for this phone number or user.");

        var wallet = new Wallet
        {
            UserId = userId,
            PhoneNumber = phone,
            PinHash = BCrypt.Net.BCrypt.HashPassword(pin, workFactor: 12),
            BalancePiasters = 0,
            DailyTransferLimitPiasters = 500_000,
            DailyTransferredPiasters = 0,
            IsActive = true,
            IsPhoneVerified = isPhoneVerified,
            PhoneVerifiedAt = isPhoneVerified ? DateTimeOffset.UtcNow : null,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        try
        {
            await _db.Wallets.InsertOneAsync(wallet, cancellationToken: ct);
            return (wallet, null);
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return (null, "A wallet already exists for this phone number or user.");
        }
    }

    // ─── Mark Phone Verified ─────────────────────────────────────────────────

    public async Task<bool> MarkPhoneVerifiedAsync(string phone, CancellationToken ct = default)
    {
        var update = Builders<Wallet>.Update
            .Set(w => w.IsPhoneVerified, true)
            .Set(w => w.PhoneVerifiedAt, DateTimeOffset.UtcNow)
            .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

        var result = await _db.Wallets.UpdateOneAsync(w => w.PhoneNumber == phone, update, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    // ─── Update PIN ───────────────────────────────────────────────────────────

    public async Task<(bool success, string? error)> UpdatePinAsync(string phone, string newPin, CancellationToken ct = default)
    {
        if (!_validationService.IsValidPin(newPin))
            return (false, "PIN must be exactly 4 or 6 numeric digits.");

        var wallet = await GetWalletByPhoneAsync(phone, ct);
        if (wallet == null) return (false, "Wallet not found.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPin, workFactor: 12);
        var update = Builders<Wallet>.Update
            .Set(w => w.PinHash, newHash)
            .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

        // Clear any PIN rate-limit key after successful reset
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync($"wallet_pin_attempts:{phone}");

        await _db.Wallets.UpdateOneAsync(w => w.PhoneNumber == phone, update, cancellationToken: ct);
        return (true, null);
    }

    // ─── PIN Verification ─────────────────────────────────────────────────────

    public async Task<(bool isValid, string? error, int? attemptsRemaining, DateTimeOffset? unlockAt)> VerifyPinAsync(
        string phone, string pin, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        var rateLimitKey = $"wallet_pin_attempts:{phone}";

        var attemptsStr = await db.StringGetAsync(rateLimitKey);
        int attempts = attemptsStr.HasValue ? int.Parse(attemptsStr!) : 0;

        if (attempts >= 5)
        {
            var ttl = await db.KeyTimeToLiveAsync(rateLimitKey);
            var unlockAt = DateTimeOffset.UtcNow.Add(ttl ?? TimeSpan.FromMinutes(15));
            return (false, "Too many failed attempts. Account is temporarily locked.", 0, unlockAt);
        }

        var wallet = await GetWalletByPhoneAsync(phone, ct);
        if (wallet == null || !wallet.IsActive)
            return (false, "Wallet not found or is inactive.", null, null);

        bool isCorrect = BCrypt.Net.BCrypt.Verify(pin, wallet.PinHash);
        if (!isCorrect)
        {
            attempts++;
            await db.StringSetAsync(rateLimitKey, attempts, TimeSpan.FromMinutes(15));
            int remaining = 5 - attempts;
            return (false, $"Invalid PIN. {remaining} attempts remaining.", remaining, null);
        }

        await db.KeyDeleteAsync(rateLimitKey);
        return (true, null, null, null);
    }

    // ─── Transfer (with 1% Fee) ──────────────────────────────────────────────

    public async Task<(Transaction? transaction, decimal feePiasters, string? error)> TransferAsync(
        string fromPhone, string toPhone, decimal amountEGP, string pin, string? note,
        Guid idempotencyKey, Guid initiatorId, string ipAddress, CancellationToken ct = default)
    {
        if (fromPhone == toPhone)
            return (null, 0, "Cannot transfer to the same wallet.");

        if (!_validationService.IsValidEgyptianNumber(toPhone))
            return (null, 0, "Invalid recipient phone number.");

        long amountPiasters = (long)(amountEGP * 100);
        if (!_validationService.IsValidAmount(amountPiasters))
            return (null, 0, "Transfer amount must be between 0.01 EGP and 100,000 EGP.");

        // 1% fee (ceiling to nearest piaster)
        long feePiasters = (long)Math.Ceiling(amountPiasters * (double)FeeRate);
        long totalDebit = amountPiasters + feePiasters;

        var sanitizedNote = _validationService.SanitizeNote(note);

        var (pinValid, pinError, _, unlockAt) = await VerifyPinAsync(fromPhone, pin, ct);
        if (!pinValid)
        {
            if (unlockAt.HasValue)
                return (null, 0, $"Account locked. Try again after {unlockAt.Value:HH:mm:ss} UTC.");
            return (null, 0, pinError);
        }

        using var session = await _db.Client.StartSessionAsync(cancellationToken: ct);
        try
        {
            session.StartTransaction();

            var fromWallet = await _db.Wallets.Find(session, w => w.PhoneNumber == fromPhone).FirstOrDefaultAsync(ct);
            var toWallet   = await _db.Wallets.Find(session, w => w.PhoneNumber == toPhone).FirstOrDefaultAsync(ct);
            var platformWallet = await _db.Wallets.Find(session, w => w.PhoneNumber == PlatformPhone).FirstOrDefaultAsync(ct);

            if (fromWallet == null || !fromWallet.IsActive)
                throw new InvalidOperationException("Source wallet not found or inactive.");
            if (!fromWallet.IsPhoneVerified)
                throw new InvalidOperationException("Your phone number is not verified. Please verify before transferring.");
            if (toWallet == null || !toWallet.IsActive)
                throw new InvalidOperationException("Destination wallet not found or inactive.");
            if (fromWallet.BalancePiasters < totalDebit)
                throw new InvalidOperationException("Insufficient funds (including 1% fee).");
            if (fromWallet.DailyTransferredPiasters + totalDebit > fromWallet.DailyTransferLimitPiasters)
                throw new InvalidOperationException("Transfer exceeds your daily limit.");

            // Idempotency guard
            var existingTx = await _db.Transactions.Find(session, t => t.IdempotencyKey == idempotencyKey).FirstOrDefaultAsync(ct);
            if (existingTx != null)
            {
                await session.AbortTransactionAsync(ct);
                return (existingTx, feePiasters, null);
            }

            // Debit sender (amount + fee)
            var fromUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, -totalDebit)
                .Inc(w => w.DailyTransferredPiasters, totalDebit)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            var fromResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session,
                w => w.Id == fromWallet.Id && w.BalancePiasters >= totalDebit,
                fromUpdate, new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            if (fromResult == null)
                throw new InvalidOperationException("Transaction failed due to concurrent balance change.");

            // Credit receiver
            var toUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, amountPiasters)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            var toResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session,
                w => w.Id == toWallet.Id,
                toUpdate, new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            if (toResult == null)
                throw new InvalidOperationException("Transaction failed while updating destination wallet.");

            // Credit platform wallet with fee
            if (platformWallet != null && feePiasters > 0)
            {
                var feeUpdate = Builders<Wallet>.Update
                    .Inc(w => w.BalancePiasters, feePiasters)
                    .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);
                await _db.Wallets.UpdateOneAsync(session, w => w.Id == platformWallet.Id, feeUpdate, cancellationToken: ct);
            }

            var refCode = _validationService.GenerateReferenceCode();
            var transaction = new Transaction
            {
                IdempotencyKey = idempotencyKey,
                ReferenceCode = refCode,
                Type = WalletTransactionType.Transfer,
                Status = WalletTransactionStatus.Completed,
                AmountPiasters = amountPiasters,
                FeePiasters = feePiasters,
                FromWalletId = fromWallet.Id,
                ToWalletId = toWallet.Id,
                FromPhone = fromPhone,
                ToPhone = toPhone,
                BalanceAfterSenderPiasters = fromResult.BalancePiasters,
                BalanceAfterReceiverPiasters = toResult.BalancePiasters,
                Note = sanitizedNote,
                IpAddress = ipAddress,
                InitiatedByUserId = initiatorId,
                CreatedAt = DateTimeOffset.UtcNow,
                CompletedAt = DateTimeOffset.UtcNow
            };

            await _db.Transactions.InsertOneAsync(session, transaction, cancellationToken: ct);
            await session.CommitTransactionAsync(ct);

            return (transaction, feePiasters, null);
        }
        catch (InvalidOperationException ex)
        {
            await session.AbortTransactionAsync(ct);
            return (null, 0, ex.Message);
        }
        catch (MongoCommandException ex)
        {
            await session.AbortTransactionAsync(ct);
            _logger.LogError(ex, "MongoDB Transaction failed during transfer.");
            return (null, 0, "System error during transfer. Please try again.");
        }
        catch (Exception ex)
        {
            await session.AbortTransactionAsync(ct);
            _logger.LogError(ex, "Unexpected error during wallet transfer.");
            return (null, 0, "An unexpected error occurred.");
        }
    }

    // ─── Admin Top-Up ─────────────────────────────────────────────────────────

    public async Task<(Transaction? transaction, string? error)> AdminTopUpAsync(
        string targetPhone, decimal amountEGP, string? note, Guid adminId, string ipAddress, CancellationToken ct = default)
    {
        long amountPiasters = (long)(amountEGP * 100);
        if (amountPiasters <= 0) return (null, "Top-up amount must be greater than zero.");
        if (!_validationService.IsValidEgyptianNumber(targetPhone)) return (null, "Invalid target phone number.");

        var sanitizedNote = _validationService.SanitizeNote(note) ?? "Admin Top-Up";

        using var session = await _db.Client.StartSessionAsync(cancellationToken: ct);
        try
        {
            session.StartTransaction();
            var toWallet = await _db.Wallets.Find(session, w => w.PhoneNumber == targetPhone).FirstOrDefaultAsync(ct);
            if (toWallet == null || !toWallet.IsActive)
                throw new InvalidOperationException("Destination wallet not found or inactive.");

            var toUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, amountPiasters)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            var toResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session,
                w => w.Id == toWallet.Id, toUpdate,
                new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            if (toResult == null) throw new InvalidOperationException("Failed to update destination wallet.");

            var transaction = new Transaction
            {
                IdempotencyKey = Guid.NewGuid(),
                ReferenceCode = _validationService.GenerateReferenceCode(),
                Type = WalletTransactionType.AdminTopUp,
                Status = WalletTransactionStatus.Completed,
                AmountPiasters = amountPiasters,
                ToWalletId = toWallet.Id,
                ToPhone = targetPhone,
                BalanceAfterReceiverPiasters = toResult.BalancePiasters,
                Note = sanitizedNote,
                IpAddress = ipAddress,
                InitiatedByUserId = adminId,
                CreatedAt = DateTimeOffset.UtcNow,
                CompletedAt = DateTimeOffset.UtcNow
            };

            await _db.Transactions.InsertOneAsync(session, transaction, cancellationToken: ct);
            await session.CommitTransactionAsync(ct);
            return (transaction, null);
        }
        catch (InvalidOperationException ex) { await session.AbortTransactionAsync(ct); return (null, ex.Message); }
        catch (Exception ex) { await session.AbortTransactionAsync(ct); _logger.LogError(ex, "Admin top-up failed."); return (null, "System error."); }
    }

    // ─── Deposit Requests ─────────────────────────────────────────────────────

    public async Task<(DepositRequest? req, string? error)> CreateDepositRequestAsync(
        Guid userId, decimal amountEGP, string paymentMethod, CancellationToken ct = default)
    {
        var wallet = await GetWalletByUserIdAsync(userId, ct);
        if (wallet == null) return (null, "No wallet found.");
        if (!wallet.IsPhoneVerified) return (null, "Verify your phone before depositing.");
        if (amountEGP < 1m) return (null, "Minimum deposit is 1 EGP.");

        if (!Enum.TryParse<DepositPaymentMethod>(paymentMethod, true, out var method))
            return (null, "Invalid payment method. Use 'WePay' or 'VodafoneCash'.");

        var targetPhone = method == DepositPaymentMethod.WePay ? "01558647376" : "01020933560";

        // Check if first deposit (no prior approved deposit for this user)
        var hasApproved = await _db.DepositRequests.Find(
            d => d.UserId == userId && d.Status == DepositStatus.Approved
        ).AnyAsync(ct);

        var req = new DepositRequest
        {
            UserId = userId,
            WalletId = wallet.Id,
            PhoneNumber = wallet.PhoneNumber,
            AmountEGP = amountEGP,
            PaymentMethod = method,
            TargetPaymentPhone = targetPhone,
            Status = DepositStatus.Pending,
            IsFirstDeposit = !hasApproved,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _db.DepositRequests.InsertOneAsync(req, cancellationToken: ct);
        return (req, null);
    }

    public async Task<(Transaction? tx, string? error)> ApproveDepositAsync(
        string depositId, Guid adminId, string? adminNote, string ipAddress, CancellationToken ct = default)
    {
        if (!Guid.TryParse(depositId, out var id)) return (null, "Invalid deposit request ID.");

        var req = await _db.DepositRequests.Find(d => d.Id == id).FirstOrDefaultAsync(ct);
        if (req == null) return (null, "Deposit request not found.");
        if (req.Status != DepositStatus.Pending) return (null, "Request is already processed.");

        long amountPiasters = (long)(req.AmountEGP * 100);
        long bonusPiasters = req.IsFirstDeposit ? (long)(amountPiasters * 0.20m) : 0;
        long totalCredit = amountPiasters + bonusPiasters;

        using var session = await _db.Client.StartSessionAsync(cancellationToken: ct);
        try
        {
            session.StartTransaction();

            var wallet = await _db.Wallets.Find(session, w => w.Id == req.WalletId).FirstOrDefaultAsync(ct);
            if (wallet == null || !wallet.IsActive) throw new InvalidOperationException("Target wallet not found or inactive.");

            // Credit wallet
            var upd = Builders<Wallet>.Update.Inc(w => w.BalancePiasters, totalCredit).Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);
            var updated = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session, w => w.Id == wallet.Id, upd,
                new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            // Main deposit transaction
            var tx = new Transaction
            {
                IdempotencyKey = Guid.NewGuid(),
                ReferenceCode = _validationService.GenerateReferenceCode(),
                Type = WalletTransactionType.Deposit,
                Status = WalletTransactionStatus.Completed,
                AmountPiasters = amountPiasters,
                ToWalletId = wallet.Id,
                ToPhone = wallet.PhoneNumber,
                BalanceAfterReceiverPiasters = updated!.BalancePiasters,
                Note = adminNote != null ? _validationService.SanitizeNote(adminNote) : $"Deposit via {req.PaymentMethod}",
                IpAddress = ipAddress,
                InitiatedByUserId = adminId,
                CreatedAt = DateTimeOffset.UtcNow,
                CompletedAt = DateTimeOffset.UtcNow
            };
            await _db.Transactions.InsertOneAsync(session, tx, cancellationToken: ct);

            // Update deposit request
            var reqUpd = Builders<DepositRequest>.Update
                .Set(d => d.Status, DepositStatus.Approved)
                .Set(d => d.BonusPiasters, bonusPiasters)
                .Set(d => d.AdminNote, adminNote)
                .Set(d => d.ReviewedByAdminId, adminId)
                .Set(d => d.ReviewedAt, DateTimeOffset.UtcNow);
            await _db.DepositRequests.UpdateOneAsync(session, d => d.Id == id, reqUpd, cancellationToken: ct);

            await session.CommitTransactionAsync(ct);
            return (tx, null);
        }
        catch (Exception ex)
        {
            await session.AbortTransactionAsync(ct);
            _logger.LogError(ex, "Deposit approval failed.");
            return (null, ex is InvalidOperationException ? ex.Message : "System error during approval.");
        }
    }

    public async Task<string?> RejectDepositAsync(string depositId, Guid adminId, string adminNote, CancellationToken ct = default)
    {
        if (!Guid.TryParse(depositId, out var id)) return "Invalid deposit request ID.";
        var req = await _db.DepositRequests.Find(d => d.Id == id).FirstOrDefaultAsync(ct);
        if (req == null) return "Deposit request not found.";
        if (req.Status != DepositStatus.Pending) return "Request is already processed.";

        var upd = Builders<DepositRequest>.Update
            .Set(d => d.Status, DepositStatus.Rejected)
            .Set(d => d.AdminNote, adminNote)
            .Set(d => d.ReviewedByAdminId, adminId)
            .Set(d => d.ReviewedAt, DateTimeOffset.UtcNow);
        await _db.DepositRequests.UpdateOneAsync(d => d.Id == id, upd, cancellationToken: ct);
        return null;
    }

    public async Task<List<DepositRequest>> GetUserDepositRequestsAsync(Guid userId, CancellationToken ct = default)
        => await _db.DepositRequests.Find(d => d.UserId == userId).SortByDescending(d => d.CreatedAt).Limit(50).ToListAsync(ct);

    public async Task<List<DepositRequest>> GetPendingDepositRequestsAsync(CancellationToken ct = default)
        => await _db.DepositRequests.Find(d => d.Status == DepositStatus.Pending).SortByDescending(d => d.CreatedAt).ToListAsync(ct);

    // ─── Transaction History ──────────────────────────────────────────────────

    public async Task<(List<TransactionDto> items, long totalCount)> GetTransactionsAsync(
        Guid walletId, int page, int pageSize, CancellationToken ct = default)
    {
        var filter = Builders<Transaction>.Filter.Or(
            Builders<Transaction>.Filter.Eq(t => t.FromWalletId, walletId),
            Builders<Transaction>.Filter.Eq(t => t.ToWalletId, walletId)
        );

        var totalCount = await _db.Transactions.CountDocumentsAsync(filter, cancellationToken: ct);
        var items = await _db.Transactions.Find(filter)
            .SortByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize).Limit(pageSize)
            .ToListAsync(ct);

        var dtos = items.Select(t => new TransactionDto(
            t.ReferenceCode,
            t.Type.ToString(),
            t.ToWalletId.HasValue && t.ToWalletId.Value == walletId ? "Received" : "Sent",
            t.AmountPiasters / 100m,
            t.FeePiasters.HasValue ? t.FeePiasters.Value / 100m : (decimal?)null,
            t.ToWalletId.HasValue && t.ToWalletId.Value == walletId ? (t.FromPhone ?? "System") : t.ToPhone!,
            t.Note,
            t.Status.ToString(),
            t.CreatedAt
        )).ToList();

        return (dtos, totalCount);
    }

    public async Task<(List<Wallet> items, long totalCount)> GetAllWalletsAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var filter = Builders<Wallet>.Filter.Ne(w => w.PhoneNumber, PlatformPhone);
        var totalCount = await _db.Wallets.CountDocumentsAsync(filter, cancellationToken: ct);
        var items = await _db.Wallets.Find(filter).SortByDescending(w => w.CreatedAt)
            .Skip((page - 1) * pageSize).Limit(pageSize).ToListAsync(ct);
        return (items, totalCount);
    }

    /// <summary>Reset daily transfer counters. Called by WalletBackgroundService at midnight Cairo.</summary>
    public async Task ResetDailyLimitsAsync(CancellationToken ct = default)
    {
        var filter = Builders<Wallet>.Filter.Gt(w => w.DailyTransferredPiasters, 0);
        var update = Builders<Wallet>.Update
            .Set(w => w.DailyTransferredPiasters, 0)
            .Set(w => w.LastDailyReset, DateTimeOffset.UtcNow)
            .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);
        var result = await _db.Wallets.UpdateManyAsync(filter, update, cancellationToken: ct);
        _logger.LogInformation("Reset daily limits for {Count} wallets.", result.ModifiedCount);
    }
}
