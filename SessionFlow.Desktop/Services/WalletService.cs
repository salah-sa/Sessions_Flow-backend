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

    public WalletService(MongoService db, WalletValidationService validationService, IConnectionMultiplexer redis, ILogger<WalletService> logger)
    {
        _db = db;
        _validationService = validationService;
        _redis = redis;
        _logger = logger;
    }

    public async Task<Wallet?> GetWalletByPhoneAsync(string phone, CancellationToken ct = default)
    {
        return await _db.Wallets.Find(w => w.PhoneNumber == phone).FirstOrDefaultAsync(ct);
    }
    
    public async Task<Wallet?> GetWalletByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.Wallets.Find(w => w.UserId == userId).FirstOrDefaultAsync(ct);
    }

    public async Task<(Wallet? wallet, string? error)> CreateWalletAsync(Guid userId, string phone, string pin, CancellationToken ct = default)
    {
        if (!_validationService.IsValidEgyptianNumber(phone))
            return (null, "Invalid Egyptian phone number format.");
            
        if (!_validationService.IsValidPin(pin))
            return (null, "PIN must be exactly 4 or 6 numeric digits.");

        // Check uniqueness
        if (await _db.Wallets.Find(w => w.PhoneNumber == phone || w.UserId == userId).AnyAsync(ct))
            return (null, "A wallet already exists for this phone number or user.");

        var wallet = new Wallet
        {
            UserId = userId,
            PhoneNumber = phone,
            PinHash = BCrypt.Net.BCrypt.HashPassword(pin, workFactor: 12),
            BalancePiasters = 0,
            DailyTransferLimitPiasters = 500_000, // Default 5,000 EGP
            DailyTransferredPiasters = 0,
            IsActive = true,
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

    /// <summary>
    /// Verify PIN with Redis-backed rate limiting (max 5 attempts per 15 minutes).
    /// Returns (isValid, error, attemptsRemaining, unlockAt).
    /// </summary>
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

        // On success, clear the rate limit
        await db.KeyDeleteAsync(rateLimitKey);
        return (true, null, null, null);
    }

    public async Task<(Transaction? transaction, string? error)> TransferAsync(
        string fromPhone, string toPhone, decimal amountEGP, string pin, string? note, Guid idempotencyKey, Guid initiatorId, string ipAddress, CancellationToken ct = default)
    {
        if (fromPhone == toPhone)
            return (null, "Cannot transfer to the same wallet.");

        if (!_validationService.IsValidEgyptianNumber(toPhone))
            return (null, "Invalid recipient phone number.");

        long amountPiasters = (long)(amountEGP * 100);
        
        if (!_validationService.IsValidAmount(amountPiasters))
            return (null, "Transfer amount must be between 0.01 EGP and 100,000 EGP.");

        var sanitizedNote = _validationService.SanitizeNote(note);

        var (pinValid, pinError, _, unlockAt) = await VerifyPinAsync(fromPhone, pin, ct);
        if (!pinValid)
        {
            if (unlockAt.HasValue)
                return (null, $"Account locked. Try again after {unlockAt.Value:HH:mm:ss} UTC.");
            return (null, pinError);
        }

        using var session = await _db.Client.StartSessionAsync(cancellationToken: ct);
        
        try
        {
            session.StartTransaction();

            // Fetch wallets inside transaction for consistency
            var fromWallet = await _db.Wallets.Find(session, w => w.PhoneNumber == fromPhone).FirstOrDefaultAsync(ct);
            var toWallet = await _db.Wallets.Find(session, w => w.PhoneNumber == toPhone).FirstOrDefaultAsync(ct);

            if (fromWallet == null || !fromWallet.IsActive)
                throw new InvalidOperationException("Source wallet not found or inactive.");
            if (toWallet == null || !toWallet.IsActive)
                throw new InvalidOperationException("Destination wallet not found or inactive.");

            if (fromWallet.BalancePiasters < amountPiasters)
                throw new InvalidOperationException("Insufficient funds.");

            if (fromWallet.DailyTransferredPiasters + amountPiasters > fromWallet.DailyTransferLimitPiasters)
                throw new InvalidOperationException("Transfer exceeds your daily limit.");

            // Check Idempotency — prevent double-spend
            var existingTx = await _db.Transactions.Find(session, t => t.IdempotencyKey == idempotencyKey).FirstOrDefaultAsync(ct);
            if (existingTx != null)
            {
                await session.AbortTransactionAsync(ct);
                return (existingTx, null);
            }

            // Atomic debit from sender
            var fromUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, -amountPiasters)
                .Inc(w => w.DailyTransferredPiasters, amountPiasters)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            var fromResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session, 
                w => w.Id == fromWallet.Id && w.BalancePiasters >= amountPiasters, 
                fromUpdate, new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            if (fromResult == null)
                throw new InvalidOperationException("Transaction failed due to state change (insufficient funds).");

            // Atomic credit to receiver
            var toUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, amountPiasters)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            var toResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session, 
                w => w.Id == toWallet.Id, 
                toUpdate, new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            if (toResult == null)
                throw new InvalidOperationException("Transaction failed while updating destination wallet.");

            var refCode = _validationService.GenerateReferenceCode();
            var transaction = new Transaction
            {
                IdempotencyKey = idempotencyKey,
                ReferenceCode = refCode,
                Type = WalletTransactionType.Transfer,
                Status = WalletTransactionStatus.Completed,
                AmountPiasters = amountPiasters,
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

            return (transaction, null);
        }
        catch (InvalidOperationException ex)
        {
            await session.AbortTransactionAsync(ct);
            return (null, ex.Message);
        }
        catch (MongoCommandException ex)
        {
            await session.AbortTransactionAsync(ct);
            _logger.LogError(ex, "MongoDB Transaction failed. Verify that MongoDB is running as a Replica Set.");
            return (null, "System error during transfer. Our engineers have been notified.");
        }
        catch (Exception ex)
        {
            await session.AbortTransactionAsync(ct);
            _logger.LogError(ex, "Unexpected error during wallet transfer.");
            return (null, "An unexpected error occurred during the transfer.");
        }
    }

    public async Task<(Transaction? transaction, string? error)> AdminTopUpAsync(string targetPhone, decimal amountEGP, string note, Guid adminId, string ipAddress, CancellationToken ct = default)
    {
        long amountPiasters = (long)(amountEGP * 100);
        
        if (amountPiasters <= 0)
            return (null, "Top-up amount must be greater than zero.");

        if (!_validationService.IsValidEgyptianNumber(targetPhone))
            return (null, "Invalid target phone number.");

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

            var toResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session, w => w.Id == toWallet.Id, toUpdate, new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);
            
            if (toResult == null)
                throw new InvalidOperationException("Failed to update destination wallet.");

            var refCode = _validationService.GenerateReferenceCode();
            var transaction = new Transaction
            {
                IdempotencyKey = Guid.NewGuid(),
                ReferenceCode = refCode,
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
        catch (InvalidOperationException ex)
        {
            await session.AbortTransactionAsync(ct);
            return (null, ex.Message);
        }
        catch (Exception ex)
        {
            await session.AbortTransactionAsync(ct);
            _logger.LogError(ex, "Admin top-up failed.");
            return (null, "System error during top-up.");
        }
    }

    /// <summary>
    /// Get paginated transaction history for a wallet (both sent and received).
    /// </summary>
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
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(ct);

        var dtos = items.Select(t => new TransactionDto(
            t.ReferenceCode,
            t.Type.ToString(),
            t.ToWalletId.HasValue && t.ToWalletId.Value == walletId ? "Received" : "Sent",
            t.AmountPiasters / 100m,
            t.ToWalletId.HasValue && t.ToWalletId.Value == walletId ? (t.FromPhone ?? "System") : t.ToPhone!,
            t.Note,
            t.Status.ToString(),
            t.CreatedAt
        )).ToList();

        return (dtos, totalCount);
    }

    /// <summary>
    /// Get all wallets (admin-only, paginated) with basic stats.
    /// </summary>
    public async Task<(List<Wallet> items, long totalCount)> GetAllWalletsAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var filter = Builders<Wallet>.Filter.Empty;
        var totalCount = await _db.Wallets.CountDocumentsAsync(filter, cancellationToken: ct);

        var items = await _db.Wallets.Find(filter)
            .SortByDescending(w => w.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    /// <summary>
    /// Reset daily transfer counters for all wallets. Called by WalletBackgroundService at midnight Cairo time.
    /// </summary>
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

