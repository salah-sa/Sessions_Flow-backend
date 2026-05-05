using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Services.EventBus;
using MongoDB.Driver;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class WalletEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/v1/wallet").RequireAuthorization();

        // ─── OTP / Phone Verification ────────────────────────────────────────

        group.MapPost("/send-otp", async (
            SendOtpRequest req,
            ClaimsPrincipal user,
            SessionFlow.Desktop.Data.MongoService db,
            OtpService otpService,
            HttpContext ctx) =>
        {
            if (string.IsNullOrWhiteSpace(req.Phone) || req.Phone.Length < 11)
                return Results.BadRequest(new { error = "Invalid phone number." });

            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var currentUser = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (currentUser == null) return Results.Unauthorized();

            var purpose = req.Purpose is "verify_phone" or "forgot_pin" ? req.Purpose : "verify_phone";
            var (code, error) = await otpService.GenerateOtpAsync(req.Phone, currentUser.Email, purpose);
            if (error != null) return Results.BadRequest(new { error });

            // OTP code is sent via email (Resend) — never returned to client
            return Results.Ok(new { message = "Verification code sent to your email." });
        });

        // POST /api/wallet/verify-phone  (OTP code from email/WhatsApp)
        group.MapPost("/verify-phone", async (
            VerifyPhoneRequest req,
            WalletService walletService,
            OtpService otpService,
            HttpContext ctx) =>
        {
            if (string.IsNullOrWhiteSpace(req.Phone) || string.IsNullOrWhiteSpace(req.Code))
                return Results.BadRequest(new { error = "Phone and verification code are required." });

            var (isValid, error) = await otpService.ValidateOtpAsync(req.Phone, "verify_phone", req.Code);
            if (!isValid)
                return Results.BadRequest(new { error = error ?? "Invalid verification code." });

            await walletService.MarkPhoneVerifiedAsync(req.Phone);
            return Results.Ok(new { message = "Phone verified successfully." });
        });

        // ─── Wallet CRUD ─────────────────────────────────────────────────────

        // GET /api/wallet/me
        group.MapGet("/me", async (
            ClaimsPrincipal user,
            WalletService walletService,
            HttpContext ctx) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null) return Results.NotFound(new { error = "No wallet found." });

            return Results.Ok(new WalletResponse(
                wallet.Id.ToString(), wallet.PhoneNumber,
                wallet.BalancePiasters / 100m,
                wallet.DailyTransferLimitPiasters / 100m,
                wallet.DailyTransferredPiasters / 100m,
                wallet.IsActive,
                wallet.IsPhoneVerified
            ));
        });

        // POST /api/wallet/create
        group.MapPost("/create", async (
            CreateWalletRequest req,
            ClaimsPrincipal user,
            OtpService otpService,
            WalletService walletService) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var (wallet, error) = await walletService.CreateWalletAsync(userId, req.PhoneNumber, req.Pin, isPhoneVerified: false);
            if (error != null) return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Wallet created. Please verify your phone to activate transfers.", walletId = wallet!.Id });
        });

        // POST /api/wallet/verify-pin
        group.MapPost("/verify-pin", async (
            VerifyPinRequest req,
            ClaimsPrincipal user,
            WalletService walletService) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null) return Results.NotFound(new { error = "Wallet not found." });

            var (valid, error, remaining, unlockAt) = await walletService.VerifyPinAsync(wallet.PhoneNumber, req.Pin);
            if (!valid) return Results.BadRequest(new { error, attemptsRemaining = remaining, lockedUntil = unlockAt });

            return Results.Ok(new { valid = true });
        });

        // ─── Forgot PIN ───────────────────────────────────────────────────────

        // POST /api/wallet/forgot-pin/send-otp
        group.MapPost("/forgot-pin/send-otp", async (
            ClaimsPrincipal user,
            SessionFlow.Desktop.Data.MongoService db,
            WalletService walletService,
            OtpService otpService) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var currentUser = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (currentUser == null) return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null) return Results.NotFound(new { error = "Wallet not found." });

            var (code, error) = await otpService.GenerateOtpAsync(wallet.PhoneNumber, currentUser.Email, "reset_pin");
            if (error != null) return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Verification code sent to your email." });
        });

        // POST /api/wallet/forgot-pin/reset  (OTP code verification)
        group.MapPost("/forgot-pin/reset", async (
            ForgotPinResetRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            OtpService otpService) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null) return Results.NotFound(new { error = "Wallet not found." });

            if (string.IsNullOrWhiteSpace(req.Code))
                return Results.BadRequest(new { error = "Verification code is required." });

            var (isValid, otpError) = await otpService.ValidateOtpAsync(wallet.PhoneNumber, "reset_pin", req.Code);
            if (!isValid)
                return Results.BadRequest(new { error = otpError ?? "Invalid verification code." });

            var (success, pinError) = await walletService.UpdatePinAsync(wallet.PhoneNumber, req.NewPin);
            if (!success) return Results.BadRequest(new { error = pinError });

            return Results.Ok(new { message = "PIN reset successfully. Please log in with your new PIN." });
        });

        // ─── Transfer ─────────────────────────────────────────────────────────

        // POST /api/wallet/transfer
        group.MapPost("/transfer", async (
            TransferRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            IEventBus eventBus,
            HttpContext ctx) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var fromWallet = await walletService.GetWalletByUserIdAsync(userId);
            if (fromWallet == null) return Results.NotFound(new { error = "Your wallet was not found." });
            if (!fromWallet.IsPhoneVerified)
                return Results.BadRequest(new { error = "Verify your phone number before making transfers." });

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (tx, feePiasters, error) = await walletService.TransferAsync(
                fromWallet.PhoneNumber, req.ToPhone, req.AmountEGP,
                req.Pin, req.Note, req.IdempotencyKey, userId, ip);

            if (error != null) return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.User, userId.ToString(), new { userId = userId.ToString() });
            await eventBus.PublishAsync(Events.WalletTransactionReceived, EventTargetType.User, userId.ToString(), new { reference = tx!.ReferenceCode });

            return Results.Ok(new TransferResponse(
                tx!.ReferenceCode, req.AmountEGP, feePiasters / 100m,
                req.ToPhone,
                tx.BalanceAfterSenderPiasters / 100m,
                tx.CompletedAt ?? DateTimeOffset.UtcNow
            ));
        });

        // GET /api/wallet/transactions?page=1&pageSize=20
        group.MapGet("/transactions", async (
            ClaimsPrincipal user,
            WalletService walletService,
            int page = 1, int pageSize = 20) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var wallet = await walletService.GetWalletByUserIdAsync(userId);
            if (wallet == null) return Results.NotFound(new { error = "Wallet not found." });

            var (items, total) = await walletService.GetTransactionsAsync(wallet.Id, page, pageSize);
            return Results.Ok(new { items, total, page, pageSize });
        });

        // ─── Deposit / Charge Wallet ──────────────────────────────────────────

        // POST /api/wallet/deposit/request
        group.MapPost("/deposit/request", async (
            CreateDepositRequest req,
            ClaimsPrincipal user,
            WalletService walletService) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var (deposit, error) = await walletService.CreateDepositRequestAsync(userId, req.AmountEGP, req.PaymentMethod);
            if (error != null) return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Deposit request submitted. Please contact admin for confirmation.", depositId = deposit!.Id });
        });

        // GET /api/wallet/deposit/my-requests
        group.MapGet("/deposit/my-requests", async (
            ClaimsPrincipal user,
            WalletService walletService) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            var list = await walletService.GetUserDepositRequestsAsync(userId);
            return Results.Ok(list.Select(d => new DepositRequestDto(
                d.Id.ToString(), d.AmountEGP, d.PaymentMethod.ToString(),
                d.TargetPaymentPhone, d.Status.ToString(),
                d.IsFirstDeposit, d.BonusPiasters / 100m,
                d.AdminNote, d.CreatedAt, d.ReviewedAt, null
            )));
        });

        // ─── Admin Endpoints ──────────────────────────────────────────────────

        var adminGroup = app.MapGroup("/api/v1/wallet/admin").RequireAuthorization("AdminOnly");

        // GET /api/wallet/admin/deposit/pending
        adminGroup.MapGet("/deposit/pending", async (
            WalletService walletService,
            SessionFlow.Desktop.Data.MongoService db) =>
        {
            var list = await walletService.GetPendingDepositRequestsAsync();
            if (list.Count == 0) return Results.Ok(Array.Empty<DepositRequestDto>());

            // Bulk-resolve user names in one query
            var userIds = list.Select(d => d.UserId).Distinct().ToList();
            var users = await db.Users.Find(u => userIds.Contains(u.Id)).ToListAsync();
            var nameMap = users.ToDictionary(u => u.Id, u => u.Name);

            return Results.Ok(list.Select(d => new DepositRequestDto(
                d.Id.ToString(), d.AmountEGP, d.PaymentMethod.ToString(),
                d.TargetPaymentPhone, d.Status.ToString(),
                d.IsFirstDeposit, d.BonusPiasters / 100m,
                d.AdminNote, d.CreatedAt, d.ReviewedAt,
                nameMap.TryGetValue(d.UserId, out var n) ? n : "Unknown"
            )));
        });

        // POST /api/wallet/admin/deposit/approve
        adminGroup.MapPost("/deposit/approve", async (
            AdminApproveDepositRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            IEventBus eventBus,
            HttpContext ctx) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var adminId))
                return Results.Unauthorized();

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (tx, error) = await walletService.ApproveDepositAsync(req.DepositRequestId, adminId, req.AdminNote, ip);
            if (error != null) return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Events.WalletDepositApproved, EventTargetType.All, "", new { depositId = req.DepositRequestId });
            await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.All, "", new { });

            return Results.Ok(new { message = "Deposit approved and wallet credited.", reference = tx!.ReferenceCode });
        });

        // POST /api/wallet/admin/deposit/reject
        adminGroup.MapPost("/deposit/reject", async (
            AdminRejectDepositRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            IEventBus eventBus) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var adminId))
                return Results.Unauthorized();

            var error = await walletService.RejectDepositAsync(req.DepositRequestId, adminId, req.AdminNote);
            if (error != null) return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Events.WalletDepositRejected, EventTargetType.All, "", new { depositId = req.DepositRequestId });
            return Results.Ok(new { message = "Deposit request rejected." });
        });

        // GET /api/wallet/admin/all?page=1&pageSize=20
        adminGroup.MapGet("/all", async (WalletService walletService, int page = 1, int pageSize = 20) =>
        {
            var (items, total) = await walletService.GetAllWalletsAsync(page, pageSize);
            return Results.Ok(new
            {
                total, page, pageSize,
                items = items.Select(w => new
                {
                    walletId = w.Id.ToString(), w.PhoneNumber,
                    balanceEGP = w.BalancePiasters / 100m,
                    w.IsActive, w.IsPhoneVerified, w.CreatedAt
                })
            });
        });

        // POST /api/wallet/admin/topup
        adminGroup.MapPost("/topup", async (
            AdminTopUpRequest req,
            ClaimsPrincipal user,
            WalletService walletService,
            IEventBus eventBus,
            HttpContext ctx) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var adminId))
                return Results.Unauthorized();

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (tx, error) = await walletService.AdminTopUpAsync(req.TargetPhone, req.AmountEGP, req.Note, adminId, ip);
            if (error != null) return Results.BadRequest(new { error });

            await eventBus.PublishAsync(Events.WalletBalanceUpdated, EventTargetType.All, "", new { });
            return Results.Ok(new { message = "Wallet topped up.", reference = tx!.ReferenceCode });
        });
    }
}
