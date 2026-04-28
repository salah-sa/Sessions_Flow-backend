using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services.EventBus;

namespace SessionFlow.Desktop.Services;

public class AuthService
{
    private readonly MongoService _db;
    private readonly IConfiguration _config;
    private readonly string _generatedAdminPassword;
    private readonly NotificationService _notificationService;
    private readonly IEventBus _eventBus;
    private readonly IServiceScopeFactory _scopeFactory;

    public AuthService(MongoService db, IConfiguration config, NotificationService notificationService, IEventBus eventBus, IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _config = config;
        _notificationService = notificationService;
        _eventBus = eventBus;
        _scopeFactory = scopeFactory;
        _generatedAdminPassword = _config["Security:DefaultAdminPassword"] ?? "Admin1234!";
    }

    public async Task<(User? user, string? token, string? error)> LoginAsync(string identifier, string password, Api.Endpoints.AuthEndpoints.LoginPortal portal, string? studentId = null, string? engineerCode = null, CancellationToken ct = default)
    {
        User? user;
        if (portal == Api.Endpoints.AuthEndpoints.LoginPortal.Student)
        {
            if (string.IsNullOrWhiteSpace(studentId) || string.IsNullOrWhiteSpace(engineerCode))
                return (null, null, "Student ID and Engineer Code are required for the Student portal.");

            // Student Login
            var filter = Builders<User>.Filter.Eq(u => u.Username, identifier)
                       & Builders<User>.Filter.Eq(u => u.StudentId, studentId)
                       & Builders<User>.Filter.Eq(u => u.EngineerCode, engineerCode);
            user = await _db.Users.Find(filter, new FindOptions { Collation = new Collation("en", strength: CollationStrength.Secondary) })
                .FirstOrDefaultAsync(ct);
        }
        else
        {
            // Admin/Engineer Login
            var filter = Builders<User>.Filter.Eq(u => u.Email, identifier);
            user = await _db.Users.Find(filter, new FindOptions { Collation = new Collation("en", strength: CollationStrength.Secondary) })
                .FirstOrDefaultAsync(ct);

            if (user != null && user.Role == UserRole.Student)
                return (null, null, "Access Denied: Students are not permitted to access the Operations portal.");
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

    public async Task<(PendingEngineer? pending, string? error)> RegisterAsync(string name, string email, string password, CancellationToken ct = default)
    {
        // Check if email already exists in Users or PendingEngineers
        var userFilter = Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(email)}$", "i"));
        var existingUser = await _db.Users.Find(userFilter).AnyAsync(ct);
        if (existingUser)
            return (null, "An account with this email already exists.");

        var pendingFilter = Builders<PendingEngineer>.Filter.Regex(p => p.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(email)}$", "i"))
                          & Builders<PendingEngineer>.Filter.Eq(p => p.Status, PendingStatus.Pending);
        var existingPending = await _db.PendingEngineers.Find(pendingFilter).AnyAsync(ct);
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

    public async Task<(User? user, string? error)> RegisterStudentAsync(string name, string username, string password, string studentId, string engineerCode, CancellationToken ct = default)
    {
        // ... legacy signup ... 
        var usernameFilter = Builders<User>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(username)}$", "i"));
        var usernameExists = await _db.Users.Find(usernameFilter).AnyAsync(ct);
        if (usernameExists) return (null, "Username already taken.");

        var sidExists = await _db.Users.Find(u => u.StudentId == studentId).AnyAsync(ct);
        if (sidExists) return (null, "An account with this Student ID already exists.");

        var codeFilter = Builders<EngineerCode>.Filter.Regex(c => c.Code, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(engineerCode)}$", "i"))
                       & Builders<EngineerCode>.Filter.Eq(c => c.IsUsed, true);
        var code = await _db.EngineerCodes.Find(codeFilter).FirstOrDefaultAsync(ct);
        if (code == null || !code.UsedByEngineerId.HasValue)
            return (null, "Invalid Engineer Code.");

        var groupIds = await _db.Groups.Find(g => g.EngineerId == code.UsedByEngineerId.Value && !g.IsDeleted).Project(g => g.Id).ToListAsync();

        var studentRecord = await _db.Students.Find(s => groupIds.Contains(s.GroupId) && (s.StudentId == studentId || s.UniqueStudentCode == studentId) && !s.IsDeleted && s.UserId == null).FirstOrDefaultAsync();
        if (studentRecord == null)
            return (null, "Student ID not found in any group managed by this engineer, or already registered.");

        var user = new User
        {
            Name = name,
            Username = username,
            Email = $"{username}@student.local",
            StudentId = studentId,
            EngineerCode = engineerCode,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = UserRole.Student,
            IsApproved = true
        };

        await _db.Users.InsertOneAsync(user);

        var updateStudent = Builders<Student>.Update.Set(s => s.UserId, user.Id).Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
        await _db.Students.UpdateOneAsync(s => s.Id == studentRecord.Id, updateStudent);

        return (user, null);
    }

    public async Task<(PendingStudentRequest? pending, string? error)> QueueStudentRequestAsync(string name, string username, string email, string password, string groupName, string? studentId = null, CancellationToken ct = default)
    {
        // 1. Check rate limits (max 3 requests per day) — anchored to Cairo midnight
        var cairoTz = TimeZoneHelper.GetConfiguredTimeZone(_config);
        var cairoNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz);
        var startOfDay = new DateTimeOffset(cairoNow.Date, cairoTz.GetUtcOffset(cairoNow.Date));
        var requestCount = await _db.PendingStudentRequests
            .Find(p => (p.Email.ToLower() == email.ToLower() || p.Username.ToLower() == username.ToLower()) 
                  && p.RequestedAt >= startOfDay)
            .CountDocumentsAsync(ct);

        if (requestCount >= 3)
            return (null, "You have reached the maximum of 3 requests per day.");

        // 2. Check if username exists
        var usernameFilter = Builders<User>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(username)}$", "i"));
        var usernameExists = await _db.Users.Find(usernameFilter).AnyAsync(ct);
        if (usernameExists) return (null, "Username is already taken.");

