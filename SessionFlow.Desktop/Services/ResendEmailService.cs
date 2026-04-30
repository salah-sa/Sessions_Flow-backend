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
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(10) };

    public ResendEmailService(ILogger<ResendEmailService> logger, IConfiguration config)
    {
        _logger = logger;
        _apiKey = config["Resend:ApiKey"] ?? Environment.GetEnvironmentVariable("RESEND_API_KEY");
        _fromAddress = config["Resend:From"] ?? Environment.GetEnvironmentVariable("RESEND_FROM") ?? "SessionFlow <onboarding@resend.dev>";
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

            _logger.LogError("[RESEND] ❌ {Status}: {Body}", response.StatusCode, body);
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
