using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using SessionFlow.Desktop.Services;
using System.IO;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AuthEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/status", () => Results.Ok(new { status = "Ready" }));

        group.MapPost("/login", async (LoginRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Identifier) || string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "Identifier and password are required." });

            var (user, token, error) = await auth.LoginAsync(req.Identifier.Trim(), req.Password, req.StudentId?.Trim(), req.EngineerCode?.Trim());
            if (error != null)
                return Results.BadRequest(new { error });

            return Results.Ok(new
            {
                token,
                user = new
                {
                    id = user!.Id,
                    name = user.Name,
                    email = user.Email,
                    username = user.Username,
                    role = user.Role.ToString(),
                    isApproved = user.IsApproved,
                    studentId = user.StudentId,
                    engineerCode = user.EngineerCode,
                    avatarUrl = user.AvatarUrl,
                    createdAt = user.CreatedAt
                }
            });
        });

        group.MapPost("/register", async (RegisterRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Email) ||
                string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "All fields are required." });

            if (req.Password.Length < 6)
                return Results.BadRequest(new { error = "Password must be at least 6 characters." });

            var (pending, error) = await auth.RegisterAsync(
                req.Name.Trim(), req.Email.Trim().ToLowerInvariant(), req.Password);

            if (error != null)
            {
                if (error.Contains("already exists") || error.Contains("already pending"))
                    return Results.Conflict(new { error });
                return Results.BadRequest(new { error });
            }

            return Results.Created($"/api/pending/{pending!.Id}", new
            {
                message = "Registration submitted. Awaiting admin approval.",
                id = pending.Id
            });
        });

        group.MapPost("/register-student", async (RegisterStudentRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Username) ||
                string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.StudentId) ||
                string.IsNullOrWhiteSpace(req.EngineerCode))
                return Results.BadRequest(new { error = "All fields are required." });

            if (req.Password.Length < 6)
                return Results.BadRequest(new { error = "Password must be at least 6 characters." });

            var (user, error) = await auth.RegisterStudentAsync(
                req.Name.Trim(), req.Username.Trim().ToLowerInvariant(), req.Password, req.StudentId.Trim(), req.EngineerCode.Trim());

            if (error != null)
                return Results.Conflict(new { error });

            return Results.Created($"/api/users/{user!.Id}", new
            {
                message = "Registration successful. You can now log in.",
                id = user.Id
            });
        });

        group.MapGet("/me", async (HttpContext ctx, AuthService auth) =>
        {
            var user = await auth.GetUserFromClaimsAsync(ctx.User);
            if (user == null)
                return Results.Unauthorized();

            return Results.Ok(new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                username = user.Username,
                role = user.Role.ToString(),
                isApproved = user.IsApproved,
                studentId = user.StudentId,
                engineerCode = user.EngineerCode,
                avatarUrl = user.AvatarUrl,
                createdAt = user.CreatedAt
            });
        }).RequireAuthorization();

        group.MapPut("/profile/avatar", async (UpdateAvatarRequest req, HttpContext ctx, AuthService auth,
            Microsoft.AspNetCore.Hosting.IWebHostEnvironment env, Microsoft.AspNetCore.SignalR.IHubContext<SessionFlow.Desktop.Api.Hubs.SessionHub> hub) =>
        {
            var user = await auth.GetUserFromClaimsAsync(ctx.User);
            if (user == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.AvatarUrl))
                return Results.BadRequest(new { error = "Avatar payload is required." });

            // Enforce 2MB limit check before processing
            if (req.AvatarUrl.Length > 3 * 1024 * 1024)
                return Results.BadRequest(new { error = "Avatar too large. Maximum 2MB allowed." });

            try
            {
                string webRoot = env.WebRootPath ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
                var avatarUrl = await auth.UpdateAvatarAsync(user.Id, req.AvatarUrl, webRoot);

                // Broadcast avatar update to all connected clients for real-time sync
                await hub.Clients.All.SendAsync("AvatarUpdated", user.Id.ToString(), avatarUrl);

                return Results.Ok(new { avatarUrl });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        }).RequireAuthorization();
        group.MapPut("/profile/password", async (UpdatePasswordRequest req, HttpContext ctx, AuthService auth) =>
        {
            var user = await auth.GetUserFromClaimsAsync(ctx.User);
            if (user == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
                return Results.BadRequest(new { error = "Current and new passwords are required." });

            var (success, error) = await auth.UpdatePasswordAsync(user.Id, req.CurrentPassword, req.NewPassword);
            if (!success)
                return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Password updated successfully." });
        }).RequireAuthorization();
    }

    public record UpdatePasswordRequest(string CurrentPassword, string NewPassword);
    public record UpdateAvatarRequest(string AvatarUrl);

    public record LoginRequest(string Identifier, string Password, string? StudentId = null, string? EngineerCode = null);
    public record RegisterRequest(string Name, string Email, string Password, string? AccessCode = null);
    public record RegisterStudentRequest(string Name, string Username, string Password, string StudentId, string EngineerCode);
}
