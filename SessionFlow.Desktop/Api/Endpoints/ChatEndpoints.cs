using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using SessionFlow.Desktop.Api.Hubs;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.IO;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class ChatEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/chat").RequireAuthorization();

        app.MapGet("/api/media/{id}", async (string id, StorageService storage, HttpContext ctx) =>
        {
            try
            {
                var contentType = await storage.GetContentTypeAsync(id);
                ctx.Response.Headers.CacheControl = "public, max-age=31536000";
                
                var stream = new MemoryStream();
                await storage.DownloadFileAsync(id, stream);
                stream.Position = 0;
                
                return Results.Stream(stream, contentType);
            }
            catch
            {
                return Results.NotFound();
            }
        }).AllowAnonymous(); // Depending on auth requirement, leaving open for image rendering

        // GET /api/chat/{groupId}/messages — Supports cursor-based pagination
        group.MapGet("/{groupIdStr}/messages", async (string groupIdStr, DateTime? before, int? limit, MongoService db, HttpContext ctx, AuthService auth) =>
        {
            if (!Guid.TryParse(groupIdStr, out var groupId)) return Results.BadRequest("Invalid Group ID");
            
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var g = await db.Groups.Find(x => x.Id == groupId && !x.IsDeleted).FirstOrDefaultAsync();
            if (g == null)
                return Results.NotFound(new { error = "Group not found." });

            if (role == "Engineer" && g.EngineerId != userId)
                return Results.Forbid();

            // Zero-Trust: Admin also scoped to their own groups
            if (role == "Admin" && g.EngineerId != userId)
                return Results.Forbid();

            if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return Results.Forbid();
                var studentInfos = await auth.ResolveAllStudentsForUser(user);
                if (studentInfos == null || !studentInfos.Any(s => s.GroupId == groupId)) return Results.Forbid();
            }

            var queryLimit = limit ?? 100;
            var filter = Builders<ChatMessage>.Filter.Eq(m => m.GroupId, groupId);
            if (before.HasValue)
            {
                filter &= Builders<ChatMessage>.Filter.Lt(m => m.SentAt, before.Value);
            }

            var messages = await db.ChatMessages
                .Find(filter)
                .SortByDescending(m => m.SentAt)
                .Limit(queryLimit)
                .ToListAsync();

            var senderIds = messages.Select(m => m.SenderId).Distinct().ToList();
            var senders = await db.Users.Find(u => senderIds.Contains(u.Id)).ToListAsync();
            var senderDict = senders.ToDictionary(u => u.Id);

            var result = new List<object>();
            foreach (var m in messages.OrderByDescending(m => m.SentAt))
            {
                senderDict.TryGetValue(m.SenderId, out var sender);
                result.Add(new
                {
                    id = m.Id,
                    groupId = m.GroupId,
                    senderId = m.SenderId,
                    senderName = sender?.Name ?? "Unknown",
                    sender = sender != null ? new
                    {
                        id = sender.Id,
                        name = sender.Name,
                        role = sender.Role.ToString(),
                        avatarUrl = AuthEndpoints.ResolveAvatarUrl(sender.AvatarUrl, ctx.Request),
                        subscriptionTier = sender.SubscriptionTier.ToString()
                    } : null,
                    text = m.Text,
                    fileUrl = AuthEndpoints.ResolveAvatarUrl(m.FileUrl, ctx.Request),
                    fileName = m.FileName,
                    fileType = m.FileType,
                    sentAt = m.SentAt
                });
            }

            return Results.Ok(result);
        });

        group.MapPost("/{groupIdStr}/messages", async (string groupIdStr, HttpRequest req,
            MongoService db, HttpContext ctx, Services.EventBus.IEventBus eventBus, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env, 
            AuthService auth, StorageService storage, EmailService emailService, IPresenceService presence) =>
        {
            if (!Guid.TryParse(groupIdStr, out var groupId)) return Results.BadRequest("Invalid Group ID");
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userGuid))
                return Results.Unauthorized();

            var userRole = ctx.User.FindFirst(ClaimTypes.Role)?.Value;

            var g = await db.Groups.Find(x => x.Id == groupId && !x.IsDeleted).FirstOrDefaultAsync();
            if (g == null)
                return Results.NotFound(new { error = "Group not found." });

            if (userRole == "Engineer" && g.EngineerId != userGuid)
                return Results.Forbid();

            // Zero-Trust: Admin also scoped to their own groups
            if (userRole == "Admin" && g.EngineerId != userGuid)
                return Results.Forbid();

            if (userRole == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
                if (user == null) return Results.Forbid();
                var studentInfos = await auth.ResolveAllStudentsForUser(user);
                if (studentInfos == null || !studentInfos.Any(s => s.GroupId == groupId)) return Results.Forbid();
            }

            // ─── B.1: DAILY MESSAGE LIMIT ENFORCEMENT ───────────────────────
            var senderUser = await db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
            int todayMsgCount = 0;
            int todayImgCount = 0;
            int todayVidCount = 0;
            int todayFileCount = 0;

            int maxMsgs = 0;
            int maxImgs = 0;
            int maxVids = 0;
            int maxFiles = 0;

            if (senderUser != null)
            {
                var todayStart = DateTimeOffset.UtcNow.Date;
                var todayEnd   = todayStart.AddDays(1);
                
                var todayMessages = await db.ChatMessages
                    .Find(m => m.SenderId == userGuid && m.SentAt >= todayStart && m.SentAt < todayEnd)
                    .ToListAsync();

                todayMsgCount = todayMessages.Count;
                todayImgCount = todayMessages.Count(m => m.FileType?.StartsWith("image/") == true);
                todayVidCount = todayMessages.Count(m => m.FileType?.StartsWith("video/") == true);
                todayFileCount = todayMessages.Count(m => !string.IsNullOrEmpty(m.FileType) && !m.FileType.StartsWith("image/") && !m.FileType.StartsWith("video/"));

                maxMsgs = PlanLimit.GetMaxDailyMessages(senderUser.SubscriptionTier, userRole);
                maxImgs = PlanLimit.GetMaxDailyImages(senderUser.SubscriptionTier, userRole);
                maxVids = PlanLimit.GetMaxDailyVideos(senderUser.SubscriptionTier, userRole);
                maxFiles = PlanLimit.GetMaxDailyFiles(senderUser.SubscriptionTier, userRole);

                if (todayMsgCount >= maxMsgs)
                {
                    return Results.Json(new
                    {
                        error   = $"Daily message limit reached ({maxMsgs}/day on your {senderUser.SubscriptionTier} plan). Upgrade to send more.",
                        code    = "DAILY_LIMIT_REACHED",
                        limit   = maxMsgs,
                        remaining = 0,
                        tier    = senderUser.SubscriptionTier.ToString()
                    }, statusCode: 429);
                }
            }
            // ──────────────────────────────────────────────────────────────────

            string textParams = string.Empty;
            string? fileUrl = null;
            string? fileName = null;
            string? fileType = null;

            if (req.HasFormContentType)
            {
                var form = await req.ReadFormAsync();
                textParams = form["text"].ToString();
                var file = form.Files.GetFile("file");

                if (file != null && file.Length > 0)
                {
                    // SECURITY: Enforce file size limit (10MB)
                    const long maxFileSize = 10 * 1024 * 1024;
                    if (file.Length > maxFileSize)
                        return Results.BadRequest(new { error = "File too large. Maximum 10MB allowed." });

                    // SECURITY: Validate file type
                    var allowedTypes = new HashSet<string> { 
                        "image/jpeg", "image/png", "image/gif", "image/webp",
                        "application/pdf", 
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-powerpoint",
                        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "audio/mpeg", "audio/ogg", "audio/wav",
                        "video/mp4", "video/webm", "video/quicktime" 
                    };
                    if (!allowedTypes.Contains(file.ContentType?.ToLowerInvariant() ?? ""))
                        return Results.BadRequest(new { error = "File type not allowed." });

                    // SECURITY: Enforce tiered media limits
                    if (file.ContentType?.StartsWith("image/") == true && todayImgCount >= maxImgs)
                        return Results.Json(new { error = $"Image limit reached ({maxImgs}/day). Upgrade for more.", code = "IMAGE_LIMIT_REACHED" }, statusCode: 429);
                    
                    if (file.ContentType?.StartsWith("video/") == true && todayVidCount >= maxVids)
                        return Results.Json(new { error = $"Video limit reached ({maxVids}/day). Upgrade for more.", code = "VIDEO_LIMIT_REACHED" }, statusCode: 429);
                    
                    if (!file.ContentType?.StartsWith("image/") == true && !file.ContentType?.StartsWith("video/") == true && todayFileCount >= maxFiles)
                        return Results.Json(new { error = $"File limit reached ({maxFiles}/day). Upgrade for more.", code = "FILE_LIMIT_REACHED" }, statusCode: 429);

                    // Use purely GridFS storage instead of local disk to prevent Docker volume wipes
                    using (var readStream = file.OpenReadStream()) 
                    {
                        var gridFsId = await storage.UploadFileAsync(readStream, file.FileName, file.ContentType ?? "application/octet-stream");
                        
                        var host = ctx.Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? ctx.Request.Host.Value;
                        var proto = ctx.Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? ctx.Request.Scheme;
                        fileUrl = $"{proto}://{host}/api/media/{gridFsId}";
                    }
                    
                    fileName = file.FileName;
                    fileType = file.ContentType;
                }
            }
            else
            {
                var body = await req.ReadFromJsonAsync<SendMessageRequest>();
                textParams = body?.Text ?? "";
            }

            if (string.IsNullOrWhiteSpace(textParams) && fileUrl == null)
                return Results.BadRequest(new { error = "Message text or file is required." });

            var message = new ChatMessage
            {
                GroupId = groupId,
                SenderId = userGuid,
                Text = textParams.Trim(),
                FileUrl = fileUrl,
                FileName = fileName,
                FileType = fileType,
                SentAt = DateTimeOffset.UtcNow
            };

            await db.ChatMessages.InsertOneAsync(message);

            var sender = await db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();

            var msgData = new
            {
                id = message.Id,
                groupId = message.GroupId,
                senderId = message.SenderId,
                senderName = sender?.Name ?? "Unknown",
                sender = sender != null ? new
                {
                    id = sender.Id,
                    name = sender.Name,
                    role = sender.Role.ToString(),
                    avatarUrl = AuthEndpoints.ResolveAvatarUrl(sender.AvatarUrl, req),
                    subscriptionTier = sender.SubscriptionTier.ToString()
                } : null,
                text = message.Text,
                fileUrl = AuthEndpoints.ResolveAvatarUrl(message.FileUrl, req),
                fileName = message.FileName,
                fileType = message.FileType,
                sentAt = message.SentAt,
                _usage = senderUser != null ? new { 
                    remaining = Math.Max(0, maxMsgs - todayMsgCount - 1), 
                    limit = maxMsgs,
                    imagesRemaining = Math.Max(0, maxImgs - todayImgCount - (fileType?.StartsWith("image/") == true ? 1 : 0)),
                    videosRemaining = Math.Max(0, maxVids - todayVidCount - (fileType?.StartsWith("video/") == true ? 1 : 0)),
                    filesRemaining = Math.Max(0, maxFiles - todayFileCount - (!string.IsNullOrEmpty(fileType) && !fileType.StartsWith("image/") && !fileType.StartsWith("video/") ? 1 : 0))
                } : null
            };

            await eventBus.PublishAsync(SessionFlow.Desktop.Services.EventBus.Events.MessageReceive, SessionFlow.Desktop.Services.EventBus.EventTargetType.Group, $"chat_{groupId}", new { message = msgData, groupId = groupId });


            // IMPORTANT MESSAGE NOTIFICATION TRIGGER
            if (textParams.Trim().StartsWith("//"))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var groupMembers = await db.Students.Find(s => s.GroupId == groupId && s.UserId != null && !s.IsDeleted).ToListAsync();
                        var engineer = await db.Users.Find(u => u.Id == g.EngineerId).FirstOrDefaultAsync();
                        
                        var recipients = new List<User>();
                        if (engineer != null && engineer.Id != userGuid) recipients.Add(engineer);
                        
                        foreach (var stu in groupMembers)
                        {
                            if (stu.UserId == userGuid) continue;
                            var stuUser = await db.Users.Find(u => u.Id == stu.UserId).FirstOrDefaultAsync();
                            if (stuUser != null) recipients.Add(stuUser);
                        }

                        foreach (var recipient in recipients)
                        {
                            if (!presence.IsOnline(recipient.Id.ToString()))
                            {
                                var subject = $"[SessionFlow] Important Message in {g.Name}";
                                var msgContent = System.Web.HttpUtility.HtmlEncode(textParams.Trim().Substring(2).Trim());
                                var senderEncoded = System.Web.HttpUtility.HtmlEncode(sender?.Name ?? "Someone");
                                var groupEncoded = System.Web.HttpUtility.HtmlEncode(g.Name);
                                var body = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#ea580c,#f97316,#fb923c);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(249,115,22,0.15);color:#fdba74;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>🔔 Important</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;'>New Message in {groupEncoded}</h2>
        <p style='font-size:14px;color:#94a3b8;margin:0 0 20px;'><strong style='color:#cbd5e1;'>{senderEncoded}</strong> sent an important message:</p>
        <div style='background:rgba(249,115,22,0.08);border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;'>
          <p style='font-size:15px;line-height:1.75;color:#e2e8f0;margin:0;white-space:pre-wrap;'>{msgContent}</p>
        </div>
        <p style='font-size:13px;color:#94a3b8;margin:0;'>Please check the chat for more details.</p>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>You received this because you are offline. This is an automated notification.</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";
                                
                                await emailService.SendEmailAsync(recipient.Email, subject, body);
                            }
                        }
                    }
                    catch (Exception) { /* Silently fail background notifications */ }
                });
            }

            return Results.Created($"/api/chat/{groupId}/messages", msgData);
        }).DisableAntiforgery(); // Disable default antiforgery check for multipart API submission
    }

    public record SendMessageRequest(string Text);
}
