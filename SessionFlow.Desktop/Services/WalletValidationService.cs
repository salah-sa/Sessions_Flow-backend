using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace SessionFlow.Desktop.Services;

public class WalletValidationService
{
    private static readonly Regex EgyptianPhoneRegex = new(@"^(010|011|012|015)\d{8}$", RegexOptions.Compiled);
    private static readonly Regex PinRegex = new(@"^(\d{4}|\d{6})$", RegexOptions.Compiled);
    private static readonly Regex HtmlTagRegex = new(@"<[^>]*>", RegexOptions.Compiled);

    public bool IsValidEgyptianNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return false;
        return EgyptianPhoneRegex.IsMatch(phone);
    }

    public bool IsValidAmount(long amountPiasters)
    {
        // 1 to 10,000,000 piasters (0.01 EGP to 100,000 EGP)
        return amountPiasters >= 1 && amountPiasters <= 10_000_000;
    }

    public bool IsValidPin(string pin)
    {
        if (string.IsNullOrWhiteSpace(pin)) return false;
        return PinRegex.IsMatch(pin);
    }

    public string GenerateReferenceCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Span<byte> randomBytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(randomBytes);

        var result = new char[8];
        for (int i = 0; i < 8; i++)
        {
            result[i] = chars[randomBytes[i] % chars.Length];
        }

        var dateString = DateTimeOffset.UtcNow.ToString("yyyyMMdd");
        return $"TXN-{dateString}-{new string(result)}";
    }

    /// <summary>
    /// Sanitizes a user-provided note: strips HTML, trims, and enforces max length.
    /// </summary>
    public string? SanitizeNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note)) return null;
        var sanitized = HtmlTagRegex.Replace(note, string.Empty).Trim();
        if (sanitized.Length > 100) sanitized = sanitized[..100];
        return sanitized;
    }
}
