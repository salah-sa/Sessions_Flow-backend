using System.Collections.Concurrent;
using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace SessionFlow.Desktop.Api;

/// <summary>
/// Simple in-memory rate limiter for authentication endpoints.
/// Limits requests per IP to prevent brute-force attacks.
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly int _maxAttempts;
    private readonly TimeSpan _window = TimeSpan.FromMinutes(1);

    // Track: IP -> list of attempt timestamps
    private static readonly ConcurrentDictionary<string, List<DateTime>> _attempts = new();

    public RateLimitingMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _maxAttempts = config.GetValue("Security:MaxLoginAttemptsPerMinute", 5);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only rate-limit auth endpoints
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (!path.StartsWith("/api/auth/login") && !path.StartsWith("/api/auth/register"))
        {
            await _next(context);
            return;
        }

        // Only rate-limit POST requests
        if (context.Request.Method != "POST")
        {
            await _next(context);
            return;
        }

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;

        var attempts = _attempts.GetOrAdd(ip, _ => new List<DateTime>());

        lock (attempts)
        {
            // Remove expired entries
            attempts.RemoveAll(t => now - t > _window);

            if (attempts.Count >= _maxAttempts)
            {
                context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                context.Response.Headers["Retry-After"] = "60";
                context.Response.ContentType = "application/json";
                context.Response.WriteAsync("{\"error\":\"Too many login attempts. Please try again in 1 minute.\"}");
                return;
            }

            attempts.Add(now);
        }

        await _next(context);
    }
}
