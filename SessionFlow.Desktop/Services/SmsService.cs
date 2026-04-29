using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Sends transactional SMS with provider fallback:
///   1st → Vonage (VONAGE_API_KEY + VONAGE_API_SECRET) — free trial available
///   2nd → Brevo  (BREVO_API_KEY) — if Vonage not configured
///
/// Egyptian number normalization:
///   Vonage: 01XXXXXXXXX → 201XXXXXXXXX  (no '+')
///   Brevo:  01XXXXXXXXX → +201XXXXXXXXX (with '+')
/// </summary>
public class SmsService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SmsService> _logger;

    private const string VonageUrl  = "https://rest.nexmo.com/sms/json";
    private const string BrevoUrl   = "https://api.brevo.com/v3/transactionalSMS/sms";
    private const string SenderName = "SessionFlow";

    public SmsService(IHttpClientFactory httpClientFactory, ILogger<SmsService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    // ─── Phone Normalization ──────────────────────────────────────────────────

    /// <summary>Normalize for Vonage: 01XXXXXXXXX → 201XXXXXXXXX (no '+')</summary>
    public static string NormalizeForVonage(string phone)
    {
        phone = phone.Trim().Replace(" ", "").Replace("-", "");
        if (phone.StartsWith("+2"))   return phone[1..];          // +201X → 201X
        if (phone.StartsWith("002"))  return phone[2..];          // 0020X → 20X (rare)
        if (phone.StartsWith("0") && phone.Length == 11) return "2" + phone; // 01X → 201X
        if (phone.StartsWith("2") && phone.Length == 12) return phone;       // already 201X
        return phone;
    }

    /// <summary>Normalize for Brevo: 01XXXXXXXXX → +201XXXXXXXXX (with '+')</summary>
    public static string NormalizeForBrevo(string phone)
    {
        phone = phone.Trim().Replace(" ", "").Replace("-", "");
        if (phone.StartsWith("+2"))  return phone;
        if (phone.StartsWith("002")) return "+" + phone[2..];
        if (phone.StartsWith("0") && phone.Length == 11) return "+2" + phone;
        if (phone.StartsWith("2") && phone.Length == 12) return "+" + phone;
        return phone;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /// <summary>
    /// Sends OTP SMS. Tries Vonage first, then Brevo as fallback.
    /// </summary>
    public Task<(bool success, string? error)> SendOtpAsync(
        string toPhone, string code, string purpose, CancellationToken ct = default)
    {
        var purposeLabel = purpose switch
        {
            "verify_phone" => "Phone Verification",
            "reset_pin"    => "PIN Reset",
            "forgot_pin"   => "PIN Reset",
            _              => "Verification"
        };

        var message = $"[SessionFlow] Your {purposeLabel} code is: {code}. Valid 5 min. Do not share.";
        return SendSmsAsync(toPhone, message, ct);
    }

    /// <summary>
    /// Sends an SMS with automatic provider selection and fallback.
    /// </summary>
    public async Task<(bool success, string? error)> SendSmsAsync(
        string toPhone, string message, CancellationToken ct = default)
    {
        // Try Vonage first
        var vonageKey    = Environment.GetEnvironmentVariable("VONAGE_API_KEY");
        var vonageSecret = Environment.GetEnvironmentVariable("VONAGE_API_SECRET");

        if (!string.IsNullOrEmpty(vonageKey) && !string.IsNullOrEmpty(vonageSecret))
        {
            var (ok, err) = await SendViaVonageAsync(toPhone, message, vonageKey, vonageSecret, ct);
            if (ok) return (true, null);
            _logger.LogWarning("[SMS] Vonage failed ({Err}), trying Brevo fallback.", err);
        }

        // Fallback to Brevo
        var brevoKey = Environment.GetEnvironmentVariable("BREVO_API_KEY");
        if (!string.IsNullOrEmpty(brevoKey))
            return await SendViaBrevoAsync(toPhone, message, brevoKey, ct);

        _logger.LogWarning("[SMS] No SMS provider configured. Set VONAGE_API_KEY/VONAGE_API_SECRET or BREVO_API_KEY.");
        return (false, "No SMS provider configured.");
    }

    // ─── Vonage Provider ──────────────────────────────────────────────────────

    private async Task<(bool, string?)> SendViaVonageAsync(
        string toPhone, string message,
        string apiKey, string apiSecret,
        CancellationToken ct)
    {
        var normalized = NormalizeForVonage(toPhone);

        var formData = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("api_key",    apiKey),
            new KeyValuePair<string, string>("api_secret", apiSecret),
            new KeyValuePair<string, string>("to",         normalized),
            new KeyValuePair<string, string>("from",       SenderName),
            new KeyValuePair<string, string>("text",       message),
        });

        try
        {
            using var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(VonageUrl, formData, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            // Vonage returns 200 even on error — must check the messages[].status field
            using var doc = JsonDocument.Parse(body);
            var messages = doc.RootElement.GetProperty("messages");
            var first    = messages[0];
            var status   = first.GetProperty("status").GetString();

            if (status == "0")
            {
                _logger.LogInformation("[SMS/Vonage] Sent to {Phone}", normalized);
                return (true, null);
            }

            var errorText = first.TryGetProperty("error-text", out var et) ? et.GetString() : "Unknown error";
            _logger.LogError("[SMS/Vonage] Error status={Status} msg={Msg}", status, errorText);
            return (false, $"Vonage error {status}: {errorText}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMS/Vonage] Exception sending to {Phone}", normalized);
            return (false, ex.Message);
        }
    }

    // ─── Brevo Provider ───────────────────────────────────────────────────────

    private async Task<(bool, string?)> SendViaBrevoAsync(
        string toPhone, string message,
        string apiKey, CancellationToken ct)
    {
        var normalized = NormalizeForBrevo(toPhone);
        var payload = new { sender = SenderName, recipient = normalized, content = message, type = "transactional" };

        try
        {
            using var client  = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, BrevoUrl);
            request.Headers.Add("api-key", apiKey);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await client.SendAsync(request, ct);
            var body     = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[SMS/Brevo] Sent to {Phone}", normalized);
                return (true, null);
            }

            _logger.LogError("[SMS/Brevo] Error ({Status}): {Body}", response.StatusCode, body);
            return (false, $"Brevo error: {response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMS/Brevo] Exception sending to {Phone}", normalized);
            return (false, ex.Message);
        }
    }
}
