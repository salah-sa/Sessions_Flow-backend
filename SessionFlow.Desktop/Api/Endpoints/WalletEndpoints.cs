using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Services.EventBus;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class WalletEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/wallet").RequireAuthorization();

        // ═══════════════════════════════════════════════
        // POST /api/wallet/create
        // ═══════════════════════════════════════════════
        group.MapPost("/create", async (
            [FromBody] CreateWalletRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            ILogger<WalletService> logger) =>
        {
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var (wallet, error) = await walletService.CreateWalletAsync(userId, req.PhoneNumber, req.Pin);
            
            if (error != null)
                return Results.BadRequest(new { error });

            return Results.Created($"/api/wallet/me", new {
                walletId = wallet!.Id.ToString(),
                phoneNumber = wallet.PhoneNumber,
                balance = 0.00m,
                createdAt = wallet.CreatedAt
            });
        });

        // ═══════════════════════════════════════════════
        // GET /api/wallet/me
        // ═══════════════════════════════════════════════
        group.MapGet("/me", async (
            ClaimsPrincipal user,
            WalletService walletService) =>
        {
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null)
                return Results.NotFound(new { error = "Wallet not found." });

            var response = new WalletResponse(
                wallet.Id.ToString(),
                wallet.PhoneNumber,
                wallet.BalancePiasters / 100m,
                wallet.DailyTransferLimitPiasters / 100m,
                wallet.DailyTransferredPiasters / 100m,
                wallet.IsActive
            );

            return Results.Ok(response);
        });

        // ═══════════════════════════════════════════════
        // POST /api/wallet/verify-pin
        // ═══════════════════════════════════════════════
        group.MapPost("/verify-pin", async (
            [FromBody] VerifyPinRequest req,
            ClaimsPrincipal user,
            WalletService walletService) =>
        {
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null)
                return Results.NotFound(new { error = "Wallet not found." });

            var (isValid, error, attemptsRemaining, unlockAt) = await walletService.VerifyPinAsync(wallet.PhoneNumber, req.Pin);

            if (unlockAt.HasValue)
            {
                return Results.Json(new { locked = true, unlockAt = unlockAt.Value }, statusCode: 429);
            }

            if (!isValid)
            {
                return Results.Json(new { valid = false, attemptsRemaining = attemptsRemaining ?? 0 }, statusCode: 401);
            }

            return Results.Ok(new { valid = true });
        });

        // ═══════════════════════════════════════════════
        // POST /api/wallet/transfer
        // ═══════════════════════════════════════════════
        group.MapPost("/transfer", async (
            [FromBody] TransferRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            IEventBus eventBus,
            HttpContext context) =>
        {
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var fromWallet = await walletService.GetWalletByUserIdAsync(userId);
            if (fromWallet == null)
                return Results.BadRequest(new { error = "You do not have a wallet." });

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

            var (transaction, error) = await walletService.TransferAsync(
                fromWallet.PhoneNumber, req.ToPhone, req.AmountEGP, req.Pin, req.Note, req.IdempotencyKey, userId, ipAddress);

            if (error != null)
                return Results.BadRequest(new { error });

            // Notify Sender via real-time
            await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, userId.ToString(), new {
                balanceEgp = transaction!.BalanceAfterSenderPiasters / 100m,
                transactionRef = transaction.ReferenceCode
            });

            // Notify Receiver via real-time
            if (transaction.ToWalletId.HasValue)
            {
                var receiverWallet = await walletService.GetWalletByPhoneAsync(req.ToPhone);
                if (receiverWallet != null)
                {
                    await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, receiverWallet.UserId.ToString(), new {
                        balanceEgp = transaction.BalanceAfterReceiverPiasters / 100m,
                        transactionRef = transaction.ReferenceCode
                    });

                    await eventBus.PublishAsync(Events.WalletTransactionReceived, EventTargetType.User, receiverWallet.UserId.ToString(), new {
                        amountEgp = req.AmountEGP,
                        fromPhone = fromWallet.PhoneNumber,
                        note = req.Note,
                        referenceCode = transaction.ReferenceCode
                    });
                }
            }

            var response = new TransferResponse(
                transaction!.ReferenceCode,
                req.AmountEGP,
                req.ToPhone,
                transaction.BalanceAfterSenderPiasters / 100m,
                transaction.CompletedAt ?? DateTimeOffset.UtcNow
            );

            return Results.Ok(response);
        });

        // ═══════════════════════════════════════════════
        // GET /api/wallet/transactions?page=1&pageSize=20
        // ═══════════════════════════════════════════════
        group.MapGet("/transactions", async (
            int page,
            int pageSize,
            ClaimsPrincipal user,
            WalletService walletService) =>
        {
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null)
                return Results.Ok(new { items = Array.Empty<TransactionDto>(), totalCount = 0L, page, pageSize });

            // Clamp pageSize to prevent abuse
            pageSize = Math.Clamp(pageSize, 1, 100);

            var (items, totalCount) = await walletService.GetTransactionsAsync(wallet.Id, page, pageSize);

            return Results.Ok(new { items, totalCount, page, pageSize });
        });

        // ═══════════════════════════════════════════════
        // ADMIN ENDPOINTS
        // ═══════════════════════════════════════════════
        var adminGroup = app.MapGroup("/api/wallet/admin").RequireAuthorization("AdminOnly");

        // POST /api/wallet/admin/topup
        adminGroup.MapPost("/topup", async (
            [FromBody] AdminTopUpRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            IEventBus eventBus,
            HttpContext context) =>
        {
            var adminIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminIdStr) || !Guid.TryParse(adminIdStr, out var adminId))
                return Results.Unauthorized();

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

            var (transaction, error) = await walletService.AdminTopUpAsync(
                req.TargetPhone, req.AmountEGP, req.Note, adminId, ipAddress);

            if (error != null)
                return Results.BadRequest(new { error });

            // Notify Receiver via real-time
            if (transaction!.ToWalletId.HasValue)
            {
                var receiverWallet = await walletService.GetWalletByPhoneAsync(req.TargetPhone);
                if (receiverWallet != null)
                {
                    await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, receiverWallet.UserId.ToString(), new {
                        balanceEgp = transaction.BalanceAfterReceiverPiasters / 100m,
                        transactionRef = transaction.ReferenceCode
                    });

                    await eventBus.PublishAsync(Events.WalletTransactionReceived, EventTargetType.User, receiverWallet.UserId.ToString(), new {
                        amountEgp = req.AmountEGP,
                        fromPhone = "Admin Top-Up",
                        note = req.Note,
                        referenceCode = transaction.ReferenceCode
                    });
                }
            }

            return Results.Ok(new {
                message = "Top-up successful.",
                referenceCode = transaction.ReferenceCode,
                newBalanceEgp = transaction.BalanceAfterReceiverPiasters / 100m
            });
        });

        // GET /api/wallet/admin/all?page=1&pageSize=50
        adminGroup.MapGet("/all", async (
            int page,
            int pageSize,
            WalletService walletService) =>
        {
            pageSize = Math.Clamp(pageSize, 1, 100);

            var (wallets, totalCount) = await walletService.GetAllWalletsAsync(page, pageSize);

            var items = wallets.Select(w => new {
                walletId = w.Id.ToString(),
                userId = w.UserId.ToString(),
                phoneNumber = w.PhoneNumber,
                balanceEgp = w.BalancePiasters / 100m,
                dailyLimitEgp = w.DailyTransferLimitPiasters / 100m,
                dailyUsedEgp = w.DailyTransferredPiasters / 100m,
                isActive = w.IsActive,
                createdAt = w.CreatedAt
            });

            return Results.Ok(new { items, totalCount, page, pageSize });
        });
    }
}
