using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Gmail.v1;
using Google.Apis.Util.Store;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class GoogleAuthService
{
    private readonly MongoService _db;
    private readonly ILogger<GoogleAuthService> _logger;
    private readonly string[] Scopes = { GmailService.Scope.GmailSend, GmailService.Scope.GmailReadonly, "openid", "email", "profile" };

    public GoogleAuthService(MongoService db, ILogger<GoogleAuthService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private async Task<ClientSecrets?> GetClientSecretsAsync()
    {
        if (File.Exists("credentials.json"))
        {
            using var stream = new FileStream("credentials.json", FileMode.Open, FileAccess.Read);
            return GoogleClientSecrets.FromStream(stream).Secrets;
        }

        // Fallback to database settings if user uploaded them via UI (Future proofing)
        var clientId = await _db.Settings.Find(s => s.Key == "google_client_id").Project(s => s.Value).FirstOrDefaultAsync();
        var clientSecret = await _db.Settings.Find(s => s.Key == "google_client_secret").Project(s => s.Value).FirstOrDefaultAsync();

        if (!string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            return new ClientSecrets { ClientId = clientId, ClientSecret = clientSecret };
        }

        return null;
    }

    public async Task<string> GetAuthorizationUrlAsync(string redirectUri)
    {
        var secrets = await GetClientSecretsAsync();
        if (secrets == null) throw new Exception("Google Client Credentials missing. Please provide credentials.json.");

        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = secrets,
            Scopes = Scopes,
            DataStore = new NullDataStore() // We handle persistence ourselves in MongoDB
        });

        var request = flow.CreateAuthorizationCodeRequest(redirectUri);
        var url = request.Build().ToString();
        
        // Append Google-specific offline access and prompt parameters
        if (url.Contains("?"))
            return url + "&access_type=offline&prompt=consent";
        else
            return url + "?access_type=offline&prompt=consent";
    }

    public async Task ExchangeCodeForTokenAsync(string code, string redirectUri)
    {
        var secrets = await GetClientSecretsAsync();
        if (secrets == null) throw new Exception("Google Client Credentials missing.");

        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = secrets,
            Scopes = Scopes
        });

        var tokenResponse = await flow.ExchangeCodeForTokenAsync("user", code, redirectUri, CancellationToken.None);

        // Persist tokens in MongoDB Settings
        await SaveTokenAsync("google_access_token", tokenResponse.AccessToken);
        if (!string.IsNullOrEmpty(tokenResponse.RefreshToken))
        {
            await SaveTokenAsync("google_refresh_token", tokenResponse.RefreshToken);
        }
        await SaveTokenAsync("google_token_expiry", tokenResponse.IssuedUtc.AddSeconds(tokenResponse.ExpiresInSeconds ?? 3600).ToString("o"));
        
        // Extract email from IdToken if available
        if (!string.IsNullOrEmpty(tokenResponse.IdToken))
        {
            try
            {
                var payload = await GoogleJsonWebSignature.ValidateAsync(tokenResponse.IdToken);
                if (!string.IsNullOrEmpty(payload.Email))
                {
                    await SaveTokenAsync("google_authorized_email", payload.Email);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to validate IdToken for email extraction.");
            }
        }

        _logger.LogInformation("Successfully authorized Gmail API and persisted tokens.");
    }

    public async Task<UserCredential?> GetUserCredentialAsync()
    {
        var secrets = await GetClientSecretsAsync();
        if (secrets == null) return null;

        var accessToken = await _db.Settings.Find(s => s.Key == "google_access_token").Project(s => s.Value).FirstOrDefaultAsync();
        var refreshToken = await _db.Settings.Find(s => s.Key == "google_refresh_token").Project(s => s.Value).FirstOrDefaultAsync();
        
        if (string.IsNullOrEmpty(refreshToken)) return null;

        var tokenResponse = new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };

        return new UserCredential(new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = secrets,
            Scopes = Scopes
        }), "user", tokenResponse);
    }

    private async Task SaveTokenAsync(string key, string value)
    {
        var update = Builders<Setting>.Update
            .Set(s => s.Value, value)
            .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
            
        await _db.Settings.UpdateOneAsync(
            s => s.Key == key,
            update,
            new UpdateOptions { IsUpsert = true }
        );
    }

    private class NullDataStore : IDataStore
    {
        public Task ClearAsync() => Task.CompletedTask;
        public Task DeleteAsync<T>(string key) => Task.CompletedTask;
        public Task<T?> GetAsync<T>(string key) => Task.FromResult(default(T));
        public Task StoreAsync<T>(string key, T value) => Task.CompletedTask;
    }
}
