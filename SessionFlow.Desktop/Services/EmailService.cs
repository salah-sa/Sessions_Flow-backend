using Polly;
using Polly.Retry;
using System.Text.Json;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MimeKit;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class EmailService
{
    private readonly MongoService _db;
    private readonly ILogger<EmailService> _logger;

        private readonly ResiliencePipeline _retryPipeline;

    public EmailService(MongoService db, ILogger<EmailService> logger)
    {
        _db = db;
        _logger = logger;
        
        _retryPipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder().Handle<Exception>(),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(2)
            })
            .Build();
    }

    private async Task<Dictionary<string, string>> GetSmtpSettingsAsync(CancellationToken ct = default)
    {
        var keys = new[] { "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_enabled", "smtp_from" };
        var settingsList = await _db.Settings
            .Find(s => keys.Contains(s.Key))
            .ToListAsync(ct);
        
        return settingsList.ToDictionary(s => s.Key, s => s.Value);
    }

    public async Task<(bool success, string? error)> SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        try
        {
            var smtp = await GetSmtpSettingsAsync(ct);

            if (!smtp.TryGetValue("smtp_enabled", out var enabled) || enabled != "true")
            {
                _logger.LogWarning("SMTP is not enabled. Skipping email to {To}", to);
                return (false, "SMTP is not enabled.");
            }

            var host = smtp.GetValueOrDefault("smtp_host", "");
            var port = int.TryParse(smtp.GetValueOrDefault("smtp_port", "587"), out var p) ? p : 587;
            var user = smtp.GetValueOrDefault("smtp_user", "");
            var password = smtp.GetValueOrDefault("smtp_password", "");
            var from = smtp.GetValueOrDefault("smtp_from", user);

            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(user))
                return (false, "SMTP settings are incomplete.");

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SessionFlow", from));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = body };

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(user, password, ct);
            await _retryPipeline.ExecuteAsync(async token => await client.SendAsync(message, token), ct);
            await client.DisconnectAsync(true, ct);

            await LogEmailAsync(to, subject, "sent", ct);
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
            return (true, null);
        }
        catch (OperationCanceledException)
        {
            return (false, "Email send operation was canceled.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            try
            {
                await LogEmailAsync(to, subject, $"failed: {ex.Message}", ct);
            }
            catch { /* Ignore logging errors */ }
            return (false, ex.Message);
        }
    }

    public async Task<(bool success, string? error)> SendTestEmailAsync(string to)
    {
        return await SendEmailAsync(to, "SessionFlow Test Email",
            "<h2>SessionFlow Email Test</h2><p>This is a test email from SessionFlow. If you received this, your SMTP settings are configured correctly.</p>" +
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
            try
            {
                logEntries = JsonSerializer.Deserialize<List<object>>(logSetting.Value) ?? new List<object>();
            }
            catch
            {
                logEntries = new List<object>();
            }
        }
        else
        {
            logEntries = new List<object>();
            logSetting = new Setting { Key = "email_log", Value = "[]" };
            await _db.Settings.InsertOneAsync(logSetting, cancellationToken: ct);
        }

        logEntries.Insert(0, logEntry);

        if (logEntries.Count > 100)
            logEntries = logEntries.Take(100).ToList();

        var update = Builders<Setting>.Update
            .Set(s => s.Value, JsonSerializer.Serialize(logEntries))
            .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
        
        await _db.Settings.UpdateOneAsync(s => s.Id == logSetting.Id, update, cancellationToken: ct);
    }
}

