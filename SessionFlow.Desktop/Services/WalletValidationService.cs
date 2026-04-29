using System.Text.RegularExpressions;

namespace SessionFlow.Desktop.Services;

public class WalletValidationService
{
    public bool IsValidEgyptianNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return false;
        
        // Starts with 010, 011, 012, or 015 and has exactly 11 digits
        return Regex.IsMatch(phone, @"^(010|011|012|015)\d{8}$");
    }

    public bool IsValidAmount(long amountPiasters)
    {
        // 1 to 10,000,000 piasters (0.01 EGP to 100,000 EGP)
        return amountPiasters >= 1 && amountPiasters <= 10000000;
    }

    public bool IsValidPin(string pin)
    {
        if (string.IsNullOrWhiteSpace(pin)) return false;
        
        // Exactly 4 or 6 digits, numeric only
        return Regex.IsMatch(pin, @"^(\d{4}|\d{6})$");
    }

    public string GenerateReferenceCode()
    {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var randomString = new char[8];
        var random = new Random();

        for (int i = 0; i < randomString.Length; i++)
        {
            randomString[i] = chars[random.Next(chars.Length)];
        }

        var dateString = DateTimeOffset.UtcNow.ToString("yyyyMMdd");
        
        return $"TXN-{dateString}-{new string(randomString)}";
    }
}
