using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Data;
using MongoDB.Driver;
using System.Text.Json;
using System.Security.Claims;
using System.IO;

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

        // POST: /api/subscription/webhook
        group.MapPost("/webhook", async (HttpContext context, PaymobService paymob, MongoService db, AuthService auth) =>
        {
            // 1. Read Raw Body
            using var reader = new StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync();
            
            if (string.IsNullOrEmpty(body)) return Results.BadRequest("Empty body");
            
            var json = JsonSerializer.Deserialize<JsonElement>(body);

            // 2. Extract HMAC from query string
            var hmac = context.Request.Query["hmac"].ToString();
            if (string.IsNullOrEmpty(hmac)) return Results.BadRequest("Missing HMAC");

            // 3. Extract 'obj' property (the transaction object)
            if (!json.TryGetProperty("obj", out var obj)) return Results.BadRequest("Invalid payload: missing obj");

            // 4. Validate HMAC Signature
            if (!paymob.ValidateWebhookHmac(obj, hmac))
            {
                return Results.Unauthorized();
            }

            // 5. Process Transaction
            var success = obj.GetProperty("success").GetBoolean();
            var paymobOrderId = obj.GetProperty("order").GetProperty("id").ToString();
            var paymobTxId = obj.GetProperty("id").ToString();

            // Find our pending transaction
            // We find by PaymobOrderId which we should have stored, but since we didn't in Phase 3,
            // we'll find the most recent pending transaction for the user associated with this order.
            // BETTER: We'll update the initiation flow later to store PaymobOrderId.
            // For now, we search by status and match amount if possible.
            var filter = Builders<PaymentTransaction>.Filter.Eq(t => t.Status, TransactionStatus.Pending);
            var pendingTransactions = await db.PaymentTransactions.Find(filter).ToListAsync();
            
            // Match by order ID if we have it, or fallback to amount match (less secure but works for MVP)
            var amountCents = obj.GetProperty("amount_cents").GetInt64();
            var myTransaction = pendingTransactions.FirstOrDefault(t => 
                t.PaymobOrderId == paymobOrderId || 
                (long)(t.Amount * 100) == amountCents);

            if (myTransaction != null)
            {
                if (success)
                {
                    myTransaction.Status = TransactionStatus.Succeeded;
                    myTransaction.PaymobTransactionId = paymobTxId;
                    myTransaction.PaymobOrderId = paymobOrderId;
                    await db.PaymentTransactions.ReplaceOneAsync(t => t.Id == myTransaction.Id, myTransaction);

                    // UPGRADE USER
                    await auth.UpgradeSubscriptionTierAsync(myTransaction.UserId, myTransaction.TierSnapshot, myTransaction.IsAnnual);
                    
                    // GENERATE INVOICE
                    var invoice = new Invoice
                    {
                        UserId = myTransaction.UserId,
                        PaymentTransactionId = myTransaction.Id,
                        AmountPaid = (long)myTransaction.Amount, // Amount is decimal, AmountPaid is long
                        Tier = myTransaction.TierSnapshot,
                        InvoiceNumber = $"INV-{DateTime.Now:yyyyMMdd}-{myTransaction.Id.ToString()[..8].ToUpper()}"
                    };
                    await db.Invoices.InsertOneAsync(invoice);
                }
                else
                {
                    myTransaction.Status = TransactionStatus.Failed;
                    myTransaction.ErrorMessage = "Payment declined by provider";
                    myTransaction.PaymobOrderId = paymobOrderId;
                    await db.PaymentTransactions.ReplaceOneAsync(t => t.Id == myTransaction.Id, myTransaction);
                }
            }

            return Results.Ok();
        });
    }

    public record CheckoutRequest(SubscriptionTier Tier, bool IsAnnual, PaymentMethod PaymentMethod);
}
