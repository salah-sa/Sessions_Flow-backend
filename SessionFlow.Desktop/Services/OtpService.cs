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

    /// <summary>
    /// Generates and stores a new OTP for the given phone + purpose.
    /// Returns (code, error). Error is non-null if rate limited.
    /// In production: replace the logger.LogWarning line with a real SMS send.
    /// </summary>
    public async Task<(string? code, string? error)> GenerateOtpAsync(string phone, string purpose)
    {
        var db = _redis.GetDatabase();
        var rateKey = RateKey(phone);

        // Rate limit check
        var sends = await db.StringGetAsync(rateKey);
        int sendCount = sends.HasValue ? int.Parse(sends!) : 0;
        if (sendCount >= MaxSendsPerHour)
            return (null, "Too many OTP requests. Please wait before requesting another code.");

        // Generate secure 6-digit code
        var code = GenerateCode();

        // Store OTP with TTL
        await db.StringSetAsync(OtpKey(phone, purpose), code, TimeSpan.FromMinutes(OtpTtlMinutes));

        // Reset verify attempts counter
        await db.KeyDeleteAsync(AttemptsKey(phone, purpose));

        // Increment rate counter (1-hour window)
        await db.StringIncrementAsync(rateKey);
        await db.KeyExpireAsync(rateKey, TimeSpan.FromHours(1));

        // Send real SMS via Brevo
        var (smsSent, smsError) = await _sms.SendOtpAsync(phone, code, purpose);
        if (!smsSent)
        {
            _logger.LogWarning("[OTP-SMS] SMS delivery failed for {Phone}: {Error}", phone, smsError);
            // Still return the code in development so devs can test without SMS credits
            if (_env.IsDevelopment())
                return (code, null);
            // In production, fail loudly so the user knows to retry
            return (null, $"Failed to send SMS: {smsError}");
        }

        _logger.LogInformation("[OTP-SMS] SMS sent to {Phone} for purpose={Purpose}", phone, purpose);

        // Only expose devCode in Development (never in production)
        var devCode = _env.IsDevelopment() ? code : null;
        return (devCode, null);
    }

    /// <summary>
    /// Validates the OTP. Deletes it on success to prevent reuse.
    /// Returns (isValid, error).
    /// </summary>
    public async Task<(bool isValid, string? error)> ValidateOtpAsync(string phone, string purpose, string code)
    {
        var db = _redis.GetDatabase();
        var attKey = AttemptsKey(phone, purpose);

        // Attempt rate limit
        var attemptsStr = await db.StringGetAsync(attKey);
        int attempts = attemptsStr.HasValue ? int.Parse(attemptsStr!) : 0;
        if (attempts >= MaxVerifyAttempts)
            return (false, "Too many incorrect attempts. Please request a new code.");

        var storedCode = await db.StringGetAsync(OtpKey(phone, purpose));
        if (!storedCode.HasValue)
            return (false, "OTP expired or not found. Please request a new code.");

        if (storedCode != code)
        {
            await db.StringIncrementAsync(attKey);
            await db.KeyExpireAsync(attKey, TimeSpan.FromMinutes(OtpTtlMinutes));
            int remaining = MaxVerifyAttempts - (attempts + 1);
            return (false, $"Invalid code. {remaining} attempts remaining.");
        }

        // Success — delete OTP and clear attempt counter
        await db.KeyDeleteAsync(OtpKey(phone, purpose));
        await db.KeyDeleteAsync(attKey);

        return (true, null);
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
