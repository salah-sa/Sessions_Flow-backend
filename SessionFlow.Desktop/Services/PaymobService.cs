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

    /// <summary>
    /// Orchestrates the full payment initiation flow.
    /// </summary>
    public async Task<string> InitiatePaymentAsync(
        long amountPiasters, 
        string email, 
        string firstName, 
        string lastName, 
        string phone, 
        PaymentMethod method)
    {
        var token = await GetAuthTokenAsync();
        var orderId = await CreateOrderAsync(token, amountPiasters);
        var integrationId = GetIntegrationId(method);

        var payload = new
        {
            auth_token = token,
            amount_cents = amountPiasters.ToString(),
            expiration = 3600,
            order_id = orderId.ToString(),
            billing_data = new
            {
                first_name = firstName,
                last_name = lastName,
                email = email,
                phone_number = phone,
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
            integration_id = integrationId
        };

        var response = await _httpClient.PostAsJsonAsync("https://accept.paymob.com/api/acceptance/payment_keys", payload);
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<JsonElement>();
        return data.GetProperty("token").GetString() ?? throw new Exception("Failed to generate payment key");
    }

    public string GetIframeUrl(string paymentKey)
    {
        var frameId = _config["Paymob:FrameId"] ?? "838844";
        return $"https://accept.paymob.com/api/acceptance/iframes/{frameId}?payment_token={paymentKey}";
    }

    /// <summary>
    /// Validates the HMAC signature of a transaction webhook.
    /// Order is critical: amount_cents, created_at, currency, error_occured, has_parent_transaction, id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded, is_standalone_payment, is_voided, order.id, owner, pending, source_data.pan, source_data.sub_type, source_data.type, success
    /// </summary>
    public bool ValidateWebhookHmac(JsonElement obj, string receivedHmac)
    {
        var hmacSecret = _config["Paymob:HmacSecret"];
        if (string.IsNullOrEmpty(hmacSecret)) return false;

        try
        {
            var sourceData = obj.GetProperty("source_data");
            var order = obj.GetProperty("order");

            var dataToHash = 
                obj.GetProperty("amount_cents").ToString() +
                obj.GetProperty("created_at").GetString() +
                obj.GetProperty("currency").GetString() +
                obj.GetProperty("error_occured").GetBoolean().ToString().ToLower() +
                obj.GetProperty("has_parent_transaction").GetBoolean().ToString().ToLower() +
                obj.GetProperty("id").ToString() +
                obj.GetProperty("integration_id").ToString() +
                obj.GetProperty("is_3d_secure").GetBoolean().ToString().ToLower() +
                obj.GetProperty("is_auth").GetBoolean().ToString().ToLower() +
                obj.GetProperty("is_capture").GetBoolean().ToString().ToLower() +
                obj.GetProperty("is_refunded").GetBoolean().ToString().ToLower() +
                obj.GetProperty("is_standalone_payment").GetBoolean().ToString().ToLower() +
                obj.GetProperty("is_voided").GetBoolean().ToString().ToLower() +
                order.GetProperty("id").ToString() +
                obj.GetProperty("owner").ToString() +
                obj.GetProperty("pending").GetBoolean().ToString().ToLower() +
                sourceData.GetProperty("pan").GetString() +
                sourceData.GetProperty("sub_type").GetString() +
                sourceData.GetProperty("type").GetString() +
                obj.GetProperty("success").GetBoolean().ToString().ToLower();

            using var hmac = new System.Security.Cryptography.HMACSHA512(System.Text.Encoding.UTF8.GetBytes(hmacSecret));
            var hashBytes = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(dataToHash));
            var computedHmac = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();

            return string.Equals(computedHmac, receivedHmac, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception)
        {
            return false;
        }
    }

    private int GetIntegrationId(PaymentMethod method) => method switch
    {
        PaymentMethod.Card => int.Parse(_config["Paymob:CardIntegrationId"] ?? "0"),
        PaymentMethod.VodafoneCash or PaymentMethod.OrangeMoney or PaymentMethod.EtisalatCash 
            => int.Parse(_config["Paymob:WalletIntegrationId"] ?? "0"),
        PaymentMethod.Fawry => int.Parse(_config["Paymob:FawryIntegrationId"] ?? "0"),
        _ => throw new ArgumentException("Unsupported payment method")
    };
}
