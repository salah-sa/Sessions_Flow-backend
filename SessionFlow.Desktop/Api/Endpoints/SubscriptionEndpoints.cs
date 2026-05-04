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

            // Look up real subscription for ALL users (including Admin)
            var subscription = await db.Subscriptions
                .Find(s => s.UserId == user.Id && s.Status == SubscriptionStatus.Active)
                .SortByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            // Resolve tier: Admin always maps to Enterprise
            var effectiveTier = user.Role == UserRole.Admin
                ? "Enterprise"
                : user.SubscriptionTier.ToString();

            // Resolve expiry: use real subscription period if available,
            // otherwise synthesize from last-update + 30 days for paid tiers.
            DateTimeOffset? expiryDate = subscription?.CurrentPeriodEnd;
            if (expiryDate == null && user.SubscriptionTier != SubscriptionTier.Free)
            {
                expiryDate = user.UpdatedAt.AddDays(30);
            }

            return Results.Ok(new
            {
                tier = effectiveTier,
                paymobCustomerId = user.PaymobCustomerId,
                subscriptionId = subscription?.Id,
                status = subscription?.Status.ToString() ?? (user.Role == UserRole.Admin ? "Active" : "None"),
                expiryDate,
                canUpgrade = user.Role != UserRole.Admin && user.SubscriptionTier != SubscriptionTier.Enterprise
            });
        }).RequireAuthorization();

        // GET: /api/subscription/plans — Dynamic pricing from Settings
        group.MapGet("/plans", async (MongoService db) =>
        {
            var settings = await db.Settings.Find(_ => true).ToListAsync();
            string V(string key, string fallback = "") =>
                settings.FirstOrDefault(s => s.Key == key)?.Value ?? fallback;

            var plans = new[]
            {
                new {
                    name = "Free",
                    tier = "Free",
                    description = V(BusinessConstants.Settings.SubDescriptionFree, "Perfect for getting started."),
                    priceMonthly = "EGP 0",
                    priceAnnual = "EGP 0",
                    priceMonthlyRaw = 0,
                    priceAnnualRaw = 0,
                    features = ParseFeatures(V(BusinessConstants.Settings.SubFeaturesFreePlan,
                        "[\"Up to 10 Groups\",\"15 Daily Messages\",\"1 Daily Image\",\"Basic Attendance\",\"Community Support\"]")),
                    popular = false,
                    color = "from-slate-400 to-slate-600",
                    bgClass = "bg-white/[0.02] hover:bg-white/[0.05]",
                    borderClass = "border-white/10",
                    buttonText = "Current Plan",
                    buttonVariant = "outline"
                },
                new {
                    name = "Pro",
                    tier = "Pro",
                    description = V(BusinessConstants.Settings.SubDescriptionPro, "For professional engineers who need scale."),
                    priceMonthly = $"EGP {V(BusinessConstants.Settings.SubPriceProMonthly, "50")}",
                    priceAnnual = $"EGP {V(BusinessConstants.Settings.SubPriceProAnnual, "528")}",
                    priceMonthlyRaw = int.TryParse(V(BusinessConstants.Settings.SubPriceProMonthly, "50"), out var pm) ? pm : 50,
                    priceAnnualRaw = int.TryParse(V(BusinessConstants.Settings.SubPriceProAnnual, "528"), out var pa) ? pa : 528,
                    features = ParseFeatures(V(BusinessConstants.Settings.SubFeaturesProPlan,
                        "[\"15 Groups\",\"Unlimited Messages\",\"4 Daily Images\",\"Voice Calls\",\"Priority Support\",\"Data Export\"]")),
                    popular = true,
                    color = "from-[var(--ui-accent)] to-purple-500",
                    bgClass = "bg-[var(--ui-accent)]/5 hover:bg-[var(--ui-accent)]/10",
                    borderClass = "border-[var(--ui-accent)]/30",
                    buttonText = "Upgrade to Pro",
                    buttonVariant = "primary"
                },
                new {
                    name = "Ultra",
                    tier = "Ultra",
                    description = V(BusinessConstants.Settings.SubDescriptionUltra, "Maximum power for high-volume educators."),
                    priceMonthly = $"EGP {V(BusinessConstants.Settings.SubPriceUltraMonthly, "100")}",
                    priceAnnual = $"EGP {V(BusinessConstants.Settings.SubPriceUltraAnnual, "1056")}",
                    priceMonthlyRaw = int.TryParse(V(BusinessConstants.Settings.SubPriceUltraMonthly, "100"), out var um) ? um : 100,
                    priceAnnualRaw = int.TryParse(V(BusinessConstants.Settings.SubPriceUltraAnnual, "1056"), out var ua) ? ua : 1056,
                    features = ParseFeatures(V(BusinessConstants.Settings.SubFeaturesUltraPlan,
                        "[\"30 Groups\",\"12 Daily Images\",\"5 Daily Videos\",\"10 Daily Files\",\"AI Summaries\",\"Advanced Analytics\"]")),
                    popular = false,
                    color = "from-purple-500 to-pink-500",
                    bgClass = "bg-purple-500/5 hover:bg-purple-500/10",
                    borderClass = "border-purple-500/30",
                    buttonText = "Upgrade to Ultra",
                    buttonVariant = "primary"
                },
                new {
                    name = "Enterprise",
                    tier = "Enterprise",
                    description = V(BusinessConstants.Settings.SubDescriptionEnterprise, "White-glove service for institutions."),
                    priceMonthly = $"EGP {V(BusinessConstants.Settings.SubPriceEnterpriseMonthly, "130")}",
                    priceAnnual = $"EGP {V(BusinessConstants.Settings.SubPriceEnterpriseAnnual, "1380")}",
                    priceMonthlyRaw = int.TryParse(V(BusinessConstants.Settings.SubPriceEnterpriseMonthly, "130"), out var em) ? em : 130,
                    priceAnnualRaw = int.TryParse(V(BusinessConstants.Settings.SubPriceEnterpriseAnnual, "1380"), out var ea) ? ea : 1380,
                    features = ParseFeatures(V(BusinessConstants.Settings.SubFeaturesEnterprisePlan,
                        "[\"Everything in Ultra\",\"Admin Portal\",\"Custom Features\",\"Account Manager\",\"White-labeled Reports\"]")),
                    popular = false,
                    color = "from-amber-400 to-orange-500",
                    bgClass = "bg-amber-500/5 hover:bg-amber-500/10",
                    borderClass = "border-amber-500/30",
                    buttonText = "Contact Sales",
                    buttonVariant = "outline"
                }
            };

            return Results.Ok(plans);
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
        group.MapPost("/webhook", async (HttpContext context, PaymobService paymob, MongoService db, AuthService auth, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus) =>
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
                    
                    // EMIT REAL-TIME TIER CHANGE EVENT
                    _ = eventBus.PublishAsync(
                        SessionFlow.Desktop.Services.EventBus.Events.SubscriptionChanged,
                        SessionFlow.Desktop.Services.EventBus.EventTargetType.User,
                        myTransaction.UserId.ToString(),
                        new { userId = myTransaction.UserId.ToString(), newTier = myTransaction.TierSnapshot.ToString(), source = "paymob" });

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

    private static string[] ParseFeatures(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }
}
