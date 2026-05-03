using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Threading;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using Microsoft.Extensions.Configuration;
using SessionFlow.Desktop.Helpers;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Unified email service using Resend.com as the sole transport.
/// Replaces GmailSenderService for all transactional email needs.
/// </summary>
public class EmailService
{
    private readonly ResendEmailService _resend;

    public EmailService(ResendEmailService resend)
    {
        _resend = resend;
    }

    public bool IsConfigured => _resend.IsConfigured;

    public async Task<(bool success, string? error)> SendEmailAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        return await _resend.SendAsync(to, subject, htmlBody);
    }

    public async Task<(bool success, string? error)> SendTestEmailAsync(string to)
    {
        return await _resend.SendAsync(to, "SessionFlow — Test Email", "<h2>✅ Email delivery is working!</h2><p>This is a test from SessionFlow via Resend.</p>");
    }

    /// <summary>Sends a custom admin broadcast message to a single recipient.</summary>
    public async Task<(bool success, string? error)> SendBroadcastEmailAsync(
        string toEmail,
        string toName,
        string message,
        string? subject = null)
    {
        var emailSubject = string.IsNullOrWhiteSpace(subject)
            ? "📢 SessionFlow — System Announcement"
            : $"📢 {subject}";

        var html = $@"
            <div style='font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px;'>
                <h2 style='color:#38bdf8;margin:0 0 16px;'>📢 {System.Web.HttpUtility.HtmlEncode(subject ?? "System Announcement")}</h2>
                <p style='font-size:15px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;'>{System.Web.HttpUtility.HtmlEncode(message)}</p>
                <hr style='border:none;border-top:1px solid #1e293b;margin:24px 0;'/>
                <p style='font-size:11px;color:#475569;'>This message was sent by the SessionFlow admin team.</p>
            </div>";

        return await _resend.SendAsync(toEmail, emailSubject, html);
    }
}


