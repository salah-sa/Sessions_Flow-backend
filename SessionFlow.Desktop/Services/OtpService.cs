using StackExchange.Redis;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Redis-backed OTP service using Resend API (via EmailService) for email delivery.
/// Verified domain: sessionflow.uk — sends to any address.
/// Codes are 6 digits, stored with 5-minute TTL.
/// Rate limit: max 50 sends per phone per hour.
/// </summary>
public class OtpService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<OtpService> _logger;
    private readonly EmailService _email;
    private readonly NotificationService _notifications;

    // In-memory fallback when Redis is unavailable
    private static readonly ConcurrentDictionary<string, (string code, DateTime expiry)> _memStore = new();
    private static readonly ConcurrentDictionary<string, int> _memAttempts = new();

    private const int OtpTtlMinutes = 5;
    private const int MaxSendsPerHour = 50;
    private const int MaxVerifyAttempts = 5;

    public OtpService(IConnectionMultiplexer? redis, ILogger<OtpService> logger, EmailService email, NotificationService notifications)
    {
        _redis = redis;
        _logger = logger;
        _email = email;
        _notifications = notifications;
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

        // Send via Resend (HTTPS, ~1-2 seconds, verified domain — works for any address)
        string subject = purpose == "reset_pin"
            ? "SessionFlow — PIN Reset Code"
            : "SessionFlow — Verification Code";

        string htmlBody = $@"
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0e1a;padding:40px 20px;'>
  <tr><td align='center'>
    <table width='480' cellpadding='0' cellspacing='0' style='background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;border-radius:16px;overflow:hidden;'>
      <tr><td style='background:linear-gradient(135deg,#4f46e5,#6366f1,#818cf8);padding:24px 32px;text-align:center;'>
        <span style='font-size:14px;font-weight:700;color:#fff;letter-spacing:2.5px;text-transform:uppercase;font-family:Inter,Segoe UI,sans-serif;'>SESSIONFLOW</span>
      </td></tr>
      <tr><td style='padding:32px;font-family:Inter,Segoe UI,Helvetica Neue,sans-serif;text-align:center;'>
        <div style='display:inline-block;background:rgba(99,102,241,0.15);border-radius:16px;padding:12px 16px;margin-bottom:16px;'>
          <span style='font-size:28px;'>🔐</span>
        </div>
        <h2 style='color:#f1f5f9;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;'>{(purpose == "reset_pin" ? "PIN Reset Code" : "Verification Code")}</h2>
        <p style='font-size:14px;color:#94a3b8;margin:0 0 24px;'>Enter this code to continue</p>
        <div style='background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin:0 0 24px;'>
          <span style='color:#a78bfa;font-size:36px;font-weight:800;letter-spacing:10px;font-family:Fira Code,Courier New,monospace;'>{code}</span>
        </div>
        <p style='font-size:12px;color:#64748b;margin:0;'>Expires in {OtpTtlMinutes} minutes · Do not share this code</p>
        <hr style='border:none;border-top:1px solid #1e293b;margin:28px 0;'/>
      </td></tr>
      <tr><td style='padding:0 32px 28px;font-family:Inter,Segoe UI,sans-serif;text-align:center;'>
        <p style='font-size:11px;color:#475569;margin:0 0 4px;line-height:1.5;'>If you did not request this code, please ignore this email.</p>
        <p style='font-size:11px;color:#334155;margin:0;'>© {DateTime.UtcNow.Year} SessionFlow — Powered by precision.</p>
      </td></tr>
    </table>
  </td></tr>
</table>";

        _logger.LogInformation("[OTP] Sending code to {Email} for phone {Phone} ({Purpose})", emailTo, phone, purpose);

        // Hard cap: entire email delivery must complete within 12 seconds
        using var sendCts = new CancellationTokenSource(TimeSpan.FromSeconds(12));
        bool ok; string? err;
        try
        {
            (ok, err) = await _email.SendEmailAsync(emailTo, subject, htmlBody, sendCts.Token);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("[OTP] ⏱ Email send timed out for {Email}", emailTo);
            await DeleteKeyAsync(otpKey);
            return (null, "Email delivery timed out. Please try again.");
        }

        if (!ok)
        {
            _logger.LogWarning("[OTP] ❌ Email delivery failed for {Email}: {Err}", emailTo, err);
            // Delete the OTP so stale entries don't accumulate
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
