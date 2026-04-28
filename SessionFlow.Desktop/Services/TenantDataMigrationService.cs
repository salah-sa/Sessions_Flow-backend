using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class TenantDataMigrationService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<TenantDataMigrationService> _logger;

    public TenantDataMigrationService(IServiceProvider services, ILogger<TenantDataMigrationService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TenantDataMigrationService started.");
        
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoService>();

        try
        {
            // Backfill EngineerId for Students based on their Group
            var studentsMissingTenant = await db.Students.Find(s => s.EngineerId == Guid.Empty).ToListAsync(stoppingToken);
            if (studentsMissingTenant.Count > 0)
            {
                _logger.LogInformation($"Backfilling {studentsMissingTenant.Count} Students with EngineerId...");
                foreach (var student in studentsMissingTenant)
                {
                    var group = await db.Groups.Find(g => g.Id == student.GroupId).FirstOrDefaultAsync(stoppingToken);
                    if (group != null)
                    {
                        var update = Builders<Student>.Update.Set(s => s.EngineerId, group.EngineerId);
                        await db.Students.UpdateOneAsync(s => s.Id == student.Id, update, cancellationToken: stoppingToken);
                    }
                }
            }

            // Backfill EngineerId for ChatMessages
            var chatsMissingTenant = await db.ChatMessages.Find(c => c.EngineerId == Guid.Empty).ToListAsync(stoppingToken);
            if (chatsMissingTenant.Count > 0)
            {
                _logger.LogInformation($"Backfilling {chatsMissingTenant.Count} ChatMessages with EngineerId...");
                foreach (var chat in chatsMissingTenant)
                {
                    var group = await db.Groups.Find(g => g.Id == chat.GroupId).FirstOrDefaultAsync(stoppingToken);
                    if (group != null)
                    {
                        var update = Builders<ChatMessage>.Update.Set(c => c.EngineerId, group.EngineerId);
                        await db.ChatMessages.UpdateOneAsync(c => c.Id == chat.Id, update, cancellationToken: stoppingToken);
                    }
                }
            }

            // Backfill EngineerId for AttendanceRecords
            var attendanceMissingTenant = await db.AttendanceRecords.Find(a => a.EngineerId == Guid.Empty).ToListAsync(stoppingToken);
            if (attendanceMissingTenant.Count > 0)
            {
                _logger.LogInformation($"Backfilling {attendanceMissingTenant.Count} AttendanceRecords with EngineerId...");
                foreach (var att in attendanceMissingTenant)
                {
                    var session = await db.Sessions.Find(s => s.Id == att.SessionId).FirstOrDefaultAsync(stoppingToken);
                    if (session != null)
                    {
                        var update = Builders<AttendanceRecord>.Update.Set(a => a.EngineerId, session.EngineerId);
                        await db.AttendanceRecords.UpdateOneAsync(a => a.Id == att.Id, update, cancellationToken: stoppingToken);
                    }
                }
            }
            
            _logger.LogInformation("TenantDataMigrationService finished successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during TenantDataMigrationService execution.");
        }
    }
}
