using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services;

public class SessionMaintenanceService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<SessionMaintenanceService> _logger;

    public SessionMaintenanceService(IServiceProvider services, ILogger<SessionMaintenanceService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Session Maintenance Service is starting. Protocol: Weekly Automation.");
        int consecutiveFailures = 0;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _services.CreateScope())
                {
                    var sessionService = scope.ServiceProvider.GetRequiredService<SessionService>();
                    _logger.LogInformation("Executing tactical session maintenance sweep...");
                    await sessionService.MaintainAllGroupsSessionsAsync();
                    _logger.LogInformation("Maintenance sweep complete. Mission timeline extended.");
                }
                consecutiveFailures = 0; // Reset on success
            }
            catch (Exception ex)
            {
                consecutiveFailures++;
                // D14: Exponential backoff — 5min base, doubles each failure, max 1 hour
                var backoffMinutes = Math.Min(5 * Math.Pow(2, consecutiveFailures - 1), 60);
                _logger.LogError(ex, "Error during session maintenance (failure #{Count}). Retrying in {Minutes} minutes.",
                    consecutiveFailures, backoffMinutes);
                
                try { await Task.Delay(TimeSpan.FromMinutes(backoffMinutes), stoppingToken); }
                catch (TaskCanceledException) { break; }
                continue;
            }

            // Run once per day (24 hours)
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
