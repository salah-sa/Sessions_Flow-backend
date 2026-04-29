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
            PinHash = BCrypt.Net.BCrypt.HashPassword(pin),
            BalancePiasters = 0,
            DailyTransferLimitPiasters = 10000000, // 100,000 EGP
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

    public async Task<(bool isValid, string? error)> VerifyPinAsync(string phone, string pin, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        var rateLimitKey = $"wallet_pin_attempts:{phone}";
        
        var attemptsStr = await db.StringGetAsync(rateLimitKey);
        int attempts = attemptsStr.HasValue ? int.Parse(attemptsStr!) : 0;

        if (attempts >= 5)
        {
            var ttl = await db.KeyTimeToLiveAsync(rateLimitKey);
            return (false, $"Too many failed attempts. Please try again in {ttl?.TotalMinutes:F0} minutes.");
        }

        var wallet = await GetWalletByPhoneAsync(phone, ct);
        if (wallet == null || !wallet.IsActive)
            return (false, "Wallet not found or is inactive.");

        bool isCorrect = BCrypt.Net.BCrypt.Verify(pin, wallet.PinHash);
        if (!isCorrect)
        {
            attempts++;
            await db.StringSetAsync(rateLimitKey, attempts, TimeSpan.FromMinutes(15));
            return (false, $"Invalid PIN. {5 - attempts} attempts remaining.");
        }

        // On success, clear the rate limit
        await db.KeyDeleteAsync(rateLimitKey);
        return (true, null);
    }

    public async Task<(Transaction? transaction, string? error)> TransferAsync(
        string fromPhone, string toPhone, decimal amountEGP, string pin, string? note, Guid idempotencyKey, Guid initiatorId, string ipAddress, CancellationToken ct = default)
    {
        if (fromPhone == toPhone)
            return (null, "Cannot transfer to the same wallet.");

        long amountPiasters = (long)(amountEGP * 100);
        
        if (!_validationService.IsValidAmount(amountPiasters))
            return (null, "Transfer amount must be between 0.01 EGP and 100,000 EGP.");

        var (pinValid, pinError) = await VerifyPinAsync(fromPhone, pin, ct);
        if (!pinValid) return (null, pinError);

        using var session = await _db.Client.StartSessionAsync(cancellationToken: ct);
        
        try
        {
            session.StartTransaction();

            // Fetch wallets outside of write lock first to check conditions, then we will use conditions in the Update command.
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

            // Check Idempotency
            var existingTx = await _db.Transactions.Find(session, t => t.IdempotencyKey == idempotencyKey).FirstOrDefaultAsync(ct);
            if (existingTx != null)
            {
                await session.AbortTransactionAsync(ct);
                return (existingTx, null);
            }

            var fromUpdate = Builders<Wallet>.Update
                .Inc(w => w.BalancePiasters, -amountPiasters)
                .Inc(w => w.DailyTransferredPiasters, amountPiasters)
                .Set(w => w.UpdatedAt, DateTimeOffset.UtcNow);

            var fromResult = await _db.Wallets.FindOneAndUpdateAsync<Wallet, Wallet>(session, 
                w => w.Id == fromWallet.Id && w.BalancePiasters >= amountPiasters, 
                fromUpdate, new FindOneAndUpdateOptions<Wallet, Wallet> { ReturnDocument = ReturnDocument.After }, ct);

            if (fromResult == null)
                throw new InvalidOperationException("Transaction failed due to state change (insufficient funds).");

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
                Note = note,
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
                IdempotencyKey = Guid.NewGuid(), // Admins get a new GUID
                ReferenceCode = refCode,
                Type = WalletTransactionType.AdminTopUp,
                Status = WalletTransactionStatus.Completed,
                AmountPiasters = amountPiasters,
                ToWalletId = toWallet.Id,
                ToPhone = targetPhone,
                BalanceAfterReceiverPiasters = toResult.BalancePiasters,
                Note = note,
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
}
