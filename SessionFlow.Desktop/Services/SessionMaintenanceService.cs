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

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _services.CreateScope())
                {
                    var tenantAccessor = scope.ServiceProvider.GetRequiredService<ITenantAccessor>();
                    tenantAccessor.SetSystemContext();

                    var sessionService = scope.ServiceProvider.GetRequiredService<SessionService>();
                    _logger.LogInformation("Executing tactical session maintenance sweep...");
                    await sessionService.MaintainAllGroupsSessionsAsync();
                    _logger.LogInformation("Maintenance sweep complete. Mission timeline extended.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during session maintenance sweep.");
            }

            // Run once per day (24 hours)
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
