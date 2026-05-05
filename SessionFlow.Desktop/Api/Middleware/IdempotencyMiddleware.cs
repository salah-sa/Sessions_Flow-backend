using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;

namespace SessionFlow.Desktop.Api.Middleware;

/// <summary>
/// D2: Idempotency middleware — prevents duplicate mutations.
/// Clients send an "Idempotency-Key" header; if the same key was seen before,
/// the original response is replayed instead of re-executing the mutation.
/// </summary>
public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<IdempotencyMiddleware> _logger;

    // Only enforce on mutating methods
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
        { "POST", "PUT", "PATCH", "DELETE" };

    public IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        // Skip non-mutating requests
        if (!MutatingMethods.Contains(ctx.Request.Method))
        {
            await _next(ctx);
            return;
        }

        // Skip if no idempotency key provided (opt-in model)
        if (!ctx.Request.Headers.TryGetValue("Idempotency-Key", out var keyValues) ||
            string.IsNullOrWhiteSpace(keyValues.FirstOrDefault()))
        {
            await _next(ctx);
            return;
        }

        var idempotencyKey = keyValues.First()!.Trim();
        if (idempotencyKey.Length > 128)
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { error = "Idempotency-Key too long (max 128 chars)." });
            return;
        }

        var db = ctx.RequestServices.GetRequiredService<MongoService>();
        var collection = db.Database.GetCollection<IdempotencyRecord>("IdempotencyRecords");

        // Compute deterministic hash: key + endpoint + method
        var fingerprint = $"{idempotencyKey}:{ctx.Request.Method}:{ctx.Request.Path}";
        var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(fingerprint)));

        // Check for existing record
        var existing = await collection.Find(r => r.Hash == hash).FirstOrDefaultAsync();
        if (existing != null)
        {
            _logger.LogInformation("[Idempotency] Replaying cached response for key={Key} endpoint={Path}", 
                idempotencyKey, ctx.Request.Path);
            ctx.Response.StatusCode = existing.StatusCode;
            ctx.Response.ContentType = existing.ContentType ?? "application/json";
            await ctx.Response.WriteAsync(existing.ResponseBody ?? "");
            return;
        }

        // Capture the original response
        var originalStream = ctx.Response.Body;
        using var capturedStream = new MemoryStream();
        ctx.Response.Body = capturedStream;

        await _next(ctx);

        // Read captured response
        capturedStream.Position = 0;
        var responseBody = await new StreamReader(capturedStream).ReadToEndAsync();

        // Store idempotency record (only for successful responses)
        if (ctx.Response.StatusCode >= 200 && ctx.Response.StatusCode < 300)
        {
            try
            {
                var record = new IdempotencyRecord
                {
                    Hash = hash,
                    Key = idempotencyKey,
                    Method = ctx.Request.Method,
                    Path = ctx.Request.Path,
                    StatusCode = ctx.Response.StatusCode,
                    ContentType = ctx.Response.ContentType,
                    ResponseBody = responseBody,
                    CreatedAt = DateTime.UtcNow
                };
                await collection.InsertOneAsync(record);
            }
            catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                // Race condition: another request beat us. Safe to ignore.
                _logger.LogDebug("[Idempotency] Duplicate insert for key={Key}, ignoring.", idempotencyKey);
            }
        }

        // Write captured response back to original stream
        capturedStream.Position = 0;
        await capturedStream.CopyToAsync(originalStream);
        ctx.Response.Body = originalStream;
    }
}

/// <summary>
/// Stores idempotency records with a 24-hour TTL (via MongoDB TTL index).
/// </summary>
public class IdempotencyRecord
{
    [BsonId]
    public ObjectId Id { get; set; }

    /// <summary>SHA-256 of (key + method + path)</summary>
    [BsonElement("hash")]
    public string Hash { get; set; } = null!;

    [BsonElement("key")]
    public string Key { get; set; } = null!;

    [BsonElement("method")]
    public string Method { get; set; } = null!;

    [BsonElement("path")]
    public string Path { get; set; } = null!;

    [BsonElement("statusCode")]
    public int StatusCode { get; set; }

    [BsonElement("contentType")]
    public string? ContentType { get; set; }

    [BsonElement("responseBody")]
    public string? ResponseBody { get; set; }

    /// <summary>TTL index target — auto-expires after 24 hours.</summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
}
