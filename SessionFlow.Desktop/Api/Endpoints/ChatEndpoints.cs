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

        // GET /api/chat/{groupId}/messages — last 100 messages
        group.MapGet("/{groupIdStr}/messages", async (string groupIdStr, MongoService db, HttpContext ctx, AuthService auth) =>
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

            var messages = await db.ChatMessages
                .Find(m => m.GroupId == groupId)
                .SortByDescending(m => m.SentAt)
                .Limit(100)
                .ToListAsync();

            var senderIds = messages.Select(m => m.SenderId).Distinct().ToList();
            var senders = await db.Users.Find(u => senderIds.Contains(u.Id)).ToListAsync();
            var senderDict = senders.ToDictionary(u => u.Id);

            var result = new List<object>();
            foreach (var m in messages.OrderBy(m => m.SentAt))
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
                        avatarUrl = sender.AvatarUrl
                    } : null,
                    text = m.Text,
                    fileUrl = m.FileUrl,
                    fileName = m.FileName,
                    fileType = m.FileType,
                    sentAt = m.SentAt
                });
            }

            return Results.Ok(result);
        });

        group.MapPost("/{groupIdStr}/messages", async (string groupIdStr, HttpRequest req,
            MongoService db, HttpContext ctx, IHubContext<SessionHub> hub, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env, AuthService auth) =>
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
                    var allowedTypes = new HashSet<string> { "image/jpeg", "image/png", "image/gif", "image/webp",
                        "application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "audio/mpeg", "audio/ogg", "audio/wav", "video/mp4" };
                    if (!allowedTypes.Contains(file.ContentType?.ToLowerInvariant() ?? ""))
                        return Results.BadRequest(new { error = "File type not allowed." });

                    // For the desktop application, store in wwwroot/uploads securely
                    string webRoot = env.WebRootPath ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
                    var uploadsFolder = Path.Combine(webRoot, "uploads");
                    Directory.CreateDirectory(uploadsFolder);
                    
                    var uniqueFileName = $"{Guid.NewGuid()}_{file.FileName}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }
                    
                    fileUrl = $"/uploads/{uniqueFileName}";
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
                    avatarUrl = sender.AvatarUrl
                } : null,
                text = message.Text,
                fileUrl = message.FileUrl,
                fileName = message.FileName,
                fileType = message.FileType,
                sentAt = message.SentAt
            };

            await hub.Clients.Group($"chat_{groupId}").SendAsync("NewChatMessage", groupId.ToString(), msgData);

            return Results.Created($"/api/chat/{groupId}/messages", msgData);
        }).DisableAntiforgery(); // Disable default antiforgery check for multipart API submission
    }

    public record SendMessageRequest(string Text);
}
