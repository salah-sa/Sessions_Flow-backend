using StackExchange.Redis;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using Microsoft.Extensions.Hosting;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Redis-backed OTP service for phone verification and PIN reset using Email OTP.
/// Codes are 6 digits, stored with 5-minute TTL.
/// Rate limit: max 50 sends per phone per hour.
/// </summary>
public class OtpService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<OtpService> _logger;
    private readonly GmailSenderService _gmail;
    private readonly IHostEnvironment _env;

    private const int OtpTtlMinutes = 5;
    private const int MaxSendsPerHour = 50;
    private const int MaxVerifyAttempts = 5;

    public OtpService(IConnectionMultiplexer redis, ILogger<OtpService> logger, GmailSenderService gmail, IHostEnvironment env)
    {
        _redis = redis;
        _logger = logger;
        _gmail = gmail;
        _env = env;
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

        var code = GenerateCode();
        var db = _redis.GetDatabase();

        // Save OTP
        await db.StringSetAsync(OtpKey(phone, purpose), code, TimeSpan.FromMinutes(OtpTtlMinutes));
        await db.KeyDeleteAsync(AttemptsKey(phone, purpose));

        // Increment rate limit
        var rKey = RateKey(phone);
        await db.StringIncrementAsync(rKey);
        await db.KeyExpireAsync(rKey, TimeSpan.FromHours(1));

        // Send Email
        string subject = purpose == "reset_pin" ? "SessionFlow Wallet PIN Reset" : "SessionFlow Wallet Verification";
        string htmlBody = $@"
            <div style='font-family:sans-serif;max-width:400px;margin:auto;'>
                <h2>SessionFlow Wallet</h2>
                <p>Your verification code for phone number <b>{phone}</b> is:</p>
                <h1 style='color:#6366f1;font-size:32px;letter-spacing:4px;'>{code}</h1>
                <p>This code will expire in {OtpTtlMinutes} minutes.</p>
                <p><small>If you did not request this, please ignore this email.</small></p>
            </div>";

        var (success, sendError) = await _gmail.SendEmailAsync(emailTo, subject, htmlBody);
        
        if (!success)
        {
            _logger.LogError("[OTP-EMAIL] Failed to send OTP to {Email}: {Err}", emailTo, sendError);
            return (null, sendError ?? "Failed to send verification email. Please contact support.");
        }

        return (_env.IsDevelopment() ? code : null, null);
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
