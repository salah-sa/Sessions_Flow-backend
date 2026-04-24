using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class PaymobService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly string _apiKey;

    public PaymobService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
        _apiKey = _config["Paymob:ApiKey"] ?? string.Empty;
    }

    /// <summary>
    /// Step 1: Authenticate with Paymob to get a temporary access token.
    /// </summary>
    public async Task<string> GetAuthTokenAsync()
    {
        var response = await _httpClient.PostAsJsonAsync("https://accept.paymob.com/api/auth/tokens", new { api_key = _apiKey });
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<JsonElement>();
        return data.GetProperty("token").GetString() ?? throw new Exception("Failed to retrieve Paymob Auth Token");
    }

    /// <summary>
    /// Step 2: Create an order in Paymob's system.
    /// </summary>
    public async Task<long> CreateOrderAsync(string authToken, long amountPiasters, string? merchantOrderId = null)
    {
        var payload = new
        {
            auth_token = authToken,
            delivery_needed = "false",
            amount_cents = amountPiasters.ToString(),
            currency = "EGP",
            merchant_order_id = merchantOrderId ?? Guid.NewGuid().ToString(),
            items = new List<object>() // Can be expanded for itemized billing
        };

        var response = await _httpClient.PostAsJsonAsync("https://accept.paymob.com/api/ecommerce/orders", payload);
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<JsonElement>();
        return data.GetProperty("id").GetInt64();
    }

    /// <summary>
    /// Step 3: Generate a payment key for the frontend to use.
    /// </summary>
    public async Task<string> GeneratePaymentKeyAsync(
        string authToken, 
        long amountPiasters, 
        long orderId, 
        int integrationId, 
        User user)
    {
        var names = user.Name.Split(' ', 2);
        var firstName = names.Length > 0 ? names[0] : "User";
        var lastName = names.Length > 1 ? names[1] : "SessionFlow";

        var payload = new
        {
            auth_token = authToken,
            amount_cents = amountPiasters.ToString(),
            expiration = 3600, // 1 hour
            order_id = orderId.ToString(),
            billing_data = new
            {
                first_name = firstName,
                last_name = lastName,
                email = user.Email,
                phone_number = "01000000000", // Default or user field
                apartment = "NA",
                floor = "NA",
                street = "NA",
                building = "NA",
                shipping_method = "PKG",
                postal_code = "NA",
                city = "Cairo",
                country = "EG",
                state = "NA"
            },
            currency = "EGP",
            integration_id = integrationId,
            lock_order_when_paid = "true"
        };

        var response = await _httpClient.PostAsJsonAsync("https://accept.paymob.com/api/acceptance/payment_keys", payload);
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<JsonElement>();
        return data.GetProperty("token").GetString() ?? throw new Exception("Failed to generate Paymob Payment Key");
    }
}
