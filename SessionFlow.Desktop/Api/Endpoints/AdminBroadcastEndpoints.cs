using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

/// <summary>
/// Admin broadcast endpoints.
/// POST /api/admin/broadcast — send a custom message to all users
/// GET  /api/admin/broadcasts — paginated history of past broadcasts
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
            EmailService emailService,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var adminId))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.Subject) || req.Subject.Length > 120)
                return Results.BadRequest(new { error = "Subject must be between 1 and 120 characters." });

            if (string.IsNullOrWhiteSpace(req.Message) || req.Message.Length > 2000)
                return Results.BadRequest(new { error = "Message must be between 1 and 2000 characters." });

            var channel = req.Channel?.ToUpperInvariant() switch
            {
                "EMAIL" => "Email",
                "BOTH"  => "Both",
                _       => "InApp"
            };

            var sanitizedMessage = req.Message.Trim();

            // Get all approved users (active accounts)
            var users = await db.Users
                .Find(u => u.IsApproved)
                .Project(u => new { u.Id, u.Email, u.Name })
                .ToListAsync(ct);

            var sanitizedSubject = req.Subject.Trim();

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

            // ── In-App Notifications ──────────────────────────────────────
            if (channel is "InApp" or "Both")
            {
                var tasks = users.Select(u =>
                    notificationService.CreateNotificationAsync(
                        u.Id,
                        "System Announcement",
                        sanitizedMessage,
                        NotificationType.Info));

                await Task.WhenAll(tasks);
            }

            // ── Email ─────────────────────────────────────────────────────
            if (channel is "Email" or "Both")
            {
                // Fire-and-forget background email send (non-blocking)
                _ = Task.Run(async () =>
                {
                    int sent = 0;
                    foreach (var u in users)
                    {
                        try
                        {
                            await emailService.SendBroadcastEmailAsync(
                                u.Email, u.Name, sanitizedMessage, sanitizedSubject);
                            sent++;
                        }
                        catch (Exception ex)
                        {
                            Serilog.Log.Warning(ex, "[Broadcast] Failed to send email to {Email}", u.Email);
                        }
                    }

                    // Update broadcast record with completion
                    await db.SystemBroadcasts.UpdateOneAsync(
                        b => b.Id == broadcast.Id,
                        Builders<SystemBroadcast>.Update
                            .Set(b => b.EmailSendCompleted, true)
                            .Set(b => b.EmailSentAt, DateTimeOffset.UtcNow)
                            .Set(b => b.RecipientCount, sent));

                    Serilog.Log.Information("[Broadcast] Email broadcast completed. Sent to {Count}/{Total} users.", sent, users.Count);
                }, CancellationToken.None);
            }

            return Results.Ok(new
            {
                broadcastId    = broadcast.Id,
                recipientCount = users.Count,
                channel
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
}