public class EmailReminderService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EmailReminderService> _logger;
    private readonly IConfiguration _config;
    private DateTimeOffset _lastDailySummary = DateTimeOffset.MinValue;
    private DateTimeOffset _lastMissedAttendanceCheck = DateTimeOffset.MinValue;
    private readonly HashSet<Guid> _sentReminders = new();
    private readonly HashSet<Guid> _sentStudentReminders = new();

    public EmailReminderService(IServiceProvider serviceProvider, ILogger<EmailReminderService> logger, IConfiguration config)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EmailReminderService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndSendRemindersAsync(stoppingToken);
                await CheckAndSendStudentRemindersAsync(stoppingToken);
                await CheckAndSendDailySummaryAsync(stoppingToken);
                await CheckAndSendMissedAttendanceRemindersAsync(stoppingToken);
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
            var cairoTime = session.ScheduledAt.ToCairoTime(_config);
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

    private async Task CheckAndSendStudentRemindersAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoService>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        var now = DateTimeOffset.UtcNow;
        // Looking for sessions starting in 23h50m to 24h10m (approx 24h reminder)
        var startRange = now.AddHours(23).AddMinutes(50);
        var endRange = now.AddHours(24).AddMinutes(10);

        var upcomingSessions = await db.Sessions
            .Find(s => s.Status == SessionStatus.Scheduled
                        && s.ScheduledAt >= startRange
                        && s.ScheduledAt <= endRange)
            .ToListAsync(ct);

        foreach (var session in upcomingSessions)
        {
            if (ct.IsCancellationRequested) break;
            if (_sentStudentReminders.Contains(session.Id))
                continue;

            var group = await db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync(ct);
            if (group == null) continue;

            var students = await db.Students.Find(s => s.GroupId == session.GroupId && s.UserId != null && !s.IsDeleted).ToListAsync(ct);
            var cairoTime = session.ScheduledAt.ToCairoTime(_config);
            var chatLink = "https://sessionflow.app/chat"; // General chat link

            foreach (var stu in students)
            {
                var user = await db.Users.Find(u => u.Id == stu.UserId).FirstOrDefaultAsync(ct);
                if (user == null || string.IsNullOrEmpty(user.Email)) continue;

                var stuEncoded = System.Web.HttpUtility.HtmlEncode(stu.Name);
                var groupEncoded = System.Web.HttpUtility.HtmlEncode(group.Name);
                var body = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#0284c7,#0ea5e9,#38bdf8);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(14,165,233,0.15);color:#7dd3fc;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>🚀 Session Reminder</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;'>Tomorrow's Session: {groupEncoded}</h2>
        <p style='font-size:15px;line-height:1.75;color:#cbd5e1;margin:0 0 20px;'>Hi {stuEncoded}, you have a session coming up tomorrow.</p>
        <div style='background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin:0 0 24px;'>
          <p style='font-size:14px;color:#94a3b8;margin:0 0 8px;'>🕐 <strong style=""color:#e2e8f0;"">Time:</strong> {cairoTime:hh:mm tt} (Cairo)</p>
          <p style='font-size:14px;color:#94a3b8;margin:0;'>📅 <strong style=""color:#e2e8f0;"">Date:</strong> {cairoTime:dddd, MMMM dd}</p>
        </div>
        <p style='font-size:14px;font-weight:700;color:#7dd3fc;margin:0 0 12px;'>Preparation Checklist:</p>
        <p style='font-size:14px;color:#cbd5e1;margin:0 0 6px;line-height:1.7;'>✅ Complete all pending tasks and homework.</p>
        <p style='font-size:14px;color:#cbd5e1;margin:0 0 6px;line-height:1.7;'>✅ Be fully prepared for the session topics.</p>
        <p style='font-size:14px;color:#cbd5e1;margin:0 0 6px;line-height:1.7;'>✅ Check your internet connection early.</p>
        <p style='font-size:14px;color:#cbd5e1;margin:0 0 20px;line-height:1.7;'>✅ Have your work ready to present/submit.</p>
        <div style='background:rgba(245,158,11,0.08);border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 28px;'>
          <p style='font-size:14px;color:#fbbf24;margin:0;'>💡 <strong>Forgot your homework?</strong> <span style=""color:#cbd5e1;"">Don't worry! Head to the Group Chat and ask your instructor for help.</span></p>
        </div>
        <div style='text-align:center;margin:0 0 8px;'>
          <a href='{chatLink}' style='display:inline-block;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;'>Go to Chat →</a>
        </div>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;text-align:center;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>Automated session reminder · Do not reply</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

                await emailService.SendEmailAsync(user.Email, $"[SessionFlow] Your session is tomorrow: {group.Name}", body, ct);
            }

            _sentStudentReminders.Add(session.Id);
        }

        if (_sentStudentReminders.Count > 500)
        {
            var toRemove = _sentStudentReminders.Take(_sentStudentReminders.Count - 100).ToList();
            foreach (var id in toRemove)
                _sentStudentReminders.Remove(id);
        }
    }

    private async Task CheckAndSendDailySummaryAsync(CancellationToken ct)
    {
        var cairoOffset = TimeZoneHelper.GetCairoOffset(_config);
        var cairoNow = DateTimeOffset.UtcNow.ToOffset(cairoOffset);

        if (cairoNow.Hour != 22 || cairoNow.Date == _lastDailySummary.Date)
            return;

        _logger.LogInformation("Sending daily summary emails...");
        _lastDailySummary = cairoNow;

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoService>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
        var sessionService = scope.ServiceProvider.GetRequiredService<SessionService>();

        // Ensure maintenance has generated tomorrow's sessions (including last sessions of near-complete groups)
        try { await sessionService.MaintainAllGroupsSessionsAsync(ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Session maintenance before daily summary failed — continuing with existing data."); }

        var tomorrowStart = new DateTimeOffset(cairoNow.Date.AddDays(1), cairoOffset);
        var tomorrowEnd = tomorrowStart.AddDays(1);

        var tomorrowSessions = await db.Sessions
            .Find(s => s.ScheduledAt >= tomorrowStart && s.ScheduledAt < tomorrowEnd
                        && !s.IsDeleted && !s.IsSkipped)
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
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#1d4ed8,#3b82f6,#60a5fa);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(59,130,246,0.15);color:#93c5fd;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>📋 Daily Summary</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;'>Tomorrow's Schedule</h2>
        <p style='font-size:15px;line-height:1.75;color:#cbd5e1;margin:0 0 20px;'>Hi {System.Web.HttpUtility.HtmlEncode(engineer.Name)}, here are your sessions for <strong style=""color:#93c5fd;"">{tomorrowStart:dddd, MMMM dd}</strong>:</p>
        <table style='width:100%;border-collapse:collapse;margin:0 0 24px;'>
          <tr style='background:#1e293b;'>
            <th style='padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #334155;'>Time</th>
            <th style='padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #334155;'>Group</th>
          </tr>
          {sessionsHtml}
        </table>
        <div style='background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px 20px;text-align:center;margin:0 0 8px;'>
          <span style='font-size:14px;color:#94a3b8;'>Total: </span>
          <span style='font-size:18px;font-weight:800;color:#60a5fa;'>{group.Count()}</span>
          <span style='font-size:14px;color:#94a3b8;'> session(s)</span>
        </div>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;text-align:center;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>Automated daily summary · Do not reply</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

            await emailService.SendEmailAsync(
                engineer.Email,
                $"SessionFlow: Your schedule for {tomorrowStart:MMMM dd}",
                body,
                ct);
        }
    }

    private async Task CheckAndSendMissedAttendanceRemindersAsync(CancellationToken ct)
    {
        var cairoOffset = TimeZoneHelper.GetCairoOffset(_config);
        var cairoNow = DateTimeOffset.UtcNow.ToOffset(cairoOffset);

        // Only run at 11:30 PM Cairo time, once per day
        if (cairoNow.Hour != 23 || cairoNow.Minute < 30 || cairoNow.Date == _lastMissedAttendanceCheck.Date)
            return;

        _logger.LogInformation("Checking for missed attendance at 11:30 PM Cairo...");
        _lastMissedAttendanceCheck = cairoNow;

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoService>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        // Find today's sessions that are still Scheduled or Active (attendance not completed)
        var todayStart = new DateTimeOffset(cairoNow.Date, cairoOffset);
        var todayEnd = todayStart.AddDays(1);

        var missedSessions = await db.Sessions
            .Find(s => s.ScheduledAt >= todayStart && s.ScheduledAt < todayEnd
                        && !s.IsDeleted && !s.IsSkipped
                        && (s.Status == SessionStatus.Scheduled || s.Status == SessionStatus.Active))
            .ToListAsync(ct);

        if (missedSessions.Count == 0) return;

        var byEngineer = missedSessions.GroupBy(s => s.EngineerId);

        foreach (var engineerGroup in byEngineer)
        {
            if (ct.IsCancellationRequested) break;

            var engineer = await db.Users.Find(u => u.Id == engineerGroup.Key).FirstOrDefaultAsync(ct);
            if (engineer == null || string.IsNullOrEmpty(engineer.Email)) continue;

            var sessionRows = new List<string>();
            foreach (var session in engineerGroup)
            {
                var group = await db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync(ct);
                var time = session.ScheduledAt.ToOffset(cairoOffset);
                sessionRows.Add($"<tr><td style='padding:8px 12px; border-bottom: 1px solid #1e293b;'>{time:hh:mm tt}</td><td style='padding:8px 12px; border-bottom: 1px solid #1e293b;'>{group?.Name ?? "N/A"}</td><td style='padding:8px 12px; border-bottom: 1px solid #1e293b; color: #f59e0b;'>{session.Status}</td></tr>");
            }

            var body = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='600' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#b45309,#d97706,#f59e0b);padding:24px 32px;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;'>
        <span style='display:inline-block;background:rgba(245,158,11,0.15);color:#fbbf24;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;'>⚠️ Alert</span>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;'>Missed Attendance</h2>
        <p style='font-size:15px;line-height:1.75;color:#cbd5e1;margin:0 0 20px;'>Hi {System.Web.HttpUtility.HtmlEncode(engineer.DisplayName ?? engineer.Name)}, the following sessions were <strong style=""color:#fbbf24;"">not completed</strong> today:</p>
        <table style='width:100%;border-collapse:collapse;margin:0 0 24px;'>
          <tr style='background:#1e293b;'>
            <th style='padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #334155;'>Time</th>
            <th style='padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #334155;'>Group</th>
            <th style='padding:12px 16px;text-align:left;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #334155;'>Status</th>
          </tr>
          {string.Join("", sessionRows)}
        </table>
        <div style='background:rgba(245,158,11,0.08);border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 8px;'>
          <p style='font-size:14px;color:#fbbf24;margin:0;'>💡 <strong>Tip:</strong> <span style=""color:#cbd5e1;"">If these sessions did not take place, mark them as <strong style=""color:#fbbf24;"">Skipped</strong> in the system to prevent session number advancement.</span></p>
        </div>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;text-align:center;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>Automated attendance alert · Do not reply</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

            await emailService.SendEmailAsync(
                engineer.Email,
                $"⚠️ Missed Attendance: {engineerGroup.Count()} session(s) not completed today",
                body,
                ct);

            _logger.LogInformation("Missed attendance reminder sent to {Email} for {Count} sessions", engineer.Email, engineerGroup.Count());
        }
    }
}
