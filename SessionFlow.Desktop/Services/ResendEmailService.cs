using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Lightweight email sender using Resend.com API (HTTPS only, no SMTP).
/// Free tier: 100 emails/day, 3000/month. No credit card needed.
/// Set RESEND_API_KEY env var on Railway.
/// </summary>
public class ResendEmailService
{
    private readonly ILogger<ResendEmailService> _logger;
    private readonly string? _apiKey;
    private readonly string _fromAddress;
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(30) };

    public ResendEmailService(ILogger<ResendEmailService> logger, IConfiguration config)
    {
        _logger = logger;
        _apiKey = config["Resend:ApiKey"] ?? Environment.GetEnvironmentVariable("RESEND_API_KEY");
        _fromAddress = config["Resend:From"] ?? Environment.GetEnvironmentVariable("RESEND_FROM") ?? "SessionFlow <noreply@sessionflow.uk>";
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public async Task<(bool success, string? error)> SendAsync(string to, string subject, string htmlBody)
    {
        if (!IsConfigured)
        {
            _logger.LogError("[RESEND] API key not configured. Set RESEND_API_KEY env var.");
            return (false, "Email service not configured. Set RESEND_API_KEY.");
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var payload = JsonSerializer.Serialize(new
            {
                from = _fromAddress,
                to = new[] { to },
                subject,
                html = htmlBody
            });

            request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[RESEND] ✅ Email sent to {To}: {Subject}", to, subject);
                return (true, null);
            }

            // Detect Sandbox restriction (Forbidden 403 or Validation Error 422)
            if (body.Contains("testing emails to your own email address") || body.Contains("unauthorized_email_address") || body.Contains("Forbidden"))
            {
                 var sandboxMsg = "Resend Sandbox Mode: Verification failed. You can only send emails to your own registered address until you verify a domain at resend.com.";
                 _logger.LogWarning("[RESEND] ⚠️ Sandbox block for {To}: {Msg}", to, sandboxMsg);
                 return (false, sandboxMsg);
            }

            // Detect validation errors (invalid email, missing fields)
            if (body.Contains("validation_error") || body.Contains("missing_required_field") || body.Contains("invalid_to_address"))
            {
                 _logger.LogError("[RESEND] ❌ Validation error for {To}: {Body}", to, body);
                 return (false, $"Resend validation error for {to}: {body}");
            }

            _logger.LogError("[RESEND] ❌ Failed to send to {To} | Status={Status} | Response={Body}", to, response.StatusCode, body);
            return (false, $"Resend error ({response.StatusCode}): {body}");
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("[RESEND] ⏱ Timeout sending email to {To}", to);
            return (false, "Email send timed out. Try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RESEND] Exception sending to {To}", to);
            return (false, ex.Message);
        }
    }
}
