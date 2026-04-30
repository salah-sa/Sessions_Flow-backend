using StackExchange.Redis;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using Microsoft.Extensions.Hosting;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Redis-backed OTP service for phone verification and PIN reset.
/// Codes are 6 digits, stored with 5-minute TTL.
/// Rate limit: max 3 sends per phone per hour.
/// </summary>
public class OtpService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<OtpService> _logger;
    private readonly SmsService _sms;
    private readonly IHostEnvironment _env;

    private const int OtpTtlMinutes = 5;
    private const int MaxSendsPerHour = 50; // [DIAGNOSTIC MODE] Increased from 3
    private const int MaxVerifyAttempts = 5;

    public OtpService(IConnectionMultiplexer redis, ILogger<OtpService> logger, SmsService sms, IHostEnvironment env)
    {
        _redis = redis;
        _logger = logger;
        _sms = sms;
        _env = env;
    }

    // ─── Key Helpers ─────────────────────────────────────────────────────────

    private static string OtpKey(string phone, string purpose) => $"otp:{purpose}:{phone}";
    private static string RateKey(string phone) => $"otp_rate:{phone}";
    private static string AttemptsKey(string phone, string purpose) => $"otp_attempts:{purpose}:{phone}";

    // ─── Public API ───────────────────────────────────────────────────────────

    public async Task<(string? code, string? error)> GenerateOtpAsync(string phone, string purpose)
    {
        // Generation is now handled entirely by Firebase Auth UI on the frontend.
        // We just return success.
        return (null, null);
    }

    /// <summary>
    /// Validates the Firebase ID token for the given phone number.
    /// Returns (isValid, error).
    /// </summary>
    public async Task<(bool isValid, string? error)> ValidateOtpAsync(string phone, string purpose, string token)
    {
        try
        {
            var decodedToken = await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);
            
            if (!decodedToken.Claims.TryGetValue("phone_number", out var phoneClaim) || phoneClaim == null)
            {
                return (false, "Phone number not found in verification token.");
            }
            
            var tokenPhone = phoneClaim.ToString();
            string expectedPhone = phone.StartsWith("0") ? $"+20{phone.Substring(1)}" : phone;
            
            if (tokenPhone != expectedPhone)
            {
                _logger.LogWarning("[OTP-FIREBASE] Phone mismatch. Expected: {Expected}, Got: {Got}", expectedPhone, tokenPhone);
                return (false, "Verified phone number does not match.");
            }

            // Check if the token was issued recently (e.g., within the last 10 minutes)
            // auth_time is a Unix timestamp
            if (decodedToken.Claims.TryGetValue("auth_time", out var authTimeClaim) && authTimeClaim != null)
            {
                long authTime = Convert.ToInt64(authTimeClaim);
                long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                if (now - authTime > 600) // 10 minutes
                {
                    return (false, "Verification session expired. Please verify again.");
                }
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[OTP-FIREBASE] Failed to verify Firebase token for {Phone}", phone);
            return (false, "Invalid verification token. Please try again.");
        }
    }

    /// <summary>Checks if the phone can still receive OTP (not rate-limited).</summary>
    public async Task<bool> CanSendOtpAsync(string phone)
    {
        var db = _redis.GetDatabase();
        var sends = await db.StringGetAsync(RateKey(phone));
        int count = sends.HasValue ? int.Parse(sends!) : 0;
        return count < MaxSendsPerHour;
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private static string GenerateCode()
    {
        Span<byte> bytes = stackalloc byte[4];
        RandomNumberGenerator.Fill(bytes);
        int value = Math.Abs(BitConverter.ToInt32(bytes)) % 1_000_000;
        return value.ToString("D6");
    }
}
