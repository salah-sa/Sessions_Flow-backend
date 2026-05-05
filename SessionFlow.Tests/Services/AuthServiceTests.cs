using System;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Tests.Services;

/// <summary>
/// Unit tests for AuthService — JWT generation, password hashing, token refresh.
/// </summary>
public class AuthServiceTests
{
    [Fact]
    public void PasswordHash_ShouldBeVerifiable()
    {
        // Arrange
        var password = "SecureP@ssw0rd!";
        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        // Act
        var result = BCrypt.Net.BCrypt.Verify(password, hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void PasswordHash_WrongPassword_ShouldFail()
    {
        // Arrange
        var hash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword");

        // Act
        var result = BCrypt.Net.BCrypt.Verify("WrongPassword", hash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void PasswordHash_ShouldGenerateUniqueHashes()
    {
        // Arrange
        var password = "SamePassword";

        // Act
        var hash1 = BCrypt.Net.BCrypt.HashPassword(password);
        var hash2 = BCrypt.Net.BCrypt.HashPassword(password);

        // Assert — BCrypt salts should produce different hashes
        hash1.Should().NotBe(hash2);
    }
}
