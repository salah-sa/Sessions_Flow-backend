using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Sends transactional SMS via Brevo API.
/// Uses BREVO_API_KEY environment variable (same key as EmailService).
/// Egyptian numbers are normalized: 01XXXXXXXXX → +201XXXXXXXXX
/// </summary>
public class SmsService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SmsService> _logger;

    private const string BrevoSmsUrl = "https://api.brevo.com/v3/transactionalSMS/sms";
    private const string SenderName = "SessionFlow";

    public SmsService(IHttpClientFactory httpClientFactory, ILogger<SmsService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Normalizes Egyptian phone numbers to E.164 format (+2 prefix).
    /// Handles: 01XXXXXXXXX → +201XXXXXXXXX
    /// Already-formatted +201XXXXXXXXX passes through unchanged.
    /// </summary>
    public static string NormalizeEgyptianPhone(string phone)
    {
        phone = phone.Trim().Replace(" ", "").Replace("-", "");

        if (phone.StartsWith("+2")) return phone;          // already E.164
        if (phone.StartsWith("002")) return "+" + phone[2..]; // 002 prefix
        if (phone.StartsWith("2") && phone.Length == 12) return "+" + phone;
        if (phone.StartsWith("0") && phone.Length == 11) return "+2" + phone;
        if (phone.Length == 10) return "+20" + phone;

        return phone; // return as-is, let Brevo reject it with a clear error
    }

    /// <summary>
    /// Sends an SMS message. Returns (success, error).
    /// </summary>
    public async Task<(bool success, string? error)> SendSmsAsync(string toPhone, string message, CancellationToken ct = default)
    {
        var apiKey = Environment.GetEnvironmentVariable("BREVO_API_KEY");
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("[SMS] BREVO_API_KEY not configured — SMS to {Phone} skipped.", toPhone);
            return (false, "SMS provider not configured. Set BREVO_API_KEY environment variable.");
        }

        var normalized = NormalizeEgyptianPhone(toPhone);

        var payload = new
        {
            sender = SenderName,
            recipient = normalized,
            content = message,
            type = "transactional"
        };

        try
        {
            var json = JsonSerializer.Serialize(payload);
            using var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, BrevoSmsUrl);
            request.Headers.Add("api-key", apiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[SMS] Sent to {Phone} via Brevo.", normalized);
                return (true, null);
            }

            _logger.LogError("[SMS] Brevo error ({Status}): {Body}", response.StatusCode, body);
            return (false, $"Brevo SMS error: {response.StatusCode} — {body}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMS] Exception sending SMS to {Phone}", normalized);
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// Sends an OTP code message with standard formatting.
    /// </summary>
    public Task<(bool success, string? error)> SendOtpAsync(string toPhone, string code, string purpose, CancellationToken ct = default)
    {
        var purposeLabel = purpose switch
        {
            "verify_phone" => "Phone Verification",
            "reset_pin"    => "PIN Reset",
            "forgot_pin"   => "PIN Reset",
            _              => "Verification"
        };

        var message = $"[SessionFlow] Your {purposeLabel} code is: {code}\nValid for 5 minutes. Do not share this code.";
        return SendSmsAsync(toPhone, message, ct);
    }
}
