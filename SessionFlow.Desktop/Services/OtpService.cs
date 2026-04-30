using StackExchange.Redis;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Redis-backed OTP service using Resend.com for email delivery.
/// Codes are 6 digits, stored with 5-minute TTL.
/// Rate limit: max 50 sends per phone per hour.
/// </summary>
public class OtpService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<OtpService> _logger;
    private readonly ResendEmailService _resend;

    private const int OtpTtlMinutes = 5;
    private const int MaxSendsPerHour = 50;
    private const int MaxVerifyAttempts = 5;

    public OtpService(IConnectionMultiplexer redis, ILogger<OtpService> logger, ResendEmailService resend)
    {
        _redis = redis;
        _logger = logger;
        _resend = resend;
    }

    // ─── Key Helpers ─────────────────────────────────────────────────────────

    private static string OtpKey(string phone, string purpose) => $"otp:{purpose}:{phone}";
    private static string RateKey(string phone) => $"otp_rate:{phone}";
    private static string AttemptsKey(string phone, string purpose) => $"otp_attempts:{purpose}:{phone}";

    // ─── Public API ───────────────────────────────────────────────────────────

    public async Task<(string? code, string? error)> GenerateOtpAsync(string phone, string emailTo, string purpose)
    {
        if (!await CanSendOtpAsync(phone))
            return (null, "Too many OTP requests. Please try again later.");

        if (!_resend.IsConfigured)
            return (null, "Email service not configured. Contact support.");

        var code = GenerateCode();
        var db = _redis.GetDatabase();

        // Save OTP to Redis
        await db.StringSetAsync(OtpKey(phone, purpose), code, TimeSpan.FromMinutes(OtpTtlMinutes));
        await db.KeyDeleteAsync(AttemptsKey(phone, purpose));

        // Increment rate limit
        var rKey = RateKey(phone);
        await db.StringIncrementAsync(rKey);
        await db.KeyExpireAsync(rKey, TimeSpan.FromHours(1));

        // Send via Resend (HTTPS, ~1-2 seconds, never hangs)
        string subject = purpose == "reset_pin" 
            ? "SessionFlow — PIN Reset Code" 
            : "SessionFlow — Verification Code";

        string htmlBody = $@"
<div style='font-family:-apple-system,sans-serif;max-width:420px;margin:auto;padding:32px;background:#0f0f1a;border-radius:20px;border:1px solid rgba(255,255,255,0.08);'>
    <div style='text-align:center;margin-bottom:24px;'>
        <div style='display:inline-block;background:rgba(99,102,241,0.15);border-radius:16px;padding:12px 16px;'>
            <span style='font-size:24px;'>🔐</span>
        </div>
    </div>
    <h2 style='color:#fff;font-size:20px;text-align:center;margin:0 0 8px;'>SessionFlow Wallet</h2>
    <p style='color:#94a3b8;font-size:14px;text-align:center;margin:0 0 24px;'>
        {(purpose == "reset_pin" ? "Your PIN reset" : "Your verification")} code for <b style='color:#e2e8f0;'>{phone}</b>
    </p>
    <div style='background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:16px;padding:20px;text-align:center;margin-bottom:24px;'>
        <span style='color:#818cf8;font-size:36px;font-weight:800;letter-spacing:8px;font-family:monospace;'>{code}</span>
    </div>
    <p style='color:#64748b;font-size:12px;text-align:center;margin:0;'>
        Expires in {OtpTtlMinutes} minutes · Do not share this code
    </p>
</div>";

        var (ok, err) = await _resend.SendAsync(emailTo, subject, htmlBody);

        if (!ok)
        {
            _logger.LogError("[OTP] Failed to send code to {Email}: {Err}", emailTo, err);
            // Clean up the stored OTP since we couldn't deliver it
            await db.KeyDeleteAsync(OtpKey(phone, purpose));
            return (null, "Failed to send verification code. Please try again.");
        }

        _logger.LogInformation("[OTP] Code sent to {Email} for {Phone} ({Purpose})", emailTo, phone, purpose);
        return (null, null); // Never return code to client
    }

    public async Task<(bool isValid, string? error)> ValidateOtpAsync(string phone, string purpose, string code)
    {
        var db = _redis.GetDatabase();
        var attemptKey = AttemptsKey(phone, purpose);
        var attempts = await db.StringIncrementAsync(attemptKey);
        
        if (attempts == 1) await db.KeyExpireAsync(attemptKey, TimeSpan.FromMinutes(OtpTtlMinutes));
        if (attempts > MaxVerifyAttempts)
        {
            await db.KeyDeleteAsync(OtpKey(phone, purpose));
            return (false, "Too many failed attempts. Please request a new code.");
        }

        var savedCode = await db.StringGetAsync(OtpKey(phone, purpose));
        if (!savedCode.HasValue) return (false, "Verification code expired or invalid.");

        if (savedCode != code) return (false, "Incorrect verification code.");

        // Valid!
        await db.KeyDeleteAsync(OtpKey(phone, purpose));
        await db.KeyDeleteAsync(attemptKey);
        return (true, null);
    }

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
