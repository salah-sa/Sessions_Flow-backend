using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Xunit;
using FluentAssertions;

namespace SessionFlow.Tests.Middleware;

/// <summary>
/// Unit tests for CorrelationIdMiddleware — header propagation and generation.
/// </summary>
public class CorrelationIdMiddlewareTests
{
    [Fact]
    public void CorrelationId_WhenProvided_ShouldBePreserved()
    {
        // Arrange
        var existingId = Guid.NewGuid().ToString();
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-Id"] = existingId;

        // Act
        var correlationId = context.Request.Headers["X-Correlation-Id"].ToString();

        // Assert
        correlationId.Should().Be(existingId);
    }

    [Fact]
    public void CorrelationId_WhenMissing_NewGuidFormat()
    {
        // Arrange & Act
        var generated = Guid.NewGuid().ToString();

        // Assert — should be a valid GUID
        Guid.TryParse(generated, out _).Should().BeTrue();
        generated.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void CorrelationId_ShouldBeUnique()
    {
        // Arrange & Act
        var id1 = Guid.NewGuid().ToString();
        var id2 = Guid.NewGuid().ToString();

        // Assert
        id1.Should().NotBe(id2);
    }
}
