using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using SessionFlow.Desktop.Helpers;

namespace SessionFlow.Desktop.Services;

public class WalletBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WalletBackgroundService> _logger;
    private readonly IConfiguration _config;

    public WalletBackgroundService(IServiceProvider serviceProvider, ILogger<WalletBackgroundService> logger, IConfiguration config)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("WalletBackgroundService is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var cairoTz = TimeZoneHelper.GetConfiguredTimeZone(_config);
                var cairoNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, cairoTz);
                
                // Calculate time until next midnight in Cairo
                var nextMidnight = cairoNow.Date.AddDays(1);
                var delay = nextMidnight - cairoNow;

                _logger.LogInformation("Wallet limits will reset in {DelayHours} hours and {DelayMinutes} minutes.", delay.Hours, delay.Minutes);

                // Wait until midnight
                await Task.Delay(delay, stoppingToken);

                // Perform the reset via WalletService
                using var scope = _serviceProvider.CreateScope();
                var walletService = scope.ServiceProvider.GetRequiredService<WalletService>();
                await walletService.ResetDailyLimitsAsync(stoppingToken);

                _logger.LogInformation("Daily wallet limit reset completed at {Time} UTC.", DateTimeOffset.UtcNow);
            }
            catch (TaskCanceledException)
            {
                // Expected on shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred in WalletBackgroundService. Retrying in 1 hour.");
                // Delay to prevent tight error loop
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        _logger.LogInformation("WalletBackgroundService is stopping.");
    }
}

