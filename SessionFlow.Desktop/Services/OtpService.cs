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
    private readonly WhatsAppService _wa;
    private readonly IHostEnvironment _env;

    private const int OtpTtlMinutes = 5;
    private const int MaxSendsPerHour = 50;
    private const int MaxVerifyAttempts = 5;

    public OtpService(IConnectionMultiplexer redis, ILogger<OtpService> logger, GmailSenderService gmail, WhatsAppService wa, IHostEnvironment env)
    {
        _redis = redis;
        _logger = logger;
        _gmail = gmail;
        _wa = wa;
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

        // ── Send OTP via Email first (Resend API — fast and reliable) ──
        string subject = purpose == "reset_pin" ? "SessionFlow Wallet PIN Reset" : "SessionFlow Wallet Verification";
        string htmlBody = $@"
            <div style='font-family:sans-serif;max-width:400px;margin:auto;padding:24px;background:#0f0f1a;border-radius:16px;border:1px solid rgba(255,255,255,0.1);'>
                <h2 style='color:white;margin:0 0 8px;'>SessionFlow Wallet</h2>
                <p style='color:#94a3b8;font-size:14px;'>Your verification code for phone <b style='color:white;'>{phone}</b>:</p>
                <h1 style='color:#6366f1;font-size:36px;letter-spacing:6px;text-align:center;margin:20px 0;'>{code}</h1>
                <p style='color:#64748b;font-size:12px;'>Expires in {OtpTtlMinutes} minutes. If you didn't request this, ignore it.</p>
            </div>";

        var (emailSuccess, emailError) = await _gmail.SendEmailAsync(emailTo, subject, htmlBody);
        bool delivered = emailSuccess;

        if (!emailSuccess)
        {
            _logger.LogWarning("[OTP] Email delivery failed: {Err}. Trying WhatsApp with timeout...", emailError);

            // Try WhatsApp as backup with 5-second timeout (it often hangs)
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                var waTask = _wa.SendOtpAsync(phone, code);
                var completedTask = await Task.WhenAny(waTask, Task.Delay(5000, cts.Token));

                if (completedTask == waTask)
                {
                    var (waOk, waErr) = await waTask;
                    delivered = waOk;
                    if (!waOk) _logger.LogWarning("[OTP-WA] WhatsApp failed: {Err}", waErr);
                }
                else
                {
                    _logger.LogWarning("[OTP-WA] WhatsApp timed out after 5s. Skipping.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[OTP-WA] WhatsApp exception. Skipping.");
            }
        }

        // Always return the code — if delivery failed, frontend shows it inline
        return (code, null);
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
