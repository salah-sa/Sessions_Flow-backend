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
                _webApp = await ApiHost.BuildAndConfigureAsync(e.Args);
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
                    
                    // Backfill UniqueStudentCode for existing students
                    var studentsWithoutCode = await db.Students
                        .Find(s => s.UniqueStudentCode == "" || s.UniqueStudentCode == null)
                        .ToListAsync();
                    
                    if (studentsWithoutCode.Count > 0)
                    {
                        logger.LogInformation("Backfilling {Count} student codes...", studentsWithoutCode.Count);
                        foreach (var student in studentsWithoutCode)
                        {
                            var code = Models.Student.GenerateCode(student.Name, student.GroupId);
                            var update = Builders<Models.Student>.Update.Set(s => s.UniqueStudentCode, code);
                            await db.Students.UpdateOneAsync(s => s.Id == student.Id, update);
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