        var emailFilter = Builders<User>.Filter.Eq(u => u.Email, email);
        if (await _db.Users.Find(emailFilter).AnyAsync(ct)) return (null, "Email address is already registered.");

        // 2. Find groups that match this name (case-insensitive)
        var groupFilter = Builders<Group>.Filter.Regex(g => g.Name, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(groupName)}$", "i"))
                        & Builders<Group>.Filter.Eq(g => g.IsDeleted, false);
        
        var groups = await _db.Groups.Find(groupFilter).ToListAsync(ct);
        if (groups.Count == 0)
            return (null, "Group not found. Please ensure you entered the exact correct group name.");

        // If multiple groups have the exact same name, we could queue for all or take the first. 
        // We will queue for the first one found to keep it simple, or queue multiple.
        var group = groups.First();

        var pending = new PendingStudentRequest
        {
            Name = name,
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            GroupName = group.Name,
            GroupId = group.Id,
            EngineerId = group.EngineerId,
            StudentId = studentId,
            Status = PendingStatus.Pending
        };

        await _db.PendingStudentRequests.InsertOneAsync(pending);

        // Notify the specific Engineer
        await _notificationService.CreateNotificationAsync(
            group.EngineerId,
            "New Student Join Request",
            $"{name} wants to join {group.Name}",
            NotificationType.Info
        );

