using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services;

public class WhatsAppService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppService> _logger;

    public WhatsAppService(HttpClient http, IConfiguration config, ILogger<WhatsAppService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<(bool success, string? error)> SendOtpAsync(string phone, string code)
    {
        var token = _config["WHATSAPP_ACCESS_TOKEN"];
        var phoneId = _config["WHATSAPP_PHONE_NUMBER_ID"];
        var templateName = _config["WHATSAPP_TEMPLATE_NAME"] ?? "sessionflow_otp";

        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(phoneId))
        {
            _logger.LogWarning("WhatsApp credentials missing in configuration.");
            return (false, "WhatsApp is not configured.");
        }

        // Format phone number to international standard (WhatsApp requires country code without '+')
        if (phone.StartsWith("01"))
        {
            phone = "2" + phone; // Convert Egyptian 01x to 201x
        }
        else if (phone.StartsWith("+"))
        {
            phone = phone.TrimStart('+');
        }

        try
        {
            var payload = new
            {
                messaging_product = "whatsapp",
                to = phone,
                type = "template",
                template = new
                {
                    name = templateName,
                    language = new { code = "en" },
                    components = new object[]
                    {
                        new
                        {
                            type = "body",
                            parameters = new[]
                            {
                                new { type = "text", text = code }
                            }
                        },
                        new
                        {
                            type = "button",
                            sub_type = "url",
                            index = "0",
                            parameters = new[]
                            {
                                new { type = "text", text = code }
                            }
                        }
                    }
                }
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var request = new HttpRequestMessage(HttpMethod.Post, $"https://graph.facebook.com/v17.0/{phoneId}/messages");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = content;

            var response = await _http.SendAsync(request);
            var responseStr = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("WhatsApp OTP sent successfully to {Phone}", phone);
                return (true, null);
            }
            else
            {
                _logger.LogError("WhatsApp API error: {Status} - {Response}", response.StatusCode, responseStr);
                return (false, $"WhatsApp API error: {responseStr}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send WhatsApp message to {Phone}", phone);
            return (false, "An error occurred while sending the message.");
        }
    }
}
