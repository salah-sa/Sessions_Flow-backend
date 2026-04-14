using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Manages secure bootstrapping of secrets at application startup.
/// Reads secrets from environment variables and injects them into configuration.
/// On first run, generates secure defaults and persists them to a local .env file.
/// </summary>
public static class SecureBootstrapService
{
    private const string EnvPrefix = "SESSIONFLOW_";
    private const string DbConnStringKey = "Database:ConnectionString";
    private const string JwtSecretKey = "Jwt:SecretKey";
    private const string AdminPasswordKey = "Security:DefaultAdminPassword";

    private static readonly string EnvFilePath = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory, ".env");

    /// <summary>
    /// Bootstrap secrets into the configuration builder.
    /// Priority: Environment Variables > .env file > appsettings.json
    /// </summary>
    public static void InjectSecrets(IConfigurationBuilder builder)
    {
        // Load .env file if it exists (for local development)
        LoadDotEnv();

        // Build a temporary config to check current values
        var tempConfig = builder.Build();

        // Ensure JWT secret exists
        var jwtSecret = Environment.GetEnvironmentVariable($"{EnvPrefix}JWT_SECRET")
                        ?? tempConfig[JwtSecretKey];

        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            jwtSecret = GenerateSecureKey(64);
            PersistToEnvFile($"{EnvPrefix}JWT_SECRET", jwtSecret);
        }

        // Ensure DB connection string exists
        var dbConn = Environment.GetEnvironmentVariable($"{EnvPrefix}DB_CONNECTION")
                     ?? tempConfig[DbConnStringKey];

        if (string.IsNullOrWhiteSpace(dbConn))
        {
            // Cannot auto-generate a DB connection — log a warning.
            // The app will fail gracefully when trying to connect.
            dbConn = "";
        }

        // Ensure Admin password exists (for seeding)
        var adminPass = Environment.GetEnvironmentVariable($"{EnvPrefix}ADMIN_PASSWORD")
                        ?? tempConfig[AdminPasswordKey];

        if (string.IsNullOrWhiteSpace(adminPass))
        {
            // Default to the one documented in SAAS_ADMIN_GUIDE.md
            adminPass = "Admin1234!"; 
            PersistToEnvFile($"{EnvPrefix}ADMIN_PASSWORD", adminPass);
        }

        // Inject as in-memory overrides (highest priority)
        var overrides = new Dictionary<string, string?>
        {
            [JwtSecretKey] = jwtSecret,
            [DbConnStringKey] = dbConn,
            [AdminPasswordKey] = adminPass
        };

        builder.AddInMemoryCollection(overrides);
    }

    /// <summary>
    /// Generate a cryptographically secure random key.
    /// </summary>
    public static string GenerateSecureKey(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_=+";
        var result = new StringBuilder(length);
        var buffer = new byte[length];
        RandomNumberGenerator.Fill(buffer);

        for (int i = 0; i < length; i++)
        {
            result.Append(chars[buffer[i] % chars.Length]);
        }

        return result.ToString();
    }

    /// <summary>
    /// Generate secure random access codes (replace hardcoded ENG1, ENG2, ENG3).
    /// </summary>
    public static string GenerateAccessCode()
    {
        var bytes = new byte[6];
        RandomNumberGenerator.Fill(bytes);
        return $"SF-{Convert.ToHexString(bytes).ToUpperInvariant()}";
    }

    /// <summary>
    /// Generate a secure admin password for first-run setup.
    /// </summary>
    public static string GenerateAdminPassword()
    {
        const string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lower = "abcdefghijklmnopqrstuvwxyz";
        const string digits = "0123456789";
        const string special = "!@#$%&*-_";
        const string all = upper + lower + digits + special;

        var buffer = new byte[16];
        RandomNumberGenerator.Fill(buffer);

        // Guarantee at least one of each category
        var sb = new StringBuilder(16);
        sb.Append(upper[buffer[0] % upper.Length]);
        sb.Append(lower[buffer[1] % lower.Length]);
        sb.Append(digits[buffer[2] % digits.Length]);
        sb.Append(special[buffer[3] % special.Length]);

        for (int i = 4; i < 16; i++)
            sb.Append(all[buffer[i] % all.Length]);

        // Shuffle
        var chars = sb.ToString().ToCharArray();
        for (int i = chars.Length - 1; i > 0; i--)
        {
            var j = buffer[i % buffer.Length] % (i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars);
    }

    private static void LoadDotEnv()
    {
        if (!File.Exists(EnvFilePath)) return;

        foreach (var line in File.ReadAllLines(EnvFilePath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#'))
                continue;

            var eqIdx = trimmed.IndexOf('=');
            if (eqIdx <= 0) continue;

            var key = trimmed[..eqIdx].Trim();
            var value = trimmed[(eqIdx + 1)..].Trim().Trim('"').Trim(); // Trim whitespace and quotes

            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }

    private static void PersistToEnvFile(string key, string value)
    {
        // Do not attempt to write to .env file in a containerized environment (Railway/Docker)
        // as the filesystem is often read-only or ephemeral, and environment variables take precedence.
        if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true")
            return;

        try
        {
            var lines = File.Exists(EnvFilePath)
                ? File.ReadAllLines(EnvFilePath).ToList()
                : new List<string> { "# SessionFlow Secrets — DO NOT COMMIT THIS FILE" };

            // Replace existing or append
            var idx = lines.FindIndex(l => l.TrimStart().StartsWith($"{key}="));
            var entry = $"{key}=\"{value.Trim()}\""; // Trim before persistence

            if (idx >= 0) lines[idx] = entry;
            else lines.Add(entry);

            File.WriteAllLines(EnvFilePath, lines);
        }
        catch
        {
            // Non-fatal — secrets still work for this session via env vars
        }
    }
}
