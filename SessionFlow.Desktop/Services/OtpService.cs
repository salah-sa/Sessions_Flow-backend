using StackExchange.Redis;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Redis-backed OTP service using Resend.com for email delivery.
/// Falls back to in-memory store if Redis is unavailable.
/// Codes are 6 digits, stored with 5-minute TTL.
/// Rate limit: max 50 sends per phone per hour.
/// </summary>
public class OtpService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<OtpService> _logger;
    private readonly ResendEmailService _resend;

    // In-memory fallback when Redis is unavailable
    private static readonly ConcurrentDictionary<string, (string code, DateTime expiry)> _memStore = new();
    private static readonly ConcurrentDictionary<string, int> _memAttempts = new();

    private const int OtpTtlMinutes = 5;
    private const int MaxSendsPerHour = 50;
    private const int MaxVerifyAttempts = 5;

    public OtpService(IConnectionMultiplexer? redis, ILogger<OtpService> logger, ResendEmailService resend)
    {
        _redis = redis;
        _logger = logger;
        _resend = resend;
    }

    // ─── Key Helpers ─────────────────────────────────────────────────────────

    private static string OtpKey(string phone, string purpose) => $"otp:{purpose}:{phone}";
    private static string RateKey(string phone) => $"otp_rate:{phone}";
    private static string AttemptsKey(string phone, string purpose) => $"otp_attempts:{purpose}:{phone}";

    private bool UseRedis => _redis?.IsConnected == true;

    // ─── Store Helpers (Redis ↔ In-Memory fallback) ───────────────────────────

    private async Task StoreOtpAsync(string key, string code)
    {
        if (UseRedis)
        {
            var db = _redis!.GetDatabase();
            await db.StringSetAsync(key, code, TimeSpan.FromMinutes(OtpTtlMinutes));
        }
        else
        {
            _memStore[key] = (code, DateTime.UtcNow.AddMinutes(OtpTtlMinutes));
        }
    }

    private async Task<string?> GetOtpAsync(string key)
    {
        if (UseRedis)
        {
            var db = _redis!.GetDatabase();
            var val = await db.StringGetAsync(key);
            return val.HasValue ? val.ToString() : null;
        }
        if (_memStore.TryGetValue(key, out var entry) && entry.expiry > DateTime.UtcNow)
            return entry.code;
        _memStore.TryRemove(key, out _);
        return null;
    }

    private async Task DeleteKeyAsync(string key)
    {
        if (UseRedis) await _redis!.GetDatabase().KeyDeleteAsync(key);
        else { _memStore.TryRemove(key, out _); _memAttempts.TryRemove(key, out _); }
    }

    private async Task<long> IncrAttemptsAsync(string key)
    {
        if (UseRedis)
        {
            var db = _redis!.GetDatabase();
            var attempts = await db.StringIncrementAsync(key);
            if (attempts == 1) await db.KeyExpireAsync(key, TimeSpan.FromMinutes(OtpTtlMinutes));
            return attempts;
        }
        return _memAttempts.AddOrUpdate(key, 1, (_, v) => v + 1);
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    public async Task<(string? code, string? error)> GenerateOtpAsync(string phone, string emailTo, string purpose)
    {
        if (!_resend.IsConfigured)
        {
            _logger.LogError("[OTP] RESEND_API_KEY is not configured. Cannot send OTP.");
            return (null, "Email service not configured. Contact support.");
        }

        if (!await CanSendOtpAsync(phone))
            return (null, "Too many OTP requests. Please try again later.");


        var code = GenerateCode();
        var otpKey = OtpKey(phone, purpose);

        await StoreOtpAsync(otpKey, code);
        await DeleteKeyAsync(AttemptsKey(phone, purpose));

        // Increment rate limit
        if (UseRedis)
        {
            var db = _redis!.GetDatabase();
            var rKey = RateKey(phone);
            await db.StringIncrementAsync(rKey);
            await db.KeyExpireAsync(rKey, TimeSpan.FromHours(1));
        }

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
        {(purpose == "reset_pin" ? "Your PIN reset" : "Your verification")} code
    </p>
    <div style='background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:16px;padding:20px;text-align:center;margin-bottom:24px;'>
        <span style='color:#818cf8;font-size:36px;font-weight:800;letter-spacing:8px;font-family:monospace;'>{code}</span>
    </div>
    <p style='color:#64748b;font-size:12px;text-align:center;margin:0;'>
        Expires in {OtpTtlMinutes} minutes · Do not share this code
    </p>
</div>";

        _logger.LogInformation("[OTP] Sending code to {Email} for phone {Phone} ({Purpose})", emailTo, phone, purpose);
        var (ok, err) = await _resend.SendAsync(emailTo, subject, htmlBody);

        if (!ok)
        {
            _logger.LogError("[OTP] ❌ Resend failed for {Email}: {Err}", emailTo, err);
            await DeleteKeyAsync(otpKey);
            return (null, err ?? "Failed to send verification code. Please try again.");
        }

        _logger.LogInformation("[OTP] ✅ Code delivered to {Email}", emailTo);
        return (null, null); // Never return code to client
    }



    public async Task<(bool isValid, string? error)> ValidateOtpAsync(string phone, string purpose, string code)
    {
        var attemptKey = AttemptsKey(phone, purpose);
        var otpKey = OtpKey(phone, purpose);

        var attempts = await IncrAttemptsAsync(attemptKey);
        if (attempts > MaxVerifyAttempts)
        {
            await DeleteKeyAsync(otpKey);
            return (false, "Too many failed attempts. Please request a new code.");
        }

        var savedCode = await GetOtpAsync(otpKey);
        if (savedCode == null) return (false, "Verification code expired or invalid.");

        if (savedCode != code) return (false, "Incorrect verification code.");

        // Valid!
        await DeleteKeyAsync(otpKey);
        await DeleteKeyAsync(attemptKey);
        return (true, null);
    }

    public async Task<bool> CanSendOtpAsync(string phone)
    {
        if (!UseRedis) return true; // No rate limiting without Redis
        var db = _redis!.GetDatabase();
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
