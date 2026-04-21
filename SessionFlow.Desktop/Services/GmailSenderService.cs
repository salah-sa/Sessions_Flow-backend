using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using MimeKit;

namespace SessionFlow.Desktop.Services;

public class GmailSenderService
{
    private readonly MongoService _db;
    private readonly GoogleAuthService _auth;
    private readonly ILogger<GmailSenderService> _logger;
    private readonly string[] Scopes = { GmailService.Scope.GmailSend, GmailService.Scope.GmailReadonly };

    public GmailSenderService(MongoService db, GoogleAuthService auth, ILogger<GmailSenderService> logger)
    {
        _db = db;
        _auth = auth;
        _logger = logger;
    }

    private async Task<GmailService?> GetGmailServiceAsync()
    {
        try
        {
            var credential = await _auth.GetUserCredentialAsync();
            if (credential == null)
            {
                _logger.LogWarning("Gmail API not authorized. No valid tokens found in identity matrix.");
                return null;
            }

            return new GmailService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = "SessionFlow",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Gmail API service.");
            return null;
        }
    }

    public async Task<(bool success, string? error)> SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        try
        {
            var service = await GetGmailServiceAsync();
            if (service == null)
            {
                return (false, "Gmail OAuth is not authorized. Please visit Settings -> External Bridge to link your Google account.");
            }

            var message = new MimeMessage();
            // In Gmail API, the "from" address is automatically the authenticated user, but we can set the display name
            message.From.Add(new MailboxAddress("SessionFlow", "me")); 
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = body };

            using var memoryStream = new MemoryStream();
            await message.WriteToAsync(memoryStream);
            var resultRaw = Convert.ToBase64String(memoryStream.ToArray())
                .Replace('+', '-')
                .Replace('/', '_')
                .Replace("=", "");

            var msg = new Message { Raw = resultRaw };
            await service.Users.Messages.Send(msg, "me").ExecuteAsync(ct);

            await LogEmailAsync(to, subject, "sent via Gmail API", ct);
            _logger.LogInformation("Email sent via Gmail to {To}: {Subject}", to, subject);
            
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via Gmail to {To}", to);
            try { await LogEmailAsync(to, subject, $"failed: {ex.Message}", ct); } catch { }
            return (false, ex.Message);
        }
    }

    public async Task<(bool success, string? error)> SendTestEmailAsync(string to)
    {
        return await SendEmailAsync(to, "SessionFlow OAuth Test",
            "<h2>SessionFlow Gmail Setup</h2><p>This is a test email sent via your authorized Gmail account. It works!</p>" +
            $"<p><small>Sent at: {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</small></p>");
    }

    private async Task LogEmailAsync(string to, string subject, string status, CancellationToken ct = default)
    {
        var logEntry = new
        {
            to,
            subject,
            status,
            timestamp = DateTimeOffset.UtcNow.ToString("o")
        };

        var logSetting = await _db.Settings.Find(s => s.Key == "email_log").FirstOrDefaultAsync(ct);
        List<object> logEntries;

        if (logSetting != null)
        {
            try { logEntries = JsonSerializer.Deserialize<List<object>>(logSetting.Value) ?? new List<object>(); }
            catch { logEntries = new List<object>(); }
        }
        else
        {
            logEntries = new List<object>();
            logSetting = new Setting { Key = "email_log", Value = "[]" };
            await _db.Settings.InsertOneAsync(logSetting, cancellationToken: ct);
        }

        logEntries.Insert(0, logEntry);
        if (logEntries.Count > 100) logEntries = logEntries.Take(100).ToList();

        var update = Builders<Setting>.Update
            .Set(s => s.Value, JsonSerializer.Serialize(logEntries))
            .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
        
        await _db.Settings.UpdateOneAsync(s => s.Id == logSetting.Id, update, cancellationToken: ct);
    }
}
