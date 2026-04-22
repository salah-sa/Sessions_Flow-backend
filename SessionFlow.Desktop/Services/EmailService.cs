using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Modern email service using Resend HTTP API to bypass SMTP port blocking on cloud providers.
/// Configure via Environment Variable: RESEND_API_KEY
/// </summary>
public class EmailService
{
    private readonly MongoService _db;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;

    public EmailService(MongoService db, ILogger<EmailService> logger, HttpClient httpClient)
    {
        _db = db;
        _logger = logger;
        _httpClient = httpClient;
    }

    private async Task<string?> GetApiKeyAsync(CancellationToken ct = default)
    {
        // 1. Try Environment Variable (Priority for Railway)
        var envKey = Environment.GetEnvironmentVariable("RESEND_API_KEY");
        if (!string.IsNullOrEmpty(envKey)) return envKey;

        // 2. Fallback to MongoDB settings
        return await _db.Settings
            .Find(s => s.Key == "resend_api_key")
            .Project(s => s.Value)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<string> GetFromEmailAsync(CancellationToken ct = default)
    {
        var from = await _db.Settings
            .Find(s => s.Key == "admin_email")
            .Project(s => s.Value)
            .FirstOrDefaultAsync(ct);

        // If it's a gmail address, it won't work with Resend unless verified as a domain.
        // Default to Resend onboarding address for trial purposes.
        if (string.IsNullOrEmpty(from) || from.Contains("gmail.com")) 
            return "SessionFlow <onboarding@resend.dev>";

        return from;
    }

    public async Task<(bool success, string? error)> SendEmailAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        try
        {
            var apiKey = await GetApiKeyAsync(ct);
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("RESEND_API_KEY not configured. Email to {To} was not sent.", to);
                return (false, "Resend API Key not configured. Please add RESEND_API_KEY to your environment variables.");
            }

            var from = await GetFromEmailAsync(ct);

            var payload = new
            {
                from = from,
                to = new[] { to },
                subject = subject,
                html = htmlBody
            };

            var json = JsonSerializer.Serialize(payload);
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[EMAIL] Sent successfully via Resend to {To}: {Subject}", to, subject);
                return (true, null);
            }

            _logger.LogError("[EMAIL] Resend API Error ({Status}): {Content}", response.StatusCode, content);
            return (false, $"Resend API Error: {response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMAIL] Exception while sending via Resend to {To}", to);
            return (false, ex.Message);
        }
    }

    public async Task<(bool success, string? error)> SendTestEmailAsync(string to)
    {
        return await SendEmailAsync(to, "SessionFlow - Test Email",
            @"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                <h2 style='color: #3b82f6;'>Resend API Active</h2>
                <p>This test email confirms that your Resend HTTP relay is fully operational and bypassing SMTP restrictions.</p>
                <p style='color: #64748b; font-size: 10px; margin-top: 40px;'>SESSIONFLOW SECURITY ENFORCEMENT PROTOCOL</p>
            </div>");
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
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

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
                <div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; margin: auto;'>
                    <h2 style='color: #3b82f6;'>⏰ Session Reminder</h2>
                    <p style='font-size: 1.1em;'>Your session is starting in <strong style='color: #60a5fa;'>{minutesUntil} minutes</strong>!</p>
                    <div style='background: #0f172a; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;'>
                        <p><strong>Group:</strong> {group?.Name ?? "N/A"}</p>
                        <p><strong>Time:</strong> {cairoTime:hh:mm tt} (Cairo)</p>
                        <p><strong>Date:</strong> {cairoTime:dddd, MMMM dd}</p>
                    </div>
                    <p style='color: #64748b; font-size: 12px; margin-top: 30px;'>SESSIONFLOW — AUTOMATED SYSTEM RELAY</p>
                </div>";

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
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

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
                sessionsHtmlList.Add($"<tr><td style='padding:8px 12px; border-bottom: 1px solid #1e293b;'>{time:hh:mm tt}</td><td style='padding:8px 12px; border-bottom: 1px solid #1e293b;'>{groupInfo?.Name ?? "N/A"}</td></tr>");
            }
            
            var sessionsHtml = string.Join("", sessionsHtmlList);

            var body = $@"
                <div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto;'>
                    <h2 style='color: #3b82f6;'>📋 Tomorrow's Schedule</h2>
                    <p>Hi {engineer.Name}, here are your sessions for tomorrow ({tomorrowStart:dddd, MMMM dd}):</p>
                    <table style='width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 12px; overflow: hidden;'>
                        <tr style='background: #1e293b;'><th style='padding:12px; text-align:left;'>Time</th><th style='padding:12px; text-align:left;'>Group</th></tr>
                        {sessionsHtml}
                    </table>
                    <p style='font-size: 1.1em;'>Total: <strong style='color: #60a5fa;'>{group.Count()}</strong> session(s)</p>
                    <p style='color: #64748b; font-size: 12px; margin-top: 30px; text-align: center;'>SESSIONFLOW — AUTOMATED SYSTEM RELAY</p>
                </div>";

            await emailService.SendEmailAsync(
                engineer.Email,
                $"SessionFlow: Your schedule for {tomorrowStart:MMMM dd}",
                body,
                ct);
        }
    }
}