        return (pending, null);
    }

    public async Task<List<PendingStudentRequest>> GetPendingStudentRequestsAsync(User user)
    {
        if (user.Role == UserRole.Admin)
        {
            return await _db.PendingStudentRequests
                .Find(p => p.Status == PendingStatus.Pending)
                .SortByDescending(p => p.RequestedAt)
                .ToListAsync();
        }
        else if (user.Role == UserRole.Engineer)
        {
            return await _db.PendingStudentRequests
                .Find(p => p.EngineerId == user.Id && p.Status == PendingStatus.Pending)
                .SortByDescending(p => p.RequestedAt)
                .ToListAsync();
        }
        return new List<PendingStudentRequest>();
    }

    public async Task<(User? user, string? error)> ApproveStudentRequestAsync(Guid pendingId, User executor, CancellationToken ct = default)
    {
        var pending = await _db.PendingStudentRequests.Find(p => p.Id == pendingId).FirstOrDefaultAsync(ct);
        if (pending == null) return (null, "Request not found.");
        
        // Strict Scoping Enforcement
        if (executor.Role == UserRole.Engineer && pending.EngineerId != executor.Id)
            return (null, "Action forbidden. This request does not belong to your assigned sector.");

        if (pending.Status != PendingStatus.Pending) return (null, "Request already processed.");

        // Double check username availability
        var usernameFilter = Builders<User>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(pending.Username)}$", "i"));
        if (await _db.Users.Find(usernameFilter).AnyAsync(ct))
            return (null, "The requested username is no longer available.");

        // Double check email availability (prevents DuplicateKeyException on InsertOneAsync)
        var emailFilter = Builders<User>.Filter.Eq(u => u.Email, pending.Email);
        if (await _db.Users.Find(emailFilter).AnyAsync(ct))
            return (null, "The requested email address is already registered to another account.");

        // Look up the engineer to get their EngineerCode
        var engineer = await _db.Users.Find(u => u.Id == pending.EngineerId).FirstOrDefaultAsync(ct);
        if (engineer == null)
        {
            if (executor.Role == UserRole.Admin)
            {
                // Fallback to the admin executor for groups with unassigned/invalid engineers (e.g. from 3C import)
                engineer = executor;
                // Also assign this Admin to the group to fix future issues
                await _db.Groups.UpdateOneAsync(g => g.Id == pending.GroupId, Builders<Group>.Update.Set(g => g.EngineerId, executor.Id), cancellationToken: ct);
            }
            else
            {
                return (null, "Managing engineer not found.");
            }
        }

        if (string.IsNullOrEmpty(engineer.EngineerCode))
        {
            if (engineer.Role == UserRole.Admin)
            {
                engineer.EngineerCode = "Eng1";
                await _db.Users.UpdateOneAsync(u => u.Id == engineer.Id, Builders<User>.Update.Set(x => x.EngineerCode, "Eng1"), cancellationToken: ct);
            }
            else
            {
                return (null, "Managing engineer is not fully configured. Code missing.");
            }
        }

        // Generate the Student Record/Linkage
        string studentCode;
        Guid studentRecordId;

        if (!string.IsNullOrEmpty(pending.StudentId))
        {
            // Linking to an existing student
            var filterBuilder = Builders<Student>.Filter;
            var filter = filterBuilder.Eq(s => s.StudentId, pending.StudentId) | 
                         filterBuilder.Eq(s => s.UniqueStudentCode, pending.StudentId);
            
            if (Guid.TryParse(pending.StudentId, out var parsedGuid))
            {
                filter |= filterBuilder.Eq(s => s.Id, parsedGuid);
            }
            
            var existingStudent = await _db.Students.Find(filter).FirstOrDefaultAsync();
            if (existingStudent != null)
            {
                studentCode = existingStudent.UniqueStudentCode ?? existingStudent.StudentId ?? "";
                studentRecordId = existingStudent.Id;
            }
            else
            {
                // Fallback: existing student not found, create new
                studentCode = Models.Student.GenerateCode(pending.Name, pending.GroupId);
                var newStudent = new Student
                {
                    GroupId = pending.GroupId,
                    Name = pending.Name,
                    StudentId = studentCode,
                    UniqueStudentCode = studentCode,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                await _db.Students.InsertOneAsync(newStudent);
                studentRecordId = newStudent.Id;
            }
        }
        else
        {
            // Legacy flow: create new
            studentCode = Models.Student.GenerateCode(pending.Name, pending.GroupId);
            var student = new Student
            {
                GroupId = pending.GroupId,
                Name = pending.Name,
                StudentId = studentCode,
                UniqueStudentCode = studentCode,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await _db.Students.InsertOneAsync(student);
            studentRecordId = student.Id;
        }

        // Create the User Account
        var user = new User
        {
            Name = pending.Name,
            Username = pending.Username,
            Email = pending.Email, // Store real email for recovery and communication
            StudentId = studentCode,
            EngineerCode = engineer.EngineerCode,
            PasswordHash = pending.PasswordHash,
            Role = UserRole.Student,
            IsApproved = true
        };
        await _db.Users.InsertOneAsync(user);

        // Link the student record
        var updateStudent = Builders<Student>.Update.Set(s => s.UserId, user.Id).Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
        await _db.Students.UpdateOneAsync(s => s.Id == studentRecordId, updateStudent);

        // Update pending status
        var updatePending = Builders<PendingStudentRequest>.Update
            .Set(p => p.Status, PendingStatus.Approved)
            .Set(p => p.UpdatedAt, DateTimeOffset.UtcNow);
        await _db.PendingStudentRequests.UpdateOneAsync(p => p.Id == pendingId, updatePending);

        // Send activation email (scoped background task with error logging)
        _ = Task.Run(async () =>
        {
            const int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var mail = scope.ServiceProvider.GetRequiredService<EmailService>();
                    var (emailSuccess, emailError) = await mail.SendEmailAsync(
                        user.Email,
                        "SessionFlow: Student Activation Completed",
                        $@"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                            <h2 style='color: #22c55e;'>Access Granted</h2>
                            <p>Welcome, <strong>{user.Name}</strong>. Your request to join <strong>{pending.GroupName}</strong> has been approved.</p>
                            <div style='background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;'>
                                <p style='font-size: 12px; color: #64748b; margin: 0;'>Your Generated Student ID:</p>
                                <p style='font-size: 20px; font-weight: bold; color: #3b82f6; margin: 5px 0;'>{studentCode}</p>
                                <br/>
                                <p style='font-size: 12px; color: #64748b; margin: 0;'>Engineer Clearance Code:</p>
                                <p style='font-size: 20px; font-weight: bold; color: #10b981; margin: 5px 0;'>{engineer.EngineerCode}</p>
                            </div>
                            <p>You can now log in using your Username and Password.</p>
                        </div>"
                    );

                    if (emailSuccess) break; // Success â€” exit retry loop

                    if (attempt == maxRetries && !emailSuccess)
                    {
                        // Final attempt failed â€” notify engineer
                        var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();
                        await notifService.CreateNotificationAsync(
                            pending.EngineerId,
                            "Email Delivery Failed",
                            $"Could not send activation email to {user.Email}: {emailError}. Please notify the student manually with their Student ID {studentCode}.",
                            NotificationType.Warning
                        );
                    }

                    // Wait before retry (exponential backoff: 2s, 4s, 8s)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
                catch (Exception ex)
                {
                    if (attempt == maxRetries)
                    {
                        Serilog.Log.Error(ex, "[EMAIL] Failed after {MaxRetries} retries for {Email}", maxRetries, user.Email);
                    }
                    else
                    {
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                    }
                }
            }
        });

        // Create an internal notification for the student immediately as a fallback to email
        _ = Task.Run(async () => {
            try {
                using var scope = _scopeFactory.CreateScope();
                var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();
                await notifService.CreateNotificationAsync(
                    user.Id,
                    "Registration Approved",
                    $"Welcome! Your request for {pending.GroupName} has been approved.\nStudent ID: {studentCode}\nEngineer Code: {engineer.EngineerCode}",
                    NotificationType.Success
                );
            } catch (Exception ex) {
                Serilog.Log.Error(ex, "[NOTIF] Failed to create approval notification for student {UserId}", user.Id);
            }
        });

        // Publish Event for real-time frontend update (including credentials for instant UI feedback)
        await _eventBus.PublishAsync(Events.RequestAccepted, EventTargetType.All, "", new { 
            PendingId = pendingId, 
            UserId = user.Id, 
            EngineerId = pending.EngineerId,
            GroupId = pending.GroupId,
            StudentId = studentCode,
            EngineerCode = engineer.EngineerCode
        });

        return (user, null);
    }

    public async Task<(bool success, string? error)> DenyStudentRequestAsync(Guid pendingId, User executor, CancellationToken ct = default)
    {
        var pending = await _db.PendingStudentRequests.Find(p => p.Id == pendingId).FirstOrDefaultAsync();
        if (pending == null) return (false, "Request not found.");
        
        // Strict Scoping Enforcement
        if (executor.Role == UserRole.Engineer && pending.EngineerId != executor.Id)
            return (false, "Action forbidden. This request does not belong to your assigned sector.");

        if (pending.Status != PendingStatus.Pending) return (false, "Request already processed.");

        var update = Builders<PendingStudentRequest>.Update
            .Set(p => p.Status, PendingStatus.Denied)
            .Set(p => p.UpdatedAt, DateTimeOffset.UtcNow);
        
        var result = await _db.PendingStudentRequests.UpdateOneAsync(p => p.Id == pendingId && p.Status == PendingStatus.Pending, update);
        
        if (result.MatchedCount == 0)
            return (false, "Request not found or already processed.");

        // Publish Event for real-time frontend update
        await _eventBus.PublishAsync(Events.RequestRejected, EventTargetType.All, "", new { PendingId = pendingId });

        return (true, null);
    }

    public async Task<(User? user, string? error)> ApproveEngineerAsync(Guid pendingId, CancellationToken ct = default)
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
            Username = pending.Email, // Ensure username is set for login
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

        // Send Approval Email asynchronously with retry (matches student flow robustness)
        _ = Task.Run(async () =>
        {
            const int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var mail = scope.ServiceProvider.GetRequiredService<EmailService>();
                    var (emailSuccess, emailError) = await mail.SendEmailAsync(
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

                    if (emailSuccess) break; // Success — exit retry loop

                    if (attempt == maxRetries && !emailSuccess)
                    {
                        // Final attempt failed — notify admins
                        var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();
                        await notifService.NotifyAdminsAsync(
                            "Email Delivery Failed",
                            $"Could not send approval email to engineer {user.Email}: {emailError}. Engineer Code: {newCode}. Please notify them manually.",
                            NotificationType.Warning
                        );
                    }

                    // Wait before retry (exponential backoff: 2s, 4s, 8s)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                }
                catch (Exception ex)
                {
                    if (attempt == maxRetries)
                    {
                        Serilog.Log.Error(ex, "[EMAIL] Failed after {MaxRetries} retries for engineer {Email}", maxRetries, user.Email);
                    }
                    else
                    {
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                    }
                }
            }
        });

        // Create an internal notification for the engineer as a fallback to email
        _ = Task.Run(async () => {
            try {
                using var scope = _scopeFactory.CreateScope();
                var notifService = scope.ServiceProvider.GetRequiredService<NotificationService>();
                await notifService.CreateNotificationAsync(
                    user.Id,
                    "Registration Approved",
                    $"Welcome! Your registration has been approved.\nEngineer Code: {newCode}\nYou can now log in and manage your units.",
                    NotificationType.Success
                );
            } catch (Exception ex) {
                Serilog.Log.Error(ex, "[NOTIF] Failed to create approval notification for engineer {UserId}", user.Id);
            }
        });


        return (user, null);
    }

    public async Task<(bool success, string? error, int remaining)> ResendCredentialsAsync(string email, CancellationToken ct = default)
    {
        var user = await _db.Users.Find(u => u.Email == email).FirstOrDefaultAsync(ct);
        if (user == null) 
            return (false, "Email not found in our system.", 0);

        if (!user.IsApproved)
            return (false, "Your account has not been approved by an administrator yet. Please check back later.", 0);

        // Atomic rate-limit enforcement: use FindOneAndUpdate to prevent race conditions
        var now = DateTimeOffset.UtcNow;
        var dailyLimit = 6;

        // Determine if we're still within the same UTC day to decide inc vs reset
        UpdateDefinition<User> updateDef;
        if (user.LastCredentialResendAt.HasValue && user.LastCredentialResendAt.Value.Date == now.Date)
        {
            if (user.ResendCredentialsCount >= dailyLimit)
                return (false, "Daily limit reached. You can request your credentials up to 6 times per day.", 0);

            // Atomic increment — only succeeds if still under the limit
            updateDef = Builders<User>.Update
                .Inc(u => u.ResendCredentialsCount, 1)
                .Set(u => u.LastCredentialResendAt, now);
        }
        else
        {
            // New day: reset counter atomically
            updateDef = Builders<User>.Update
                .Set(u => u.ResendCredentialsCount, 1)
                .Set(u => u.LastCredentialResendAt, now);
        }

        var updatedUser = await _db.Users.FindOneAndUpdateAsync(
            u => u.Id == user.Id,
            updateDef,
            new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After },
            cancellationToken: ct);

        if (updatedUser == null)
            return (false, "Failed to update rate limit. Please try again.", 0);

        if (updatedUser.ResendCredentialsCount > dailyLimit)
            return (false, "Daily limit reached. You can request your credentials up to 6 times per day.", 0);

        var remaining = dailyLimit - updatedUser.ResendCredentialsCount;

        // Send Email asynchronously
        _ = Task.Run(async () => {
            try {
                using var scope = _scopeFactory.CreateScope();
                var mail = scope.ServiceProvider.GetRequiredService<EmailService>();
                
                string subject, body;
                if (user.Role == UserRole.Student)
                {
                    subject = "SessionFlow: Student Credentials Recovery";
                    body = $@"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                            <h2 style='color: #22c55e;'>Credentials Recovered</h2>
                            <p>Hello, <strong>{user.Name}</strong>. Here are your sign-in details as requested.</p>
                            <div style='background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;'>
                                <p style='font-size: 12px; color: #64748b; margin: 0;'>Your Student ID:</p>
                                <p style='font-size: 20px; font-weight: bold; color: #3b82f6; margin: 5px 0;'>{user.StudentId ?? "N/A"}</p>
                                <br/>
                                <p style='font-size: 12px; color: #64748b; margin: 0;'>Engineer Clearance Code:</p>
                                <p style='font-size: 20px; font-weight: bold; color: #10b981; margin: 5px 0;'>{user.EngineerCode ?? "N/A"}</p>
                            </div>
                            <p>Use your Username and Password to access the platform.</p>
                        </div>";
                }
                else
                {
                    subject = "SessionFlow: Engineer Credentials Recovery";
                    body = $@"<div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;'>
                        <h2 style='color: #3b82f6;'>Credentials Recovered</h2>
                        <p>Hello, <strong>{user.Name}</strong>. Here is your clearance code as requested.</p>
                        <div style='background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;'>
                            <p style='font-size: 12px; color: #64748b; margin: 0;'>Your Unique Engineer Code:</p>
                            <p style='font-size: 24px; font-weight: bold; color: #3b82f6; margin: 5px 0; letter-spacing: 2px;'>{user.EngineerCode ?? "N/A"}</p>
                        </div>
                    </div>";
                }

                await mail.SendEmailAsync(user.Email, subject, body);
            } catch (Exception ex) {
                Serilog.Log.Error(ex, "[EMAIL] Resend credentials email failed for {Email}", user.Email);
            }
        });

        return (true, null, 6 - user.ResendCredentialsCount);
    }

    public async Task<(bool success, string? error)> DenyEngineerAsync(Guid pendingId, CancellationToken ct = default)
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
    /// Returns ONLY the first one. Use ResolveAllStudentsForUser to get all enrolled groups.
    /// </summary>
    public async Task<Student?> ResolveStudentForUser(User user, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(user.StudentId)) return null;
        return await _db.Students.Find(s =>
            (s.StudentId == user.StudentId || s.UniqueStudentCode == user.StudentId)
            && !s.IsDeleted
        ).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Resolves all Student records linked to a User.
    /// Use this to authorize multi-group access for a student.
    /// </summary>
    public async Task<List<Student>> ResolveAllStudentsForUser(User user, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(user.StudentId)) return new List<Student>();
        
        var filter = Builders<Student>.Filter.And(
            Builders<Student>.Filter.Or(
                Builders<Student>.Filter.Eq(s => s.StudentId, user.StudentId),
                Builders<Student>.Filter.Eq(s => s.UniqueStudentCode, user.StudentId)
            ),
            Builders<Student>.Filter.Eq(s => s.IsDeleted, false)
        );

        // Optional: Filter strictly by the Engineer Code the user signed up with
        // First we get ALL student records matching the ID.
        var students = await _db.Students.Find(filter).ToListAsync();
        
        if (students.Count == 0 || string.IsNullOrEmpty(user.EngineerCode)) 
            return students;

        // Need to ensure the groups actually belong to the engineer the user registered with
        var codeEntity = await _db.EngineerCodes.Find(c => c.Code == user.EngineerCode && c.IsUsed).FirstOrDefaultAsync();
        if (codeEntity != null && codeEntity.UsedByEngineerId.HasValue)
        {
            var engineerId = codeEntity.UsedByEngineerId.Value;
            var groupIds = students.Select(s => s.GroupId).Distinct().ToList();
            
            // Get valid groups mapped to this engineer
            var validGroupIds = await _db.Groups
                .Find(g => g.EngineerId == engineerId && groupIds.Contains(g.Id) && !g.IsDeleted)
                .Project(g => g.Id)
                .ToListAsync();
                
            return students.Where(s => validGroupIds.Contains(s.GroupId)).ToList();
        }
        
        return students;
    }

    /// <summary>
    /// Resolves the Student record from a userId directly.
    /// </summary>
    public async Task<Student?> ResolveStudentForUserId(Guid userId, CancellationToken ct = default)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null || user.Role != UserRole.Student) return null;
        return await ResolveStudentForUser(user, ct);
    }

    public async Task<string> UpdateAvatarAsync(Guid userId, string avatarPayload, string webRootPath, CancellationToken ct = default)
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

            using var scope = _scopeFactory.CreateScope();
            var storage = scope.ServiceProvider.GetRequiredService<StorageService>();
            using (var stream = new MemoryStream(imageBytes))
            {
                var gridFsId = await storage.UploadFileAsync(stream, $"{userId}.webp", "image/webp");
                avatarUrl = $"/api/media/{gridFsId}";
            }
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

    public async Task<(bool success, string? error)> UpdatePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct = default)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null) return (false, "User not found.");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
        {
            return (false, "Protocol Mismatch: Current password validation failed.");
        }

        if (newPassword.Length < 8 || 
            !newPassword.Any(char.IsUpper) || 
            !newPassword.Any(char.IsDigit) || 
            !newPassword.Any(c => !char.IsLetterOrDigit(c)))
        {
            return (false, "Security Constraint: Password must be at least 8 characters and contain uppercase, digit, and special characters.");
        }

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        var update = Builders<User>.Update
            .Set(u => u.PasswordHash, newHash)
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return (true, null);
    }

    public async Task<(bool success, string? error)> UpdateDisplayNameAsync(Guid userId, string displayName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length < 2 || displayName.Length > 30)
            return (false, "Display name must be between 2 and 30 characters.");

        // Only allow letters, numbers, spaces, and basic punctuation
        if (!System.Text.RegularExpressions.Regex.IsMatch(displayName, @"^[\p{L}\p{N}\s.\-_]+$"))
            return (false, "Display name can only contain letters, numbers, spaces, dots, hyphens, and underscores.");

        var update = Builders<User>.Update
            .Set(u => u.DisplayName, displayName.Trim())
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

        await _db.Users.UpdateOneAsync(u => u.Id == userId, update, cancellationToken: ct);
        return (true, null);
    }

    public async Task<(bool success, string? error)> RequestEmailChangeAsync(Guid userId, string newEmail, CancellationToken ct = default)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null) return (false, "User not found.");

        // Validate email format
        if (string.IsNullOrWhiteSpace(newEmail) || !newEmail.Contains('@') || !newEmail.Contains('.'))
            return (false, "Invalid email format.");

        newEmail = newEmail.Trim().ToLowerInvariant();

        if (newEmail == user.Email.ToLowerInvariant())
            return (false, "New email is the same as your current email.");

        // Check uniqueness
        var emailFilter = Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(newEmail)}$", "i"));
        if (await _db.Users.Find(emailFilter).AnyAsync(ct))
            return (false, "This email address is already registered to another account.");

        // Rate limit (60s cooldown)
        var lastToken = await _db.EmailChangeTokens
            .Find(t => t.UserId == userId && t.CreatedAt > DateTimeOffset.UtcNow.AddSeconds(-60))
            .SortByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (lastToken != null)
            return (false, "Please wait 60 seconds before requesting another verification code.");

        // Generate 5-digit numeric code
        var code = Generate5DigitCode();

        var token = new EmailChangeToken
        {
            UserId = userId,
            OldEmail = user.Email,
            NewEmail = newEmail,
            Code = code,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15)
        };
        await _db.EmailChangeTokens.InsertOneAsync(token, cancellationToken: ct);

        // Send verification code to OLD email
        using (var scope = _scopeFactory.CreateScope())
        {
            var mail = scope.ServiceProvider.GetRequiredService<EmailService>();
            var body = $@"
                <div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; margin: auto;'>
                    <h2 style='color: #f59e0b; font-size: 24px; margin-bottom: 20px;'>Email Change Verification</h2>
                    <p style='color: #94a3b8; font-size: 16px; margin-bottom: 10px;'>A request was made to change your email to:</p>
                    <p style='color: #60a5fa; font-size: 18px; font-weight: bold; margin-bottom: 30px;'>{newEmail}</p>
                    <p style='color: #94a3b8; font-size: 14px; margin-bottom: 20px;'>Enter this verification code to confirm:</p>
                    <div style='background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 20px; border-radius: 12px; display: inline-block;'>
                        <span style='font-size: 36px; font-weight: bold; letter-spacing: 16px; color: #f59e0b;'>{code}</span>
                    </div>
                    <p style='color: #64748b; font-size: 12px; margin-top: 40px;'>This code expires in 15 minutes. If you did not request this, please ignore this email.</p>
                </div>";

            var (sent, mailError) = await mail.SendEmailAsync(user.Email, "SessionFlow: Email Change Verification Code", body, ct);
            if (!sent) return (false, mailError ?? "Failed to send verification email.");
        }

        return (true, null);
    }

    public async Task<(bool success, string? error)> VerifyEmailChangeAsync(Guid userId, string code, CancellationToken ct = default)
    {
        var token = await _db.EmailChangeTokens
            .Find(t => t.UserId == userId && !t.IsUsed && t.ExpiresAt > DateTimeOffset.UtcNow)
            .SortByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (token == null)
            return (false, "No pending email change request found, or the code has expired.");

        if (token.Attempts >= 3)
            return (false, "Too many failed attempts. Please request a new verification code.");

        if (token.Code != code)
        {
            await _db.EmailChangeTokens.UpdateOneAsync(
                t => t.Id == token.Id,
                Builders<EmailChangeToken>.Update.Inc(t => t.Attempts, 1),
                cancellationToken: ct);
            return (false, $"Invalid code. {2 - token.Attempts} attempt(s) remaining.");
        }

        // Code matches — update email
        var userUpdate = Builders<User>.Update
            .Set(u => u.Email, token.NewEmail)
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

        await _db.Users.UpdateOneAsync(u => u.Id == userId, userUpdate, cancellationToken: ct);

        // Mark token as used
        await _db.EmailChangeTokens.UpdateOneAsync(
            t => t.Id == token.Id,
            Builders<EmailChangeToken>.Update.Set(t => t.IsUsed, true),
            cancellationToken: ct);

        return (true, null);
    }

    private string Generate5DigitCode()
    {
        var randomBytes = new byte[4];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        var num = Math.Abs(BitConverter.ToInt32(randomBytes, 0)) % 90000 + 10000; // 10000-99999
        return num.ToString();
    }

    public async Task<(bool success, string? error)> UpgradeSubscriptionTierAsync(Guid userId, SubscriptionTier tier, bool isAnnual, CancellationToken ct = default)
    {
        var user = await GetUserByIdAsync(userId);
        if (user == null) return (false, "User not found.");

        // 1. Update User Record
        var userUpdate = Builders<User>.Update
            .Set(u => u.SubscriptionTier, tier)
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);
        
        await _db.Users.UpdateOneAsync(u => u.Id == userId, userUpdate, cancellationToken: ct);

        // 2. Upsert Subscription Record
        var durationDays = isAnnual ? 365 : 30;
        var subscription = new Subscription
        {
            UserId = userId,
            Tier = tier,
            Status = SubscriptionStatus.Active,
            CurrentPeriodStart = DateTimeOffset.UtcNow,
            CurrentPeriodEnd = DateTimeOffset.UtcNow.AddDays(durationDays),
            CancelAtPeriodEnd = false
        };

        await _db.Subscriptions.ReplaceOneAsync(
            s => s.UserId == userId, 
            subscription, 
            new ReplaceOptions { IsUpsert = true }, 
            ct);

        // 3. Notify User
        await _notificationService.CreateNotificationAsync(
            userId,
            "Premium Activated",
            $"Welcome to the {tier} tier! Your premium features are now unlocked.",
            NotificationType.Success
        );

        // 4. Publish Event for Real-time UI Refresh
        await _eventBus.PublishAsync(Events.SyncState, EventTargetType.User, userId.ToString(), new { 
            Tier = tier,
            IsPremium = tier != SubscriptionTier.Free 
        });

        return (true, null);
    }

    public string GenerateJwtToken(User user)
    {
        var secretKey = _config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey not configured.");
        var issuer = _config["Jwt:Issuer"] ?? "SessionFlow";
        var audience = _config["Jwt:Audience"] ?? "SessionFlow";
        var expiryDays = int.Parse(_config["Jwt:ExpiryDays"] ?? "7");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey.Trim()))
        {
            KeyId = "SessionFlow-Primary-Key"
        };
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        if (user.Role == UserRole.Admin)
        {
            claims.Add(new Claim("scope", "view:student_requests"));
            claims.Add(new Claim("scope", "approve:student"));
            claims.Add(new Claim("scope", "view:audit_logs"));
            claims.Add(new Claim("scope", "manage:engineers"));
        }
        else if (user.Role == UserRole.Engineer)
        {
            claims.Add(new Claim("scope", "view:student_requests"));
            claims.Add(new Claim("scope", "approve:student"));
        }


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
        const string newAdminEmail = "salahfdasalahfda.11188@gmail.com";
        const string oldAdminEmail = "admin@sessionflow.local";

        // Migration path: If admin exists with old email, update to new email
        var legacyAdmin = await _db.Users.Find(u => u.Email == oldAdminEmail).FirstOrDefaultAsync();
        if (legacyAdmin != null)
        {
            var migrateUpdate = Builders<User>.Update
                .Set(u => u.Email, newAdminEmail)
                .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);
            await _db.Users.UpdateOneAsync(u => u.Id == legacyAdmin.Id, migrateUpdate);
            return;
        }

        var existingAdmin = await _db.Users.Find(u => u.Email == newAdminEmail).FirstOrDefaultAsync();
        if (existingAdmin != null)
        {
            // PROD FIX: Only seed if missing. Do NOT overwrite existing password on restart.
            return;
        }

        var admin = new User
        {
            Name = "Administrator",
            Email = newAdminEmail,
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

    public async Task<(bool success, string? error)> RequestPasswordResetAsync(string email, CancellationToken ct = default)
    {
        // 1. Find user
        var user = await _db.Users.Find(u => u.Email == email, new FindOptions { Collation = new Collation("en", strength: CollationStrength.Secondary) }).FirstOrDefaultAsync();
        if (user == null)
            return (false, "If an account with this email exists, a reset code has been sent."); // Standard security response

        // 2. Check administrator approval
        if (!user.IsApproved)
            return (false, "Your account is pending administrative approval. Password reset is currently disabled.");

        // 3. Reject legacy/local student emails
        if (user.Email.EndsWith("@student.local", StringComparison.OrdinalIgnoreCase))
            return (false, "This account does not have a registered external email for password recovery. Please contact your administrator.");

        // 3. Rate limiting check (60s cooldown)
        var lastToken = await _db.PasswordResetTokens
            .Find(t => t.Email == email && t.CreatedAt > DateTimeOffset.UtcNow.AddSeconds(-60))
            .SortByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastToken != null)
            return (false, "Please wait 60 seconds before requesting another code.");

        // 4. Generate 6-char code
        string code = GenerateResetCode();

        // 5. Store token
        var token = new PasswordResetToken
        {
            UserId = user.Id,
            Email = user.Email,
            Code = code,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15) // 15m TTL
        };
        await _db.PasswordResetTokens.InsertOneAsync(token);

        // 6. Send email
        using (var scope = _scopeFactory.CreateScope())
        {
            var mail = scope.ServiceProvider.GetRequiredService<EmailService>();
            var subject = "SessionFlow - Password Reset Code";
            var body = $@"
                <div style='font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; margin: auto;'>
                    <h2 style='color: #3b82f6; font-size: 24px; margin-bottom: 20px;'>Verification Secure Link</h2>
                    <p style='color: #94a3b8; font-size: 16px; margin-bottom: 30px;'>Use the code below to reset your password. This code expires in 15 minutes.</p>
                    <div style='background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); padding: 20px; border-radius: 12px; display: inline-block;'>
                        <span style='font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #60a5fa;'>{code}</span>
                    </div>
                    <p style='color: #64748b; font-size: 12px; margin-top: 40px;'>If you did not request this, please ignore this email.</p>
                </div>";

            var (sent, mailError) = await mail.SendEmailAsync(user.Email, subject, body);
            if (!sent) return (false, mailError);
        }

        return (true, null);
    }

    public async Task<(Guid? tokenId, string? error)> VerifyResetCodeAsync(string email, string code, CancellationToken ct = default)
    {
        var token = await _db.PasswordResetTokens
            .Find(t => t.Email == email && !t.IsUsed && t.ExpiresAt > DateTimeOffset.UtcNow)
            .SortByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (token == null)
            return (null, "Invalid or expired code.");

        if (token.Attempts >= 3)
            return (null, "Too many failed attempts. Please request a new code.");

        if (token.Code.Equals(code, StringComparison.OrdinalIgnoreCase))
        {
            return (token.Id, null);
        }
        else
        {
            await _db.PasswordResetTokens.UpdateOneAsync(
                t => t.Id == token.Id,
                Builders<PasswordResetToken>.Update.Inc(t => t.Attempts, 1));
            return (null, "Invalid code.");
        }
    }

    public async Task<(bool success, string? error)> ResetPasswordAsync(Guid tokenId, string newPassword, CancellationToken ct = default)
    {
        var token = await _db.PasswordResetTokens.Find(t => t.Id == tokenId && !t.IsUsed && t.ExpiresAt > DateTimeOffset.UtcNow).FirstOrDefaultAsync();
        if (token == null)
            return (false, "Session expired. Please start over.");

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
            return (false, "Password must be at least 6 characters long.");

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(newPassword);

        // Update User
        var userUpdate = Builders<User>.Update
            .Set(u => u.PasswordHash, hashedPassword)
            .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

        await _db.Users.UpdateOneAsync(u => u.Id == token.UserId, userUpdate);

        // Invalidate token
        await _db.PasswordResetTokens.UpdateOneAsync(t => t.Id == token.Id, Builders<PasswordResetToken>.Update.Set(t => t.IsUsed, true));

        // Audit Log
        var audit = new AuditLog
        {
            UserId = token.UserId,
            Action = "PasswordReset",
            Entity = "User",
            EntityId = token.UserId.ToString(),
            Details = "User successfully reset their password via email verification"
        };
        await _db.AuditLogs.InsertOneAsync(audit);

        return (true, null);
    }

    public async Task<(bool success, string? error)> LinkSocialAccountAsync(Guid userId, string provider, string socialId, CancellationToken ct = default)
    {
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
        if (user == null) return (false, "User not found.");

        var update = Builders<User>.Update.Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);
        
        if (provider.ToLower() == "google")
        {
            // Ensure this social ID isn't already linked to another account
            var existing = await _db.Users.Find(u => u.GoogleId == socialId && u.Id != userId).AnyAsync(ct);
            if (existing) return (false, "This Google account is already linked to another user.");
            update = update.Set(u => u.GoogleId, socialId);
        }
        else if (provider.ToLower() == "facebook")
        {
            var existing = await _db.Users.Find(u => u.FacebookId == socialId && u.Id != userId).AnyAsync(ct);
            if (existing) return (false, "This Facebook account is already linked to another user.");
            update = update.Set(u => u.FacebookId, socialId);
        }
        else
        {
            return (false, "Invalid social provider.");
        }

        await _db.Users.UpdateOneAsync(u => u.Id == userId, update, cancellationToken: ct);
        return (true, null);
    }

    public async Task<(User? user, string? token, string? error)> LoginWithSocialAsync(string provider, string socialId, CancellationToken ct = default)
    {
        FilterDefinition<User> filter;
        if (provider.ToLower() == "google")
        {
            filter = Builders<User>.Filter.Eq(u => u.GoogleId, socialId);
        }
        else if (provider.ToLower() == "facebook")
        {
            filter = Builders<User>.Filter.Eq(u => u.FacebookId, socialId);
        }
        else
        {
            return (null, null, "Invalid social provider.");
        }

        var user = await _db.Users.Find(filter).FirstOrDefaultAsync(ct);
        if (user == null)
            return (null, null, "This social account is not linked to any SessionFlow user. Please sign in with your email first and link it from your profile.");

        if (!user.IsApproved)
            return (null, null, "Your account is pending approval.");

        var token = GenerateJwtToken(user);
        return (user, token, null);
    }

    private string GenerateResetCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous: I, J, L, O, 0, 1
        var randomBytes = new byte[6];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        var result = new char[6];
        for (int i = 0; i < 6; i++)
        {
            result[i] = chars[randomBytes[i] % chars.Length];
        }
        return new string(result);
    }
}
