using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

/// <summary>
/// Wallet-based subscription checkout endpoints.
/// POST /api/subscription/wallet-eligibility — check if user can afford a plan
/// POST /api/subscription/wallet-checkout     — debit wallet and activate plan
/// </summary>
public static class WalletSubscriptionEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/subscription").RequireAuthorization();

        // ── Eligibility pre-check ────────────────────────────────────────
        group.MapPost("/wallet-eligibility", async (
            EligibilityRequest req,
            ClaimsPrincipal principal,
            WalletSubscriptionService service,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            if (!Enum.TryParse<SubscriptionTier>(req.Tier, true, out var tier))
                return Results.BadRequest(new { error = "Invalid subscription tier." });

            var result = await service.CheckEligibilityAsync(userId, tier, req.IsAnnual, ct);

            return Results.Ok(new
            {
                eligible         = result.Eligible,
                balanceEgp       = result.BalancePiasters / 100m,
                requiredEgp      = result.RequiredPiasters / 100m,
                shortfallEgp     = result.ShortfallPiasters / 100m,
                error            = result.Error
            });
        });

        // ── Checkout ─────────────────────────────────────────────────────
        group.MapPost("/wallet-checkout", async (
            CheckoutRequest req,
            ClaimsPrincipal principal,
            WalletSubscriptionService service,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();

            if (!Enum.TryParse<SubscriptionTier>(req.Tier, true, out var tier))
                return Results.BadRequest(new { error = "Invalid subscription tier." });

            var result = await service.CheckoutAsync(userId, tier, req.IsAnnual, ct);

            if (!result.Success)
                return Results.Json(
                    new { success = false, error = result.Error },
                    statusCode: 402);   // 402 Payment Required

            return Results.Ok(new
            {
                success        = true,
                newBalanceEgp  = result.NewBalancePiasters / 100m,
                tier           = tier.ToString()
            });
        });
    }

    private record EligibilityRequest(string Tier, bool IsAnnual);
    private record CheckoutRequest(string Tier, bool IsAnnual);
}
