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

            return Results.Ok(new { message = "Wallet created successfully", walletId = wallet!.Id });
        });

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

            // Notify Sender
            await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, userId.ToString(), new {
                balanceEgp = transaction!.BalanceAfterSenderPiasters / 100m
            });

            // Notify Receiver
            if (transaction.ToWalletId.HasValue)
            {
                var receiverWallet = await walletService.GetWalletByPhoneAsync(req.ToPhone);
                if (receiverWallet != null)
                {
                    await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, receiverWallet.UserId.ToString(), new {
                        balanceEgp = transaction.BalanceAfterReceiverPiasters / 100m
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

        group.MapGet("/transactions", async (
            int page,
            int limit,
            ClaimsPrincipal user,
            SessionFlow.Desktop.Data.MongoService db) =>
        {
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // We need to fetch the user's wallet ID first
            var wallet = await db.Wallets.Find(w => w.UserId == userId).FirstOrDefaultAsync();
            if (wallet == null)
                return Results.Ok(new { items = Array.Empty<TransactionDto>(), total = 0, page, limit });

            var filter = Builders<Transaction>.Filter.Or(
                Builders<Transaction>.Filter.Eq(t => t.FromWalletId, wallet.Id),
                Builders<Transaction>.Filter.Eq(t => t.ToWalletId, wallet.Id)
            );

            var total = await db.Transactions.CountDocumentsAsync(filter);
            
            var items = await db.Transactions.Find(filter)
                .SortByDescending(t => t.CreatedAt)
                .Skip((page - 1) * limit)
                .Limit(limit)
                .ToListAsync();

            var dtos = items.Select(t => new TransactionDto(
                t.ReferenceCode,
                t.Type.ToString(),
                t.ToWalletId == wallet.Id ? "Inbound" : "Outbound",
                t.AmountPiasters / 100m,
                t.ToWalletId == wallet.Id ? (t.FromPhone ?? "System") : t.ToPhone!,
                t.Note,
                t.Status.ToString(),
                t.CreatedAt
            ));

            return Results.Ok(new { items = dtos, total, page, limit });
        });

        // Admin Endpoints
        var adminGroup = app.MapGroup("/api/wallet/admin").RequireAuthorization("AdminOnly");

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

            // Notify Receiver
            if (transaction!.ToWalletId.HasValue)
            {
                var receiverWallet = await walletService.GetWalletByPhoneAsync(req.TargetPhone);
                if (receiverWallet != null)
                {
                    await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, receiverWallet.UserId.ToString(), new {
                        balanceEgp = transaction.BalanceAfterReceiverPiasters / 100m
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
    }
}
