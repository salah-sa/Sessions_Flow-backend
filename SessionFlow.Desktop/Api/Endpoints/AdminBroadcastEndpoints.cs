using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Services.EventBus;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

/// <summary>
/// Admin broadcast endpoints.
/// POST /api/admin/broadcast          — send a custom message to all users
/// POST /api/admin/broadcast/test-email — synchronous email health-check for diagnosis
/// GET  /api/admin/broadcast/history  — paginated history of past broadcasts
/// </summary>
public static class AdminBroadcastEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/admin/broadcast").RequireAuthorization("AdminOnly");

        // ── Send broadcast ────────────────────────────────────────────────
        group.MapPost("/", async (
            BroadcastRequest req,
            ClaimsPrincipal principal,
            MongoService db,
            NotificationService notificationService,
            ResendEmailService resend,
            IEventBus eventBus,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var adminId))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.Subject) || req.Subject.Length > 5000)
                return Results.BadRequest(new { error = "Subject must be between 1 and 5000 characters." });

            if (string.IsNullOrWhiteSpace(req.Message) || req.Message.Length > 2000)
                return Results.BadRequest(new { error = "Message must be between 1 and 2000 characters." });

            var channel = req.Channel?.ToUpperInvariant() switch
            {
                "EMAIL" => "Email",
                "BOTH"  => "Both",
                _       => "InApp"
            };

            var sanitizedMessage = req.Message.Trim();
            var sanitizedSubject = req.Subject.Trim();

            // Get all approved users (active accounts)
            var users = await db.Users
                .Find(u => u.IsApproved)
                .Project(u => new { u.Id, u.Email, u.Name })
                .ToListAsync(ct);

            var broadcast = new SystemBroadcast
            {
                IsCustomMessage    = true,
                CustomSubject      = sanitizedSubject,
                CustomMessage      = sanitizedMessage,
                Channel            = channel,
                RecipientCount     = users.Count,
                BroadcastedBy      = adminId,
                CreatedAt          = DateTimeOffset.UtcNow
            };

            await db.SystemBroadcasts.InsertOneAsync(broadcast, cancellationToken: ct);

            // ── In-App Notifications (persisted per-user) ─────────────────
            if (channel is "InApp" or "Both")
            {
                var tasks = users.Select(u =>
                    notificationService.CreateNotificationAsync(
                        u.Id,
                        sanitizedSubject,       // ✔ use real subject, not hardcoded
                        sanitizedMessage,
                        NotificationType.Info));

                await Task.WhenAll(tasks);
            }

            // ── Real-Time Broadcast Push (instant popup for all clients) ──
            // Published ALWAYS so every logged-in browser shows the modal popup
            // immediately — regardless of channel selection.
            await eventBus.PublishAsync(Events.BroadcastMessage, EventTargetType.All, "*", new
            {
                subject = sanitizedSubject,
                message = sanitizedMessage,
                channel
            });

            // ── Email ─────────────────────────────────────────────────────
            // NOTE: resend (ResendEmailService) is a SINGLETON — safe to use
            // inside Task.Run after the HTTP request scope is disposed.
            if (channel is "Email" or "Both")
            {
                _ = Task.Run(async () =>
                {
                    if (!resend.IsConfigured)
                    {
                        Serilog.Log.Error("[Broadcast] ❌ RESEND_API_KEY is NOT SET. Add it in Railway → Variables → redeploy.");
                        return;
                    }

                    int sent = 0, failed = 0;
                    foreach (var u in users)
                    {
                        try
                        {
                            var emailSubject = $"📢 {sanitizedSubject}";
                            var html = $@"
                                <div style='font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;'>
                                    <h2 style='color:#38bdf8;margin:0 0 16px;'>📢 {System.Web.HttpUtility.HtmlEncode(sanitizedSubject)}</h2>
                                    <p style='font-size:15px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;'>{System.Web.HttpUtility.HtmlEncode(sanitizedMessage)}</p>
                                    <hr style='border:none;border-top:1px solid #1e293b;margin:24px 0;'/>
                                    <p style='font-size:11px;color:#475569;'>This message was sent by the SessionFlow admin team.</p>
                                </div>";

                            var (ok, err) = await resend.SendAsync(u.Email, emailSubject, html);

                            if (ok) sent++;
                            else { failed++; Serilog.Log.Warning("[Broadcast] ❌ {Email}: {Error}", u.Email, err); }
                        }
                        catch (Exception ex)
                        {
                            failed++;
                            Serilog.Log.Error(ex, "[Broadcast] ❌ Exception → {Email}", u.Email);
                        }
                    }

                    Serilog.Log.Information("[Broadcast] ✅ Done. Sent={Sent} Failed={Failed} Total={Total}", sent, failed, users.Count);
                }, CancellationToken.None);
            }


            return Results.Ok(new
            {
                broadcastId    = broadcast.Id,
                recipientCount = users.Count,
                channel
            });
        });

        // ── Email Health Check ────────────────────────────────────────────
        // POST /api/admin/broadcast/test-email
        // Sends ONE real email synchronously and returns the exact Resend API result.
        // Use this to diagnose: missing RESEND_API_KEY, DNS/DKIM problems, or Gmail spam.
        group.MapPost("/test-email", async (
            TestEmailRequest req,
            ResendEmailService resend,
            ClaimsPrincipal principal,
            ILogger<Program> logger) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out _))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.To) || !req.To.Contains('@'))
                return Results.BadRequest(new { error = "A valid email address is required." });

            // ── Immediate failure: no API key ───────────────────────────
            if (!resend.IsConfigured)
            {
                logger.LogError("[TestEmail] RESEND_API_KEY is NOT configured on this server.");
                return Results.Ok(new
                {
                    success = false,
                    to      = req.To,
                    error   = "RESEND_API_KEY environment variable is NOT set on the server.",
                    hint    = "Go to Railway dashboard → your service → Variables → add RESEND_API_KEY → redeploy."
                });
            }

            logger.LogInformation("[TestEmail] Sending diagnostic email to {To}", req.To);

            var html = """
                <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
                  <h2 style="color:#7c3aed;margin-bottom:8px">✅ SessionFlow Email Diagnostic</h2>
                  <p style="color:#374151">This is a test email confirming that the Resend API is correctly configured for <strong>sessionflow.uk</strong>.</p>
                  <p style="color:#6b7280;font-size:13px;margin-top:16px">If you received this, email delivery is working. Check your spam folder if broadcasts are not arriving.</p>
                  <hr style="margin:24px 0;border-color:#e5e7eb"/>
                  <p style="color:#9ca3af;font-size:11px">Sent from SessionFlow Admin Panel — DO NOT REPLY</p>
                </div>
                """;

            var (success, error) = await resend.SendAsync(req.To, "✅ SessionFlow Email Diagnostic", html);

            if (success)
                logger.LogInformation("[TestEmail] ✅ Delivered to {To}", req.To);
            else
                logger.LogError("[TestEmail] ❌ Failed to deliver to {To}: {Error}", req.To, error);

            return Results.Ok(new
            {
                success,
                to    = req.To,
                error = success ? null : error,
                hint  = success
                    ? "✅ Email delivered — check inbox and spam folder."
                    : error != null && error.Contains("not configured")
                        ? "RESEND_API_KEY is missing on Railway. Add it in Railway → Variables."
                    : error != null && error.Contains("Sandbox")
                        ? "Domain not verified. Verify sessionflow.uk at resend.com/domains and add SPF/DKIM DNS records."
                    : "Check Railway Logs for the full Resend API error response."
            });
        });

        // ── History ───────────────────────────────────────────────────────
        group.MapGet("/history", async (
            MongoService db,
            int page = 1,
            int pageSize = 20,
            CancellationToken ct = default) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var total = await db.SystemBroadcasts.CountDocumentsAsync(_ => true, cancellationToken: ct);

            var broadcasts = await db.SystemBroadcasts
                .Find(_ => true)
                .SortByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync(ct);

            return Results.Ok(new
            {
                items = broadcasts.Select(b => new
                {
                    id              = b.Id,
                    isCustomMessage = b.IsCustomMessage,
                    subject         = b.CustomSubject ?? "System Announcement",
                    message         = b.IsCustomMessage ? b.CustomMessage : string.Join("; ", b.Notes),
                    channel         = b.Channel,
                    recipientCount  = b.RecipientCount,
                    emailCompleted  = b.EmailSendCompleted,
                    createdAt       = b.CreatedAt
                }),
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            });
        });
    }

    private record BroadcastRequest(string Subject, string Message, string? Channel);
    private record TestEmailRequest(string To);
}
