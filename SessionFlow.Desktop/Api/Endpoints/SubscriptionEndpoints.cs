using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Data;
using MongoDB.Driver;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SubscriptionEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/subscription");

        // GET: /api/subscription/status
        group.MapGet("/status", async (HttpContext ctx, AuthService auth, MongoService db) =>
        {
            var user = await auth.GetUserFromClaimsAsync(ctx.User);
            if (user == null) return Results.Unauthorized();

            var subscription = await db.Subscriptions
                .Find(s => s.UserId == user.Id && s.Status == SubscriptionStatus.Active)
                .SortByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            return Results.Ok(new
            {
                tier = user.SubscriptionTier.ToString(),
                paymobCustomerId = user.PaymobCustomerId,
                subscriptionId = subscription?.Id,
                status = subscription?.Status.ToString() ?? "None",
                expiryDate = subscription?.CurrentPeriodEnd,
                canUpgrade = user.SubscriptionTier != SubscriptionTier.Enterprise
            });
        }).RequireAuthorization();

        // POST: /api/subscription/checkout
        group.MapPost("/checkout", async (CheckoutRequest req, HttpContext ctx, AuthService auth, PaymobService paymob, MongoService db) =>
        {
            var user = await auth.GetUserFromClaimsAsync(ctx.User);
            if (user == null) return Results.Unauthorized();

            // 1. Validation: Prevent duplicate active subscriptions for same or lower tier
            if (user.SubscriptionTier >= req.Tier)
            {
                return Results.BadRequest(new { error = $"You are already on the {user.SubscriptionTier} tier or higher." });
            }

            // 2. Prepare Billing Data
            // Note: In a real app, these would come from the user's profile. 
            // We'll use defaults or user properties where available.
            var names = user.Name.Split(' ', 2);
            var firstName = names[0];
            var lastName = names.Length > 1 ? names[1] : "User";
            
            var amountCents = PlanLimit.GetPrice(req.Tier, req.IsAnnual);
            
            // 3. Initiate Paymob Flow
            try
            {
                var paymentKey = await paymob.InitiatePaymentAsync(
                    amountCents,
                    user.Email,
                    firstName,
                    lastName,
                    "01000000000", // Placeholder if phone not in User model
                    req.PaymentMethod
                );

                // 4. Log the transaction as Pending
                var transaction = new PaymentTransaction
                {
                    UserId = user.Id,
                    Amount = amountCents / 100.0m,
                    Currency = "EGP",
                    Method = req.PaymentMethod,
                    Status = TransactionStatus.Pending,
                    TierSnapshot = req.Tier,
                    IsAnnual = req.IsAnnual,
                    CreatedAt = DateTime.UtcNow
                };
                await db.PaymentTransactions.InsertOneAsync(transaction);

                // 5. Return the iframe URL
                var iframeUrl = paymob.GetIframeUrl(paymentKey);
                return Results.Ok(new { iframeUrl, transactionId = transaction.Id });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Payment initiation failed: {ex.Message}");
            }
        }).RequireAuthorization();
    }

    public record CheckoutRequest(SubscriptionTier Tier, bool IsAnnual, PaymentMethod PaymentMethod);
}
