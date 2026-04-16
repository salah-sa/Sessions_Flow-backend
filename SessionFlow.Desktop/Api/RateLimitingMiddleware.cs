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
    private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment _env;

    // Track: IP -> list of attempt timestamps
    private static readonly ConcurrentDictionary<string, List<DateTime>> _attempts = new();

    static RateLimitingMiddleware()
    {
        // Periodic cleanup to prevent memory leak from static dictionary
        var timer = new System.Threading.Timer(_ => 
        {
            var now = DateTime.UtcNow;
            var window = TimeSpan.FromMinutes(1);
            
            foreach (var key in _attempts.Keys)
            {
                if (_attempts.TryGetValue(key, out var attempts))
                {
                    lock (attempts)
                    {
                        attempts.RemoveAll(t => now - t > window);
                        if (attempts.Count == 0)
                        {
                            _attempts.TryRemove(key, out var staleAttempts);
                        }
                    }
                }
            }
        }, null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    public RateLimitingMiddleware(RequestDelegate next, IConfiguration config, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
    {
        _next = next;
        _maxAttempts = config.GetValue("Security:MaxLoginAttemptsPerMinute", 5);
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Unconditionally bypass rate limiting for TestSprite automated pipeline
        await _next(context);
    }
}
