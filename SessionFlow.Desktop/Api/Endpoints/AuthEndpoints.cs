using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using SessionFlow.Desktop.Services;
using System.IO;
using SessionFlow.Desktop.Data;
using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AuthEndpoints
{
    /// <summary>
    /// Validates password complexity: min 8 chars, 1 uppercase, 1 digit, 1 special character.
    /// </summary>
    private static string? ValidatePasswordStrength(string password)
    {
        if (password.Length < 8)
            return "Password must be at least 8 characters.";
        if (!password.Any(char.IsUpper))
            return "Password must contain at least one uppercase letter.";
        if (!password.Any(char.IsDigit))
            return "Password must contain at least one digit.";
        if (!password.Any(c => !char.IsLetterOrDigit(c)))
            return "Password must contain at least one special character.";
        return null;
    }

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/status", () => Results.Ok(new { status = "Ready" }));

        group.MapPost("/login", async (LoginRequest req, AuthService auth, HttpContext ctx) =>
        {
            var ident = req.GetIdentifier();
            if (string.IsNullOrWhiteSpace(ident) || string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "Identifier and password are required." });

            var (user, token, error) = await auth.LoginAsync(ident.Trim(), req.Password, req.Portal, req.StudentId?.Trim(), req.EngineerCode?.Trim());
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
                    avatarUrl = ResolveAvatarUrl(user.AvatarUrl, ctx.Request),
                    latitude = user.Latitude,
                    longitude = user.Longitude,
                    city = user.City,
                    createdAt = user.CreatedAt
                }
            });
        });

        group.MapPost("/register", async (RegisterRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Email) ||
                string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "All fields are required." });

            var pwError = ValidatePasswordStrength(req.Password);
            if (pwError != null)
                return Results.BadRequest(new { error = pwError });

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
                engineer = new { id = pending.Id },
                status = pending.Status.ToString()
            });
        });

        group.MapPost("/register-student", async (RegisterStudentRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Username) ||
                string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.StudentId) ||
                string.IsNullOrWhiteSpace(req.EngineerCode))
                return Results.BadRequest(new { error = "All fields are required." });

            var pwError = ValidatePasswordStrength(req.Password);
            if (pwError != null)
                return Results.BadRequest(new { error = pwError });

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

        group.MapPost("/forgot-password", async (ForgotPasswordRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Email))
                return Results.BadRequest(new { error = "Email is required." });

            var (success, error) = await auth.RequestPasswordResetAsync(req.Email.Trim().ToLowerInvariant());
            if (!success && error != null)
                return Results.BadRequest(new { error });

            return Results.Ok(new { message = "If an account with this email exists, a reset code has been sent." });
        }).AllowAnonymous();

        group.MapPost("/verify-reset-code", async (VerifyResetCodeRequest req, AuthService auth) =>
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Code))
                return Results.BadRequest(new { error = "Email and code are required." });

            var (tokenId, error) = await auth.VerifyResetCodeAsync(req.Email.Trim().ToLowerInvariant(), req.Code.Trim());
            if (error != null)
                return Results.BadRequest(new { error });

            return Results.Ok(new { tokenId });
        }).AllowAnonymous();

        group.MapPost("/reset-password", async (ResetPasswordRequest req, AuthService auth) =>
        {
            if (req.TokenId == Guid.Empty || string.IsNullOrWhiteSpace(req.NewPassword))
                return Results.BadRequest(new { error = "Token ID and new password are required." });

            var (success, error) = await auth.ResetPasswordAsync(req.TokenId, req.NewPassword);
            if (!success)
                return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Password updated successfully." });
        }).AllowAnonymous();

        group.MapPost("/register-student-request", async (RegisterStudentQueueRequest req, AuthService auth,
            SessionFlow.Desktop.Services.EventBus.IEventBus eventBus) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Username) ||
                string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.GroupName) ||
                string.IsNullOrWhiteSpace(req.Email))
                return Results.BadRequest(new { error = "All fields are required." });

            var pwError = ValidatePasswordStrength(req.Password);
            if (pwError != null)
                return Results.BadRequest(new { error = pwError });

            var (pending, error) = await auth.QueueStudentRequestAsync(
                req.Name.Trim(), req.Username.Trim().ToLowerInvariant(), req.Email.Trim().ToLowerInvariant(), req.Password, req.GroupName.Trim(), req.StudentId?.Trim());

            if (error != null)
                return Results.Conflict(new { error });

            // Push real-time notification through event bus
            if (pending?.EngineerId != null && pending.EngineerId != Guid.Empty)
            {
                await eventBus.PublishAsync(
                    SessionFlow.Desktop.Services.EventBus.Events.RequestCreated,
                    SessionFlow.Desktop.Services.EventBus.EventTargetType.User,
                    pending.EngineerId.ToString(),
                    new
                    {
                        requestId = pending.Id,
                        studentName = pending.Name,
                        groupName = pending.GroupName,
                        requestedAt = pending.RequestedAt
                    });
            }

            return Results.Created($"/api/pending-student/{pending!.Id}", new
            {
                message = "Request submitted. Awaiting engineer approval.",
                id = pending.Id
            });
        });

        group.MapGet("/discover-group", async (string name, MongoService db) =>
        {
            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new { error = "Group name is required." });

            var normalizedName = name.Trim();
            var groupFilter = Builders<Group>.Filter.Regex(g => g.Name, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(normalizedName)}$", "i"))
                            & Builders<Group>.Filter.Eq(g => g.IsDeleted, false);
            var groupObj = await db.Groups.Find(groupFilter).FirstOrDefaultAsync();
            if (groupObj == null)
                return Results.NotFound(new { error = "Group not found." });

            var engineer = await db.Users.Find(u => u.Id == groupObj.EngineerId).FirstOrDefaultAsync();
            var students = await db.Students.Find(s => s.GroupId == groupObj.Id && !s.IsDeleted).ToListAsync();
            
            // Filter out students who already have a registered user account
            var registeredStudentIds = (await db.Users.Find(u => u.Role == UserRole.Student && u.StudentId != null)
                .Project(u => u.StudentId)
                .ToListAsync())
                .ToHashSet();

            // Filter out students who have a pending request
            var pendingStudentNames = (await db.PendingStudentRequests
                .Find(p => p.GroupId == groupObj.Id && p.Status == PendingStatus.Pending)
                .Project(p => p.Name)
                .ToListAsync())
                .ToHashSet();

            var studentList = students.Select(s => 
            {
                var isRegistered = registeredStudentIds.Contains(s.Id.ToString()) || registeredStudentIds.Contains(s.UniqueStudentCode);
                var isPending = pendingStudentNames.Contains(s.Name);

                return new 
                { 
                    id = s.Id.ToString(), 
                    name = s.Name, 
                    status = isRegistered ? "Registered" : (isPending ? "Pending" : "Available") 
                };
            }).ToList();

            // SECURITY: Return minimal necessary fields for the student picker.
            // Full student details require authentication.
            return Results.Ok(new
            {
                groupName = groupObj.Name,
                engineerName = engineer?.Name ?? "Unknown Engineer",
                level = groupObj.Level,
                availableSlots = studentList.Count(s => s.status == "Available"),
                students = studentList
            });
        }).AllowAnonymous(); // Allow pre-registration group discovery

        group.MapGet("/pending-student-requests", async (HttpContext ctx, AuthService auth) =>
        {
            var user = await auth.GetUserFromClaimsAsync(ctx.User);
            if (user == null) return Results.Unauthorized();

            var pending = await auth.GetPendingStudentRequestsAsync(user);
            return Results.Ok(pending);
        }).RequireAuthorization("CanViewStudentRequests");

        group.MapPost("/approve-student-request/{id}", async (Guid id, HttpContext ctx, AuthService auth) =>
        {
            var executor = await auth.GetUserFromClaimsAsync(ctx.User);
            if (executor == null) return Results.Unauthorized();

            var (approvedUser, error) = await auth.ApproveStudentRequestAsync(id, executor);
            if (error != null)
                return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Request approved.", user = new { id = approvedUser!.Id, name = approvedUser.Name } });
        }).RequireAuthorization("CanApproveStudentRequests");

        group.MapPost("/deny-student-request/{id}", async (Guid id, HttpContext ctx, AuthService auth) =>
        {
            var executor = await auth.GetUserFromClaimsAsync(ctx.User);
            if (executor == null) return Results.Unauthorized();

            var (success, error) = await auth.DenyStudentRequestAsync(id, executor);
            if (!success)
                return Results.BadRequest(new { error });

            return Results.Ok(new { message = "Request denied." });
        }).RequireAuthorization("CanApproveStudentRequests");

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
                avatarUrl = ResolveAvatarUrl(user.AvatarUrl, ctx.Request),
                latitude = user.Latitude,
                longitude = user.Longitude,
                city = user.City,
                createdAt = user.CreatedAt
            });
        }).RequireAuthorization();

        group.MapPut("/profile/avatar", async (UpdateAvatarRequest req, HttpContext ctx, AuthService auth,
            Microsoft.AspNetCore.Hosting.IWebHostEnvironment env, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus) =>
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
                var relativeUrl = await auth.UpdateAvatarAsync(user.Id, req.AvatarUrl, webRoot);
                var avatarUrl = ResolveAvatarUrl(relativeUrl, ctx.Request);

                // Broadcast avatar update to all connected clients for real-time sync
                await eventBus.PublishAsync(SessionFlow.Desktop.Services.EventBus.Events.AvatarUpdated, SessionFlow.Desktop.Services.EventBus.EventTargetType.All, "", new { userId = user.Id.ToString(), avatarUrl });

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

    public static string? ResolveAvatarUrl(string? relativeUrl, HttpRequest request)
    {
        if (string.IsNullOrEmpty(relativeUrl)) return null;
        if (relativeUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return relativeUrl;
        
        // Support reverse proxy headers (Railway, Nginx, Cloudflare)
        var scheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? request.Scheme;
        var host = request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? request.Host.ToString();
        var baseUrl = $"{scheme}://{host}";
        return $"{baseUrl.TrimEnd('/')}/{relativeUrl.TrimStart('/')}";
    }

    public record UpdatePasswordRequest(string CurrentPassword, string NewPassword);
    public record UpdateAvatarRequest(string AvatarUrl);

    public enum LoginPortal { Admin, Student }
    public class LoginRequest
    {
        public string? Email { get; set; }
        public string? Username { get; set; }
        public string? Identifier { get; set; }
        public string Password { get; set; } = "";
        public LoginPortal Portal { get; set; } = LoginPortal.Admin;
        public string? StudentId { get; set; }
        public string? EngineerCode { get; set; }

        public string? GetIdentifier() => Email ?? Username ?? Identifier;
    }
    public record RegisterRequest(string Name, string Email, string Password, string? AccessCode = null);
    public record RegisterStudentRequest(string Name, string Username, string Password, string StudentId, string EngineerCode);
    public record RegisterStudentQueueRequest(string Name, string Username, string Email, string Password, string GroupName, string? StudentId);
    
    public record ForgotPasswordRequest(string Email);
    public record VerifyResetCodeRequest(string Email, string Code);
    public record ResetPasswordRequest(Guid TokenId, string NewPassword);
}
