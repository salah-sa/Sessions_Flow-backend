using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Simple, reliable email sender using Gmail SMTP with App Password.
/// No OAuth, no credentials.json needed — just your Gmail address and App Password.
/// Configure via Central Command → Comms & Relay.
/// </summary>
public class SmtpEmailService
{
    private readonly MongoService _db;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(MongoService db, ILogger<SmtpEmailService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Gets the configured admin email and app password from MongoDB settings.
    /// Settings keys: "admin_email" and "admin_email_app_password"
    /// </summary>
    private async Task<(string? email, string? appPassword)> GetCredentialsAsync(CancellationToken ct = default)
    {
        var email = await _db.Settings
            .Find(s => s.Key == "admin_email")
            .Project(s => s.Value)
            .FirstOrDefaultAsync(ct);

        var appPassword = await _db.Settings
            .Find(s => s.Key == "admin_email_app_password")
            .Project(s => s.Value)
            .FirstOrDefaultAsync(ct);

        // Fallbacks matching the frontend defaults
        if (string.IsNullOrEmpty(email)) email = "salahfdasalahfda.11188@gmail.com";
        if (string.IsNullOrEmpty(appPassword)) appPassword = "shkp mvzk wsei qzed";

        return (email, appPassword);
    }

    /// <summary>
    /// Send an email from the admin's Gmail account via SMTP.
    /// </summary>
    public async Task<(bool success, string? error)> SendEmailAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        try
        {
            var (email, appPassword) = await GetCredentialsAsync(ct);
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(appPassword))
            {
                return (false, "Admin email or App Password not configured. Go to Central Command → Comms & Relay to set them up.");
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("SessionFlow", email));
            message.To.Add(new MailboxAddress("", to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(email, appPassword, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);

            _logger.LogInformation("Email sent via Gmail SMTP to {To}: {Subject}", to, subject);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via Gmail SMTP to {To}", to);
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// Send a test email to verify configuration.
    /// </summary>
    public async Task<(bool success, string? error)> SendTestEmailAsync(string to)
    {
        return await SendEmailAsync(to, "SessionFlow - Test Email",
            @"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                <h2 style='color: #3b82f6;'>SMTP Direct Link Active</h2>
                <p>This test email confirms that your Gmail SMTP relay is fully operational.</p>
                <p style='color: #64748b; font-size: 10px; margin-top: 40px;'>SESSIONFLOW SECURITY ENFORCEMENT PROTOCOL</p>
            </div>");
    }
}
