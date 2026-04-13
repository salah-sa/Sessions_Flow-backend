using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class AuthService
{
    private readonly MongoService _db;
    private readonly IConfiguration _config;
    private readonly string _generatedAdminPassword;
    private readonly NotificationService _notificationService;
    private readonly IServiceProvider _serviceProvider; // Use provider to avoid circular deps if any

    public AuthService(MongoService db, IConfiguration config, NotificationService notificationService, IServiceProvider serviceProvider)
    {
        _db = db;
        _config = config;
        _notificationService = notificationService;
        _serviceProvider = serviceProvider;
        _generatedAdminPassword = _config["Security:DefaultAdminPassword"] ?? "Admin1234!";
    }

    public async Task<(User? user, string? token, string? error)> LoginAsync(string identifier, string password, string? studentId = null, string? engineerCode = null)
    {
        User? user;
        if (studentId != null && engineerCode != null)
        {
            // Student Login
            var filter = Builders<User>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(identifier)}$", "i"))
                       & Builders<User>.Filter.Eq(u => u.StudentId, studentId)
                       & Builders<User>.Filter.Regex(u => u.EngineerCode, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(engineerCode)}$", "i"));
            user = await _db.Users.Find(filter).FirstOrDefaultAsync();
        }
        else
        {
            // Admin/Engineer Login
            var filter = Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(identifier)}$", "i"));
            user = await _db.Users.Find(filter).FirstOrDefaultAsync();
        }

        if (user == null)
            return (null, null, "Invalid credentials.");

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return (null, null, "Invalid credentials.");

        if (!user.IsApproved)
            return (null, null, "Your account is pending approval.");

        var token = GenerateJwtToken(user);
        return (user, token, null);
    }

    public async Task<(PendingEngineer? pending, string? error)> RegisterAsync(string name, string email, string password)
    {
        // Check if email already exists in Users or PendingEngineers
        var userFilter = Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(email)}$", "i"));
        var existingUser = await _db.Users.Find(userFilter).AnyAsync();
        if (existingUser)
            return (null, "An account with this email already exists.");

        var pendingFilter = Builders<PendingEngineer>.Filter.Regex(p => p.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(email)}$", "i"))
                          & Builders<PendingEngineer>.Filter.Eq(p => p.Status, PendingStatus.Pending);
        var existingPending = await _db.PendingEngineers.Find(pendingFilter).AnyAsync();
        if (existingPending)
            return (null, "A registration request with this email is already pending.");

        var pending = new PendingEngineer
        {
            Name = name,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            AccessCode = "", // No longer utilized during pre-registration
            RequestedAt = DateTimeOffset.UtcNow,
            Status = PendingStatus.Pending
        };

        await _db.PendingEngineers.InsertOneAsync(pending);

        // Notify Admins
        await _notificationService.NotifyAdminsAsync(
            "New Engineer Request",
            $"Eng ({name}) needs clearance code.",
            NotificationType.Warning
        );

        return (pending, null);
    }

    public async Task<(User? user, string? error)> RegisterStudentAsync(string name, string username, string password, string studentId, string engineerCode)
    {
        // 1. Check if username or studentId already exists in Users
        // 1. Check if username or studentId already exists in Users
        var usernameFilter = Builders<User>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(username)}$", "i"));
        var usernameExists = await _db.Users.Find(usernameFilter).AnyAsync();
        if (usernameExists) return (null, "Username already taken.");

        var sidExists = await _db.Users.Find(u => u.StudentId == studentId).AnyAsync();
        if (sidExists) return (null, "An account with this Student ID already exists.");

        // 2. Validate EngineerCode exists and is USED by an engineer
        var codeFilter = Builders<EngineerCode>.Filter.Regex(c => c.Code, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(engineerCode)}$", "i"))
                       & Builders<EngineerCode>.Filter.Eq(c => c.IsUsed, true);
        var code = await _db.EngineerCodes.Find(codeFilter).FirstOrDefaultAsync();
        if (code == null || !code.UsedByEngineerId.HasValue)
            return (null, "Invalid Engineer Code.");

        // 3. Find groups managed by this engineer
        var groupIds = await _db.Groups.Find(g => g.EngineerId == code.UsedByEngineerId.Value && !g.IsDeleted)
                                      .Project(g => g.Id)
                                      .ToListAsync();

        // 4. Validate StudentId exists in those groups and isn't linked to a User yet
        var studentRecord = await _db.Students.Find(s => groupIds.Contains(s.GroupId) && (s.StudentId == studentId || s.UniqueStudentCode == studentId) && !s.IsDeleted && s.UserId == null).FirstOrDefaultAsync();
        if (studentRecord == null)
            return (null, "Student ID not found in any group managed by this engineer, or already registered.");

        // 5. Create the User account using the actual selected identifier
        var user = new User
        {
            Name = name,
            Username = username,
            Email = $"{username}@student.local", // Fake email for internal purposes
            StudentId = studentId,
            EngineerCode = engineerCode,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = UserRole.Student,
            IsApproved = true // Students are auto-approved
        };

        await _db.Users.InsertOneAsync(user);

        // 6. Link the Student record to the User account
        var updateStudent = Builders<Student>.Update.Set(s => s.UserId, user.Id).Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
        await _db.Students.UpdateOneAsync(s => s.Id == studentRecord.Id, updateStudent);

        return (user, null);
    }

    public async Task<(User? user, string? error)> ApproveEngineerAsync(Guid pendingId)
    {
        var pending = await _db.PendingEngineers.Find(p => p.Id == pendingId).FirstOrDefaultAsync();
        if (pending == null)
            return (null, "Pending registration not found.");

        if (pending.Status != PendingStatus.Pending)
            return (null, "This registration has already been processed.");

        // Double check email uniqueness in Users collection before proceeding
        var userFilter = Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(pending.Email)}$", "i"));
        var existingUser = await _db.Users.Find(userFilter).AnyAsync();
        if (existingUser)
            return (null, "A user with this email address already exists in the system.");

        // Auto-generate Engineer Code locally
        var newCode = "ENG-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

        // Create the user with the generated code
        var user = new User
        {
            Name = pending.Name,
            Email = pending.Email,
            PasswordHash = pending.PasswordHash,
            Role = UserRole.Engineer,
            EngineerCode = newCode,
            IsApproved = true
        };

        await _db.Users.InsertOneAsync(user);

        // Record the EngineerCode for students
        var codeEntity = new EngineerCode
        {
            Code = newCode,
            IsUsed = true,
            UsedByEngineerId = user.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _db.EngineerCodes.InsertOneAsync(codeEntity);

        // Mark pending as approved
        var updatePending = Builders<PendingEngineer>.Update
            .Set(p => p.Status, PendingStatus.Approved)
            .Set(p => p.UpdatedAt, DateTimeOffset.UtcNow);
        await _db.PendingEngineers.UpdateOneAsync(p => p.Id == pendingId, updatePending);

        // Create default timetable entries (Mon-Fri available, 09:00-22:00)
        var timetableEntries = new List<TimetableEntry>();
        for (int day = 0; day < 7; day++)
        {
            timetableEntries.Add(new TimetableEntry
            {
                EngineerId = user.Id,
                DayOfWeek = day,
                IsAvailable = day >= 1 && day <= 5, // Mon-Fri
                StartTime = new TimeSpan(9, 0, 0),
                EndTime = new TimeSpan(22, 0, 0)
            });
        }
        await _db.TimetableEntries.InsertManyAsync(timetableEntries);

        // Send Approval Email asynchronously (don't block the UI/API response)
        _ = Task.Run(async () => {
            try {
                using var scope = _serviceProvider.CreateScope();
                var mail = scope.ServiceProvider.GetRequiredService<SmtpEmailService>();
                var (success, error) = await mail.SendEmailAsync(
                    user.Email,
                    "SessionFlow: Identity Clearance Granted",
                    $@"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                        <h2 style='color: #3b82f6;'>Clearance Granted</h2>
                        <p>Welcome, <strong>{user.Name}</strong>. Your registration request has been approved by the central command.</p>
                        <div style='background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;'>
                            <p style='font-size: 12px; color: #64748b; margin: 0;'>Your Unique Engineer Code:</p>
                            <p style='font-size: 24px; font-weight: bold; color: #3b82f6; margin: 5px 0; letter-spacing: 2px;'>{newCode}</p>
                        </div>
                        <p>You can now log in and manage your units.</p>
                        <p style='color: #64748b; font-size: 10px; margin-top: 40px;'>SESSIONFLOW SECURITY ENFORCEMENT PROTOCOL</p>
                    </div>"
                );
                if (!success)
                {
                    // Log but don't fail the approval
                    System.Diagnostics.Debug.WriteLine($"Email dispatch failed: {error}");
                }
            } catch (Exception ex) {
                System.Diagnostics.Debug.WriteLine($"Email dispatch exception: {ex.Message}");
            }
        });

        return (user, null);
    }

    public async Task<(bool success, string? error)> DenyEngineerAsync(Guid pendingId)
    {
        var update = Builders<PendingEngineer>.Update
            .Set(p => p.Status, PendingStatus.Denied)
            .Set(p => p.UpdatedAt, DateTimeOffset.UtcNow);
        
        var result = await _db.PendingEngineers.UpdateOneAsync(p => p.Id == pendingId && p.Status == PendingStatus.Pending, update);
        
        if (result.MatchedCount == 0)
            return (false, "Pending registration not found or already processed.");

        return (true, null);
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
    }

    public async Task<User?> GetUserFromClaimsAsync(ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return null;

        return await GetUserByIdAsync(userId);
    }

    /// <summary>
    /// Resolves the Student record linked to a User, checking both StudentId and UniqueStudentCode.
    /// This is the SINGLE SOURCE OF TRUTH for student resolution — use this EVERYWHERE.
    /// </summary>
    public async Task<Student?> ResolveStudentForUser(User user)
    {
        if (string.IsNullOrEmpty(user.StudentId)) return null;
        return await _db.Students.Find(s =>
            (s.StudentId == user.StudentId || s.UniqueStudentCode == user.StudentId)
            && !s.IsDeleted
        ).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Resolves the Student record from a userId directly.
    /// Convenience overload for endpoints where only the userId is available.
    /// </summary>
    public async Task<Student?> ResolveStudentForUserId(Guid userId)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null || user.Role != UserRole.Student) return null;
        return await ResolveStudentForUser(user);
    }

    public async Task<string> UpdateAvatarAsync(Guid userId, string avatarPayload, string webRootPath)
    {
        string avatarUrl;

        // If payload is base64, save to file; otherwise treat as URL
        if (avatarPayload.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            // Extract bytes from base64 data URI
            var commaIndex = avatarPayload.IndexOf(',');
            if (commaIndex < 0)
                throw new ArgumentException("Invalid base64 image payload.");

            var base64Data = avatarPayload[(commaIndex + 1)..];
            var imageBytes = Convert.FromBase64String(base64Data);

            // Enforce 2MB limit
            if (imageBytes.Length > 2 * 1024 * 1024)
                throw new ArgumentException("Avatar too large. Maximum 2MB allowed.");

            var uploadsDir = Path.Combine(webRootPath, "uploads", "avatars");
            Directory.CreateDirectory(uploadsDir);

            // Deterministic filename per user — overwrites old avatar
            var fileName = $"{userId}.webp";
            var filePath = Path.Combine(uploadsDir, fileName);
            await File.WriteAllBytesAsync(filePath, imageBytes);

            avatarUrl = $"/uploads/avatars/{fileName}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        }
        else
        {
            // Already a URL
            avatarUrl = avatarPayload;
        }

        var update = Builders<User>.Update
            .Set(u => u.AvatarUrl, avatarUrl)
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);
        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);

        return avatarUrl;
    }

    public async Task<(bool success, string? error)> UpdatePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null) return (false, "User not found.");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
        {
            return (false, "Protocol Mismatch: Current password validation failed.");
        }

        if (newPassword.Length < 6)
        {
            return (false, "Security Constraint: Password must be at least 6 characters.");
        }

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        var update = Builders<User>.Update
            .Set(u => u.PasswordHash, newHash)
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return (true, null);
    }

    public string GenerateJwtToken(User user)
    {
        var secretKey = _config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey not configured.");
        var issuer = _config["Jwt:Issuer"] ?? "SessionFlow";
        var audience = _config["Jwt:Audience"] ?? "SessionFlow";
        var expiryDays = int.Parse(_config["Jwt:ExpiryDays"] ?? "7");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expiryDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task SeedAdminAsync()
    {
        var existingAdmin = await _db.Users.Find(u => u.Email == "admin@sessionflow.local").FirstOrDefaultAsync();
        if (existingAdmin != null)
        {
            // Update password to match current config to prevent locking out on password change/seed reset
            var update = Builders<User>.Update.Set(u => u.PasswordHash, BCrypt.Net.BCrypt.HashPassword(_generatedAdminPassword));
            await _db.Users.UpdateOneAsync(u => u.Id == existingAdmin.Id, update);
            return;
        }

        var admin = new User
        {
            Name = "Administrator",
            Email = "admin@sessionflow.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(_generatedAdminPassword),
            Role = UserRole.Admin,
            EngineerCode = "Eng1",
            IsApproved = true
        };

        await _db.Users.InsertOneAsync(admin);

        // Create default timetable entries for admin
        var timetableEntries = new List<TimetableEntry>();
        for (int day = 0; day < 7; day++)
        {
            timetableEntries.Add(new TimetableEntry
            {
                EngineerId = admin.Id,
                DayOfWeek = day,
                IsAvailable = day >= 1 && day <= 5,
                StartTime = new TimeSpan(9, 0, 0),
                EndTime = new TimeSpan(22, 0, 0)
            });
        }
        await _db.TimetableEntries.InsertManyAsync(timetableEntries);
    }

    public async Task SeedEngineerCodesAsync()
    {
        var existingCodes = await _db.EngineerCodes.Find(_ => true).Project(c => c.Code).ToListAsync();

        if (existingCodes.Count > 0) return;

        // Generate secure random codes
        var newCodes = new List<EngineerCode>();
        for (int i = 0; i < 3; i++)
        {
            newCodes.Add(new EngineerCode { Code = SecureBootstrapService.GenerateAccessCode() });
        }

        if (newCodes.Count > 0)
        {
            await _db.EngineerCodes.InsertManyAsync(newCodes);
        }
    }

    public async Task EnsureEngineerCodesAsync()
    {
        // Find all approved engineers who don't have an EngineerCode set
        var legacyEngineers = await _db.Users
            .Find(u => u.IsApproved && (u.EngineerCode == null || u.EngineerCode == "" || u.EngineerCode == "N/A"))
            .ToListAsync();

        foreach (var eng in legacyEngineers)
        {
            // Force Admin to Eng1
            if (eng.Role == UserRole.Admin)
            {
                var adminUpdate = Builders<User>.Update.Set(u => u.EngineerCode, "Eng1");
                await _db.Users.UpdateOneAsync(u => u.Id == eng.Id, adminUpdate);
                continue;
            }

            if (eng.Role != UserRole.Engineer) continue;

            // Generate unique code
            string newCode;
            do {
                newCode = "ENG-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            } while (await _db.Users.Find(u => u.EngineerCode == newCode).AnyAsync());

            // Update user
            var update = Builders<User>.Update.Set(u => u.EngineerCode, newCode);
            await _db.Users.UpdateOneAsync(u => u.Id == eng.Id, update);

            // Ensure the code is also in the EngineerCodes collection
            var codeEntity = new EngineerCode {
                Code = newCode,
                IsUsed = true,
                UsedByEngineerId = eng.Id,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await _db.EngineerCodes.InsertOneAsync(codeEntity);
        }
    }
}
