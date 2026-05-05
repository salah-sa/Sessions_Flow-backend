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
/// POST /api/admin/broadcast/direct   — send a custom email to a single user by userId
/// POST /api/admin/broadcast/test-email — synchronous email health-check for diagnosis
/// GET  /api/admin/broadcast/history  — paginated history of past broadcasts
/// </summary>
public static class AdminBroadcastEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/v1/admin/broadcast").RequireAuthorization("AdminOnly");

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

            // Get all approved users that have a valid email address
            var users = await db.Users
                .Find(u => u.IsApproved && u.Email != null && u.Email != "")
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

            if (channel is "Email" or "Both")
            {
                // Capture broadcast ID + DB reference for background use.
                // MongoService is a SINGLETON — safe after scope disposal.
                // ResendEmailService is also SINGLETON.
                var broadcastId = broadcast.Id;

                _ = Task.Run(async () =>
                {
                    if (!resend.IsConfigured)
                    {
                        Serilog.Log.Error("[Broadcast] ❌ RESEND_API_KEY is NOT SET. Add it in Railway → Variables → redeploy.");
                        await db.SystemBroadcasts.UpdateOneAsync(
                            b => b.Id == broadcastId,
                            Builders<SystemBroadcast>.Update
                                .Set(b => b.EmailSendCompleted, true)
                                .Set(b => b.EmailError, "RESEND_API_KEY is not configured.")
                                .Set(b => b.EmailSentAt, DateTimeOffset.UtcNow));
                        return;
                    }

                    int sent = 0, failed = 0, skipped = 0;
                    foreach (var u in users)
                    {
                        // ── Guard: skip users with null/empty/invalid email ──
                        if (string.IsNullOrWhiteSpace(u.Email) || !u.Email.Contains('@'))
                        {
                            skipped++;
                            Serilog.Log.Warning("[Broadcast] ⏭️ Skipped user {Name} (Id={Id}) — no valid email", u.Name, u.Id);
                            continue;
                        }

                        try
                        {
                            var emailSubject = $"📢 {sanitizedSubject}";
                            var html = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(99,102,241,0.15);color:#a5b4fc;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>📢 Broadcast</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 20px;line-height:1.3;'>{System.Web.HttpUtility.HtmlEncode(sanitizedSubject)}</h2>
        <div style='background:rgba(99,102,241,0.08);border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;'>
          <p style='font-size:15px;line-height:1.75;color:#e2e8f0;margin:0;white-space:pre-wrap;'>{System.Web.HttpUtility.HtmlEncode(sanitizedMessage)}</p>
        </div>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>This announcement was sent to all SessionFlow users.</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

                            var (ok, err) = await resend.SendAsync(u.Email, emailSubject, html);

                            if (ok)
                            {
                                sent++;
                                Serilog.Log.Information("[Broadcast] ✅ Delivered to {Name} <{Email}>", u.Name, u.Email);
                            }
                            else
                            {
                                // ── Retry #1 after 1s ──
                                Serilog.Log.Warning("[Broadcast] ⚠️ Retry #1 for {Email}: {Error}", u.Email, err);
                                await Task.Delay(1000);
                                var (retry1Ok, retry1Err) = await resend.SendAsync(u.Email, emailSubject, html);
                                if (retry1Ok)
                                {
                                    sent++;
                                    Serilog.Log.Information("[Broadcast] ✅ Retry #1 succeeded for {Email}", u.Email);
                                }
                                else
                                {
                                    // ── Retry #2 after 2s (exponential backoff) ──
                                    Serilog.Log.Warning("[Broadcast] ⚠️ Retry #2 for {Email}: {Error}", u.Email, retry1Err);
                                    await Task.Delay(2000);
                                    var (retry2Ok, retry2Err) = await resend.SendAsync(u.Email, emailSubject, html);
                                    if (retry2Ok)
                                    {
                                        sent++;
                                        Serilog.Log.Information("[Broadcast] ✅ Retry #2 succeeded for {Email}", u.Email);
                                    }
                                    else
                                    {
                                        failed++;
                                        Serilog.Log.Error("[Broadcast] ❌ FINAL FAIL for {Name} <{Email}>: {Error}", u.Name, u.Email, retry2Err);
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            failed++;
                            Serilog.Log.Error(ex, "[Broadcast] ❌ Exception → {Name} <{Email}>", u.Name, u.Email);
                        }

                        // ── Throttle: 300ms between each send to avoid Resend rate limits ──
                        await Task.Delay(300);
                    }

                    // ── Persist delivery metrics back to MongoDB ──
                    try
                    {
                        await db.SystemBroadcasts.UpdateOneAsync(
                            b => b.Id == broadcastId,
                            Builders<SystemBroadcast>.Update
                                .Set(b => b.EmailSendCompleted, true)
                                .Set(b => b.EmailSentCount, sent)
                                .Set(b => b.EmailFailedCount, failed)
                                .Set(b => b.EmailSentAt, DateTimeOffset.UtcNow));
                    }
                    catch (Exception dbEx)
                    {
                        Serilog.Log.Error(dbEx, "[Broadcast] Failed to update delivery metrics in DB");
                    }

                    Serilog.Log.Information("[Broadcast] ✅ Done. Sent={Sent} Failed={Failed} Skipped={Skipped} Total={Total}", sent, failed, skipped, users.Count);
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
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("AdminBroadcast");
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

            var html = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#059669,#10b981,#34d399);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(16,185,129,0.15);color:#6ee7b7;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>✅ Diagnostic</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 20px;line-height:1.3;'>Email Delivery Test &mdash; Passed</h2>
        <p style='font-size:15px;line-height:1.75;color:#cbd5e1;margin:0 0 16px;'>This is a diagnostic email confirming that the <strong style='color:#6ee7b7;'>Resend API</strong> is correctly configured for <strong style='color:#6ee7b7;'>sessionflow.uk</strong>.</p>
        <div style='background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px 24px;text-align:center;margin:20px 0;'>
          <p style='font-size:14px;color:#94a3b8;margin:0 0 4px;'>Status</p>
          <p style='font-size:24px;font-weight:800;color:#34d399;margin:0;letter-spacing:2px;'>OPERATIONAL</p>
        </div>
        <p style='font-size:13px;line-height:1.6;color:#94a3b8;margin:0;'>If you received this, email delivery is working. Check your spam folder if broadcasts are not arriving.</p>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>Sent from SessionFlow Admin Panel &mdash; DO NOT REPLY</p>
        <p style='font-size:11px;color:#334155;margin:0;'>&copy; {DateTime.UtcNow.Year} SessionFlow &mdash; Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

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

        // ── Send Direct Email to Individual User ─────────────────────────
        // POST /api/admin/broadcast/direct
        group.MapPost("/direct", async (
            DirectEmailRequest req,
            MongoService db,
            ResendEmailService resend,
            ClaimsPrincipal principal,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var logger = loggerFactory.CreateLogger("AdminDirectEmail");
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out _))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.UserId))
                return Results.BadRequest(new { error = "userId is required." });

            if (string.IsNullOrWhiteSpace(req.Subject) || req.Subject.Trim().Length < 3)
                return Results.BadRequest(new { error = "Subject must be at least 3 characters." });

            if (string.IsNullOrWhiteSpace(req.Message) || req.Message.Trim().Length < 5)
                return Results.BadRequest(new { error = "Message must be at least 5 characters." });

            // Look up user by ID
            if (!Guid.TryParse(req.UserId, out var userId))
                return Results.BadRequest(new { error = "Invalid user ID format." });

            var user = await db.Users
                .Find(u => u.Id == userId)
                .Project(u => new { u.Id, u.Email, u.Name })
                .FirstOrDefaultAsync(ct);

            if (user == null)
                return Results.NotFound(new { error = "User not found." });

            if (string.IsNullOrWhiteSpace(user.Email) || !user.Email.Contains('@'))
                return Results.BadRequest(new { error = $"User {user.Name} does not have a valid email address." });

            // Build styled email HTML
            var sanitizedSubject = req.Subject.Trim();
            var sanitizedMessage = req.Message.Trim();
            var emailSubject = $"✉️ {sanitizedSubject}";
            var html = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#7c3aed,#a78bfa,#c4b5fd);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(139,92,246,0.15);color:#c4b5fd;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>✉️ Direct Message</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 20px;line-height:1.3;'>{System.Web.HttpUtility.HtmlEncode(sanitizedSubject)}</h2>
        <div style='background:rgba(139,92,246,0.08);border-left:4px solid #8b5cf6;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;'>
          <p style='font-size:15px;line-height:1.75;color:#e2e8f0;margin:0;white-space:pre-wrap;'>{System.Web.HttpUtility.HtmlEncode(sanitizedMessage)}</p>
        </div>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>This message was sent to you personally by the SessionFlow admin team.</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

            logger.LogInformation("[DirectEmail] Sending to {Name} <{Email}> | Subject: {Subject}", user.Name, user.Email, sanitizedSubject);

            var (success, error) = await resend.SendAsync(user.Email, emailSubject, html);

            if (success)
            {
                logger.LogInformation("[DirectEmail] ✅ Delivered to {Name} <{Email}>", user.Name, user.Email);
            }
            else
            {
                // Retry once after 1s
                logger.LogWarning("[DirectEmail] ⚠️ Retry for {Email}: {Error}", user.Email, error);
                await Task.Delay(1000);
                var (retryOk, retryErr) = await resend.SendAsync(user.Email, emailSubject, html);
                if (retryOk)
                {
                    success = true;
                    error = null;
                    logger.LogInformation("[DirectEmail] ✅ Retry succeeded for {Email}", user.Email);
                }
                else
                {
                    error = retryErr;
                    logger.LogError("[DirectEmail] ❌ FINAL FAIL for {Name} <{Email}>: {Error}", user.Name, user.Email, retryErr);
                }
            }

            return Results.Ok(new
            {
                success,
                to = user.Email,
                userName = user.Name,
                error = success ? null : error,
                hint = success
                    ? "✅ Email delivered — check inbox and spam folder."
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
                    emailSentCount  = b.EmailSentCount,
                    emailFailedCount = b.EmailFailedCount,
                    emailError      = b.EmailError,
                    emailSentAt     = b.EmailSentAt,
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
    private record DirectEmailRequest(string UserId, string Subject, string Message);
}
