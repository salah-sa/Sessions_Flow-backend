using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Modern email service using Resend HTTP API to bypass SMTP port blocking on cloud providers.
/// Configure via Environment Variable: RESEND_API_KEY
/// </summary>
public class EmailService
{
    private readonly MongoService _db;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;

    public EmailService(MongoService db, ILogger<EmailService> logger, HttpClient httpClient)
    {
        _db = db;
        _logger = logger;
        _httpClient = httpClient;
    }

    private async Task<string?> GetApiKeyAsync(CancellationToken ct = default)
    {
        // 1. Try Environment Variable (Priority for Railway)
        var envKey = Environment.GetEnvironmentVariable("RESEND_API_KEY");
        if (!string.IsNullOrEmpty(envKey)) return envKey;

        // 2. Fallback to MongoDB settings
        return await _db.Settings
            .Find(s => s.Key == "resend_api_key")
            .Project(s => s.Value)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<string> GetFromEmailAsync(CancellationToken ct = default)
    {
        var from = await _db.Settings
            .Find(s => s.Key == "admin_email")
            .Project(s => s.Value)
            .FirstOrDefaultAsync(ct);

        // If it's a gmail address, it won't work with Resend unless verified as a domain.
        // Default to Resend onboarding address for trial purposes.
        if (string.IsNullOrEmpty(from) || from.Contains("gmail.com")) 
            return "SessionFlow <onboarding@resend.dev>";

        return from;
    }

    public async Task<(bool success, string? error)> SendEmailAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        try
        {
            var apiKey = await GetApiKeyAsync(ct);
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("RESEND_API_KEY not configured. Email to {To} was not sent.", to);
                return (false, "Resend API Key not configured. Please add RESEND_API_KEY to your environment variables.");
            }

            var from = await GetFromEmailAsync(ct);

            var payload = new
            {
                from = from,
                to = new[] { to },
                subject = subject,
                html = htmlBody
            };

            var json = JsonSerializer.Serialize(payload);
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[EMAIL] Sent successfully via Resend to {To}: {Subject}", to, subject);
                return (true, null);
            }

            _logger.LogError("[EMAIL] Resend API Error ({Status}): {Content}", response.StatusCode, content);
            return (false, $"Resend API Error: {response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMAIL] Exception while sending via Resend to {To}", to);
            return (false, ex.Message);
        }
    }

    public async Task<(bool success, string? error)> SendTestEmailAsync(string to)
    {
        return await SendEmailAsync(to, "SessionFlow - Test Email",
            @"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                <h2 style='color: #3b82f6;'>Resend API Active</h2>
                <p>This test email confirms that your Resend HTTP relay is fully operational and bypassing SMTP restrictions.</p>
                <p style='color: #64748b; font-size: 10px; margin-top: 40px;'>SESSIONFLOW SECURITY ENFORCEMENT PROTOCOL</p>
            </div>");
    }
}
