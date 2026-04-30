using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MailKit.Net.Smtp;
using MailKit.Security;
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
    private readonly IConfiguration _config;
    private readonly string[] Scopes = { GmailService.Scope.GmailSend, GmailService.Scope.GmailReadonly };

    public GmailSenderService(MongoService db, GoogleAuthService auth, ILogger<GmailSenderService> logger, IConfiguration config)
    {
        _db = db;
        _auth = auth;
        _logger = logger;
        _config = config;
    }

    private async Task<GmailService?> GetGmailServiceAsync()
    {
        try
        {
            // Timeout after 3s — on Railway (headless), OAuth will hang forever
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            var credTask = _auth.GetUserCredentialAsync();
            var completed = await Task.WhenAny(credTask, Task.Delay(3000, cts.Token));

            if (completed != credTask)
            {
                _logger.LogWarning("Gmail OAuth timed out (headless server). Falling back to Resend/SMTP.");
                return null;
            }

            var credential = await credTask;
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
        var isContainer = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";

        // ── On Railway: SMTP first (fastest working path) ──────────────────
        // Resend is in Sandbox → always fails for non-registered addresses.
        // Gmail OAuth times out after 3s on headless servers.
        // Gmail SMTP with App Password works reliably in containers.
        if (isContainer)
        {
            var smtpResult = await SendViaSmtpAsync(to, subject, body, ct);
            if (smtpResult.success) return smtpResult;

            _logger.LogWarning("[EMAIL] SMTP failed: {Err}. Trying Resend fallback...", smtpResult.error);

            var resendResult = await SendViaResendAsync(to, subject, body, ct);
            if (resendResult.success) return resendResult;

            _logger.LogWarning("[EMAIL] All delivery methods failed for {To}", to);
            return (false, "All email delivery methods failed. Please try again later.");
        }

        // ── Local dev: Resend first (fastest for verified domains) ──────────
        var resendResultLocal = await SendViaResendAsync(to, subject, body, ct);
        if (resendResultLocal.success) return resendResultLocal;

        _logger.LogWarning("[EMAIL] Resend failed: {Err}. Trying Gmail OAuth...", resendResultLocal.error);

        // ── Priority 2: Gmail OAuth (local dev only, times out on Railway) ──
        try
        {
            var service = await GetGmailServiceAsync();
            if (service != null)
            {
                var message = new MimeMessage();
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
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[EMAIL] Gmail OAuth failed. Trying SMTP...");
        }

        // ── Priority 3: SMTP last resort for local dev ──────────────────────
        return await SendViaSmtpAsync(to, subject, body, ct);
    }

    /// <summary>
    /// Resend API fallback — uses HTTPS (works on Railway, unlike SMTP).
    /// Requires RESEND_API_KEY env var. Free tier: 100 emails/day.
    /// </summary>
    private async Task<(bool success, string? error)> SendViaResendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        var apiKey = _config["Resend:ApiKey"] ?? Environment.GetEnvironmentVariable("RESEND_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Resend API not configured. Set RESEND_API_KEY.");
            return (false, "Resend API not configured.");
        }

        try
        {
            var fromAddress = _config["Resend:From"] ?? Environment.GetEnvironmentVariable("RESEND_FROM") ?? "SessionFlow <onboarding@resend.dev>";

            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            var payload = new
            {
                from = fromAddress,
                to = new[] { to },
                subject = subject,
                html = body
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync("https://api.resend.com/emails", content, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[RESEND] Failed ({Status}): {Body}", response.StatusCode, responseBody);
                return (false, $"Resend API error: {response.StatusCode}");
            }

            await LogEmailAsync(to, subject, "sent via Resend API", ct);
            _logger.LogInformation("Email sent via Resend API to {To}: {Subject}", to, subject);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RESEND] Exception sending email to {To}", to);
            return (false, $"Resend error: {ex.Message}");
        }
    }

    /// <summary>
    /// SMTP fallback — used when Gmail OAuth and Resend are not available.
    /// Requires GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD env vars.
    /// </summary>
    private async Task<(bool success, string? error)> SendViaSmtpAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        var smtpUser = _config["Gmail:SmtpUser"] ?? Environment.GetEnvironmentVariable("GMAIL_SMTP_USER");
        var smtpPass = _config["Gmail:SmtpAppPassword"] ?? Environment.GetEnvironmentVariable("GMAIL_SMTP_APP_PASSWORD");

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            _logger.LogWarning("SMTP fallback not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.");
            return (false, "Email service is not configured. Please contact support.");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SessionFlow", smtpUser));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = body };

            // Use a tight timeout — if Railway blocks the port it hangs forever
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(4)); // Fail fast — Railway blocks SMTP

            using var client = new SmtpClient();

            // Try port 587 (STARTTLS) first, fall back to port 465 (SSL)
            try
            {
                await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls, timeoutCts.Token);
                _logger.LogInformation("[SMTP] Connected via port 587 (STARTTLS)");
            }
            catch (Exception ex587)
            {
                _logger.LogWarning("[SMTP] Port 587 failed ({Err}), trying port 465 (SSL)...", ex587.Message);
                if (client.IsConnected) await client.DisconnectAsync(true, CancellationToken.None);
                await client.ConnectAsync("smtp.gmail.com", 465, SecureSocketOptions.SslOnConnect, timeoutCts.Token);
                _logger.LogInformation("[SMTP] Connected via port 465 (SSL)");
            }

            await client.AuthenticateAsync(smtpUser, smtpPass, timeoutCts.Token);
            await client.SendAsync(message, timeoutCts.Token);
            await client.DisconnectAsync(true, CancellationToken.None);

            await LogEmailAsync(to, subject, "sent via SMTP", ct);
            _logger.LogInformation("[SMTP] ✅ Email sent to {To}: {Subject}", to, subject);
            return (true, null);
        }
        catch (OperationCanceledException)
        {
            _logger.LogError("[SMTP] ⏱ Timeout — both port 587 and 465 are unreachable on this host. Railway may block outbound SMTP.");
            return (false, "SMTP timeout: Railway may be blocking outbound SMTP ports. Contact support.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMTP] ❌ Failed to send email to {To}: {Err}", to, ex.Message);
            return (false, $"SMTP error: {ex.Message}");
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
