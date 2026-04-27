using System.IO;
using System.Threading;
using System.Windows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Api;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop;

public partial class App : Application
{
    private Microsoft.AspNetCore.Builder.WebApplication? _webApp;
    private CancellationTokenSource? _cts;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        bool isHeadless = e.Args.Contains("--headless");

        if (!isHeadless)
        {
            try {
                var mainWindow = new MainWindow();
                mainWindow.Show();
            } catch (Exception ex) {
                // In headless we don't care about UI crashes, but here we do
                MessageBox.Show($"FATAL WPF CRASH: {ex.Message}\n\n{ex.StackTrace}");
                Environment.Exit(1);
            }
        }

        // 2. Start initialisation in the background
        Task.Run(async () => {
            try
            {
                // 1. Build and start the in-process ASP.NET Core WebApplication
                _webApp = ApiHost.BuildAndConfigure(e.Args);
                _cts = new CancellationTokenSource();

                // Start Kestrel
                await _webApp.StartAsync(_cts.Token);

                // 2. Initialize Database and Seeding
                using (var scope = _webApp.Services.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<MongoService>();
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<App>>();
                    
                    logger.LogInformation("Initializing database indexes...");
                    await db.InitializeAsync();
                    
                    logger.LogInformation("Seeding default settings and accounts...");
                    var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
                    await auth.SeedAdminAsync();
                    await auth.SeedEngineerCodesAsync();
                    
                    logger.LogInformation("Checking for legacy engineers needing codes...");
                    await auth.EnsureEngineerCodesAsync();

                    await SeedDefaultSettingsAsync(db);
                    
                    // --- DATA HARDENING MIGRATION START ---
                    // Migration uses Global accessors directly — no context manipulation required
                    var groupsCache = new Dictionary<Guid, Guid>();
                    var usersCache = new Dictionary<Guid, Guid>();

                    // Helper to get EngineerId for a Group
                    async Task<Guid> GetGroupEngineerId(Guid groupId)
                    {
                        if (groupsCache.TryGetValue(groupId, out var engId)) return engId;
                        var group = await db.Database.GetCollection<Group>("Groups").Find(g => g.Id == groupId).FirstOrDefaultAsync();
                        if (group != null)
                        {
                            groupsCache[groupId] = group.EngineerId;
                            return group.EngineerId;
                        }
                        return Guid.Empty;
                    }

                    // Helper to get EngineerId for a User
                    async Task<Guid> GetUserEngineerId(Guid userId)
                    {
                        if (usersCache.TryGetValue(userId, out var engId)) return engId;
                        var user = await db.GlobalUsers.Find(u => u.Id == userId).FirstOrDefaultAsync();
                        if (user != null)
                        {
                            // If user is Engineer/Admin, their tenant ID is their own ID
                            // If Student, it's their EngineerId property
                            var resolvedId = (user.Role == UserRole.Student) ? (user.EngineerId ?? Guid.Empty) : user.Id;
                            usersCache[userId] = resolvedId;
                            return resolvedId;
                        }
                        return Guid.Empty;
                    }

                    logger.LogInformation("Hardening Data: Backfilling EngineerId across all collections...");

                    var adminUser = await db.GlobalUsers.Find(u => u.Role == UserRole.Admin).FirstOrDefaultAsync();
                    var primaryAdminId = adminUser?.Id ?? Guid.Empty;

                    // 0. Users (Self-backfill for Engineers/Admins)
                    var usersToFixCount = await db.GlobalUsers.CountDocumentsAsync(u => u.EngineerId == Guid.Empty);
                    if (usersToFixCount > 0)
                    {
                        logger.LogInformation("Backfilling {Count} users...", usersToFixCount);
                        var allUsers = await db.GlobalUsers.Find(u => u.EngineerId == Guid.Empty).ToListAsync();
                        foreach (var u in allUsers)
                        {
                            if (u.Role == UserRole.Admin || u.Role == UserRole.Engineer)
                            {
                                await db.GlobalUsers.UpdateOneAsync(x => x.Id == u.Id, Builders<User>.Update.Set(x => x.EngineerId, u.Id));
                            }
                            // Students will be linked via EngineerCode if possible
                            else if (u.Role == UserRole.Student && !string.IsNullOrEmpty(u.EngineerCode))
                            {
                                var eng = await db.GlobalUsers.Find(x => x.EngineerCode == u.EngineerCode).FirstOrDefaultAsync();
                                if (eng != null)
                                {
                                    await db.GlobalUsers.UpdateOneAsync(x => x.Id == u.Id, Builders<User>.Update.Set(x => x.EngineerId, eng.Id));
                                }
                            }
                        }
                    }

                    // 0. Groups (Assign orphans to Admin)
                    var groupsToFix = await db.Database.GetCollection<Group>("Groups").Find(g => g.EngineerId == Guid.Empty).ToListAsync();
                    if (groupsToFix.Any() && primaryAdminId != Guid.Empty)
                    {
                        logger.LogInformation("Backfilling {Count} orphaned groups to Admin {AdminId}", groupsToFix.Count, primaryAdminId);
                        await db.Database.GetCollection<Group>("Groups").UpdateManyAsync(
                            g => g.EngineerId == Guid.Empty,
                            Builders<Group>.Update.Set(g => g.EngineerId, primaryAdminId)
                        );
                    }

                    // 1. Students
                    var studentsToFix = await db.GlobalStudents.Find(s => s.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var s in studentsToFix)
                    {
                        var engId = await GetGroupEngineerId(s.GroupId);
                        if (engId != Guid.Empty) await db.GlobalStudents.UpdateOneAsync(x => x.Id == s.Id, Builders<Student>.Update.Set(x => x.EngineerId, engId));
                    }

                    // 2. GroupSchedules
                    var schedulesToFix = await db.GlobalGroupSchedules.Find(s => s.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var s in schedulesToFix)
                    {
                        var engId = await GetGroupEngineerId(s.GroupId);
                        if (engId != Guid.Empty) await db.GlobalGroupSchedules.UpdateOneAsync(x => x.Id == s.Id, Builders<GroupSchedule>.Update.Set(x => x.EngineerId, engId));
                    }

                    // 3. Sessions
                    var sessionsToFix = await db.GlobalSessions.Find(s => s.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var s in sessionsToFix)
                    {
                        var engId = await GetGroupEngineerId(s.GroupId);
                        if (engId != Guid.Empty) await db.GlobalSessions.UpdateOneAsync(x => x.Id == s.Id, Builders<Session>.Update.Set(x => x.EngineerId, engId));
                    }

                    // 4. AttendanceRecords
                    var attToFix = await db.GlobalAttendanceRecords.Find(a => a.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var a in attToFix)
                    {
                        // Try get via Session first
                        var session = await db.GlobalSessions.Find(s => s.Id == a.SessionId).FirstOrDefaultAsync();
                        var engId = session?.EngineerId ?? await GetGroupEngineerId(Guid.Empty); // Fallback logic if session missing but we know the student's group (not feasible here without student lookup)
                        if (engId == Guid.Empty)
                        {
                            var student = await db.GlobalStudents.Find(s => s.Id == a.StudentId).FirstOrDefaultAsync();
                            if (student != null) engId = student.EngineerId;
                        }
                        if (engId != Guid.Empty) await db.GlobalAttendanceRecords.UpdateOneAsync(x => x.Id == a.Id, Builders<AttendanceRecord>.Update.Set(x => x.EngineerId, engId));
                    }

                    // 5. ChatMessages
                    var chatsToFix = await db.GlobalChatMessages.Find(c => c.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var c in chatsToFix)
                    {
                        var engId = await GetGroupEngineerId(c.GroupId);
                        if (engId != Guid.Empty) await db.GlobalChatMessages.UpdateOneAsync(x => x.Id == c.Id, Builders<ChatMessage>.Update.Set(x => x.EngineerId, engId));
                    }

                    // 6. Notifications
                    var notifsToFix = await db.GlobalNotifications.Find(n => n.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var n in notifsToFix)
                    {
                        var engId = await GetUserEngineerId(n.UserId);
                        if (engId != Guid.Empty) await db.GlobalNotifications.UpdateOneAsync(x => x.Id == n.Id, Builders<Notification>.Update.Set(x => x.EngineerId, engId));
                    }

                    // 7. AuditLogs
                    var auditsToFix = await db.GlobalAuditLogs.Find(a => a.EngineerId == Guid.Empty).ToListAsync();
                    foreach (var a in auditsToFix)
                    {
                        if (a.UserId.HasValue)
                        {
                            var engId = await GetUserEngineerId(a.UserId.Value);
                            if (engId != Guid.Empty) await db.GlobalAuditLogs.UpdateOneAsync(x => x.Id == a.Id, Builders<AuditLog>.Update.Set(x => x.EngineerId, engId));
                        }
                    }

                    logger.LogInformation("Data Hardening Migration Complete.");
                    // --- DATA HARDENING MIGRATION END ---
                    
                    // Backfill UniqueStudentCode for existing students
                    var studentsWithoutCode = await db.GlobalStudents
                        .Find(s => s.UniqueStudentCode == "" || s.UniqueStudentCode == null)
                        .ToListAsync();
                    
                    if (studentsWithoutCode.Count > 0)
                    {
                        logger.LogInformation("Backfilling {Count} student codes...", studentsWithoutCode.Count);
                        foreach (var student in studentsWithoutCode)
                        {
                            var code = Models.Student.GenerateCode(student.Name, student.GroupId);
                            var update = Builders<Models.Student>.Update.Set(s => s.UniqueStudentCode, code);
                            await db.GlobalStudents.UpdateOneAsync(s => s.Id == student.Id, update);
                        }
                        logger.LogInformation("Student code backfill complete.");
                    }
                    
                    logger.LogInformation("Startup sequence completed successfully.");
                }
            }
            catch (Exception ex)
            {
                string friendlyMessage = ex.Message;
                if (ex.Message.Contains("already in use") || ex.InnerException?.Message.Contains("already in use") == true)
                {
                    friendlyMessage = "Port 5180 is already in use by another instance. \n\nPlease use 'build.bat' to kill existing processes before running, or check Task Manager for SessionFlow.Desktop.exe.";
                }

                Dispatcher.Invoke(() => {
                   MessageBox.Show(
                    $"Failed to start SessionFlow Background Services:\n\n{friendlyMessage}\n\nTechnical details:\n{ex.Message}\n\nStack trace: {ex.StackTrace}",
                    "SessionFlow - Startup Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                });
            }
        });
    }

    private static async Task SeedDefaultSettingsAsync(MongoService db)
    {
        var defaults = new Dictionary<string, string>
        {
            ["smtp_host"] = "",
            ["smtp_port"] = "587",
            ["smtp_user"] = "",
            ["smtp_password"] = "",
            ["smtp_enabled"] = "false",
            ["smtp_from"] = "",
            ["email_log"] = "[]",
            ["app_name"] = "SessionFlow",
            ["app_logo_text"] = "SF"
        };

        foreach (var (key, value) in defaults)
        {
            var exists = await db.Settings.Find(s => s.Key == key).AnyAsync();
            if (!exists)
            {
                await db.Settings.InsertOneAsync(new Models.Setting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
        }
    }

    public async void StopAndExit()
    {
        try
        {
            if (_webApp != null && _cts != null)
            {
                _cts.Cancel();
                await _webApp.StopAsync();
                await _webApp.DisposeAsync();
            }
        }
        catch { /* Ignore shutdown errors */ }
        finally
        {
            Shutdown(0);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        try
        {
            _cts?.Cancel();
            if (_webApp != null)
            {
                _webApp.StopAsync().GetAwaiter().GetResult();
                _webApp.DisposeAsync().GetAwaiter().GetResult();
            }
        }
        catch { /* Ignore shutdown errors */ }

        base.OnExit(e);
    }
}
