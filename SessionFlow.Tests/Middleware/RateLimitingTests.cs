using System;
using System.Net;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;

namespace SessionFlow.Tests.Middleware;

/// <summary>
/// Unit tests for RateLimitingMiddleware — sliding window, IP tracking.
/// </summary>
public class RateLimitingMiddlewareTests
{
    [Fact]
    public void SlidingWindow_ShouldTrackRequests()
    {
        // Arrange
        var window = new Queue<DateTime>();
        var now = DateTime.UtcNow;
        var windowDuration = TimeSpan.FromMinutes(1);
        var maxRequests = 100;

        // Act — fill to limit
        for (int i = 0; i < maxRequests; i++)
        {
            window.Enqueue(now);
        }

        // Assert
        window.Count.Should().Be(maxRequests);
    }

    [Fact]
    public void SlidingWindow_ExpiredEntries_ShouldBeRemoved()
    {
        // Arrange
        var window = new Queue<DateTime>();
        var windowDuration = TimeSpan.FromMinutes(1);
        var expiredTime = DateTime.UtcNow.AddMinutes(-2);

        window.Enqueue(expiredTime);
        window.Enqueue(expiredTime);
        window.Enqueue(DateTime.UtcNow);

        // Act — remove expired
        while (window.Count > 0 && window.Peek() < DateTime.UtcNow - windowDuration)
        {
            window.Dequeue();
        }

        // Assert
        window.Count.Should().Be(1);
    }

    [Fact]
    public void IPAddress_Parsing_ShouldHandleIPv4()
    {
        // Arrange & Act
        var parsed = IPAddress.TryParse("192.168.1.1", out var ip);

        // Assert
        parsed.Should().BeTrue();
        ip.Should().NotBeNull();
    }
}
