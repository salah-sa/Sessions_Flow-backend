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
                        avatarUrl = AuthEndpoints.ResolveAvatarUrl(sender.AvatarUrl, ctx.Request)
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

            if (userRole == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userGuid).FirstOrDefaultAsync();
                if (user == null) return Results.Forbid();
                var studentInfos = await auth.ResolveAllStudentsForUser(user);
                if (studentInfos == null || !studentInfos.Any(s => s.GroupId == groupId)) return Results.Forbid();
            }

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

                    // Use purely GridFS storage instead of local disk to prevent Docker volume wipes
                    using (var readStream = file.OpenReadStream()) 
                    {
                        var gridFsId = await storage.UploadFileAsync(readStream, file.FileName, file.ContentType ?? "application/octet-stream");
                        
                        // Store relative URL instead of absolute to handle host changes/deployments
                        fileUrl = $"/api/media/{gridFsId}";
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
                    avatarUrl = AuthEndpoints.ResolveAvatarUrl(sender.AvatarUrl, req)
                } : null,
                text = message.Text,
                fileUrl = AuthEndpoints.ResolveAvatarUrl(message.FileUrl, req),
                fileName = message.FileName,
                fileType = message.FileType,
                sentAt = message.SentAt
            };

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
                                var body = $@"
                                    <h2>Important Notification</h2>
                                    <p><b>{sender?.Name}</b> sent an important message in your group <b>{g.Name}</b>:</p>
                                    <blockquote style='border-left: 5px solid #007bff; padding: 10px; background: #f8f9fa;'>
                                        {textParams.Trim().Substring(2).Trim()}
                                    </blockquote>
                                    <p>Please check the chat for more details.</p>
                                    <hr/>
                                    <p><small>This is an automated notification because you are currently offline.</small></p>";
                                
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