public class EmailReminderService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EmailReminderService> _logger;
    private DateTimeOffset _lastDailySummary = DateTimeOffset.MinValue;
    private readonly HashSet<Guid> _sentReminders = new();

    public EmailReminderService(IServiceProvider serviceProvider, ILogger<EmailReminderService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EmailReminderService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndSendRemindersAsync(stoppingToken);
                await CheckAndSendDailySummaryAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("EmailReminderService stopping due to cancellation.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in EmailReminderService loop.");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task CheckAndSendRemindersAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoService>();
        var emailService = scope.ServiceProvider.GetRequiredService<GmailSenderService>();

        var now = DateTimeOffset.UtcNow;
        var cutoff = now.AddMinutes(10);

        var upcomingSessions = await db.Sessions
            .Find(s => s.Status == SessionStatus.Scheduled
                        && s.ScheduledAt > now
                        && s.ScheduledAt <= cutoff)
            .ToListAsync(ct);

        foreach (var session in upcomingSessions)
        {
            if (ct.IsCancellationRequested) break;
            if (_sentReminders.Contains(session.Id))
                continue;

            var engineer = await db.Users.Find(u => u.Id == session.EngineerId).FirstOrDefaultAsync(ct);
            if (engineer == null || string.IsNullOrEmpty(engineer.Email))
                continue;

            var group = await db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync(ct);
            var cairoTime = session.ScheduledAt.ToOffset(TimeSpan.FromHours(2));
            var minutesUntil = (int)(session.ScheduledAt - now).TotalMinutes;

            var body = $@"
                <h2>â ° Session Reminder</h2>
                <p>Your session is starting in <strong>{minutesUntil} minutes</strong>!</p>
                <table style='border-collapse:collapse;'>
                    <tr><td style='padding:4px 12px;font-weight:bold;'>Group:</td><td style='padding:4px 12px;'>{group?.Name ?? "N/A"}</td></tr>
                    <tr><td style='padding:4px 12px;font-weight:bold;'>Time:</td><td style='padding:4px 12px;'>{cairoTime:hh:mm tt}</td></tr>
                    <tr><td style='padding:4px 12px;font-weight:bold;'>Date:</td><td style='padding:4px 12px;'>{cairoTime:dddd, MMMM dd}</td></tr>
                </table>
                <p><small>SessionFlow â€” 3C</small></p>";

            var (success, _) = await emailService.SendEmailAsync(
                engineer.Email,
                $"Session Reminder: {group?.Name ?? "Session"} starts in {minutesUntil} min",
                body,
                ct);

            if (success)
            {
                _sentReminders.Add(session.Id);
                _logger.LogInformation("Reminder sent for session {SessionId} to {Email}", session.Id, engineer.Email);
            }
        }

        if (_sentReminders.Count > 500)
        {
            var toRemove = _sentReminders.Take(_sentReminders.Count - 100).ToList();
            foreach (var id in toRemove)
                _sentReminders.Remove(id);
        }
    }

    private async Task CheckAndSendDailySummaryAsync(CancellationToken ct)
    {
        var cairoOffset = TimeSpan.FromHours(2);
        var cairoNow = DateTimeOffset.UtcNow.ToOffset(cairoOffset);

        if (cairoNow.Hour != 22 || cairoNow.Date == _lastDailySummary.Date)
            return;

        _logger.LogInformation("Sending daily summary emails...");
        _lastDailySummary = cairoNow;

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoService>();
        var emailService = scope.ServiceProvider.GetRequiredService<GmailSenderService>();

        var tomorrowStart = new DateTimeOffset(cairoNow.Date.AddDays(1), cairoOffset);
        var tomorrowEnd = tomorrowStart.AddDays(1);

        var tomorrowSessions = await db.Sessions
            .Find(s => s.ScheduledAt >= tomorrowStart && s.ScheduledAt < tomorrowEnd
                        && s.Status == SessionStatus.Scheduled)
            .ToListAsync(ct);

        var byEngineer = tomorrowSessions.GroupBy(s => s.EngineerId);

        foreach (var group in byEngineer)
        {
            if (ct.IsCancellationRequested) break;
            var engineer = await db.Users.Find(u => u.Id == group.Key).FirstOrDefaultAsync(ct);
            if (engineer == null || string.IsNullOrEmpty(engineer.Email))
                continue;

            var sessionList = group.ToList();
            var sessionsHtmlList = new List<string>();
            foreach (var s in sessionList)
            {
                if (ct.IsCancellationRequested) break;
                var groupInfo = await db.Groups.Find(g => g.Id == s.GroupId).FirstOrDefaultAsync(ct);
                var time = s.ScheduledAt.ToOffset(cairoOffset);
                sessionsHtmlList.Add($"<tr><td style='padding:4px 12px;'>{time:hh:mm tt}</td><td style='padding:4px 12px;'>{groupInfo?.Name ?? "N/A"}</td></tr>");
            }
            
            var sessionsHtml = string.Join("", sessionsHtmlList);

            var body = $@"
                <h2>ðŸ“‹ Tomorrow's Schedule</h2>
                <p>Hi {engineer.Name}, here are your sessions for tomorrow ({tomorrowStart:dddd, MMMM dd}):</p>
                <table style='border-collapse:collapse; border:1px solid #ddd;'>
                    <tr style='background:#f5f5f5;'><th style='padding:8px 12px; text-align:left;'>Time</th><th style='padding:8px 12px; text-align:left;'>Group</th></tr>
                    {sessionsHtml}
                </table>
                <p>Total: <strong>{group.Count()}</strong> session(s)</p>
                <p><small>SessionFlow â€” 3C</small></p>";

            await emailService.SendEmailAsync(
                engineer.Email,
                $"SessionFlow: Your schedule for {tomorrowStart:MMMM dd}",
                body,
                ct);
        }
    }
}

