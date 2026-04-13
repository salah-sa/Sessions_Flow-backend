using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class AuditService
{
    private readonly MongoService _db;

    public AuditService(MongoService db)
    {
        _db = db;
    }

    public async Task LogActionAsync(Guid? userId, string userName, string action, string entity, string entityId, string details = "")
    {
        var log = new AuditLog
        {
            UserId = userId,
            UserName = userName,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Details = details,
            Timestamp = DateTimeOffset.UtcNow
        };

        await _db.AuditLogs.InsertOneAsync(log);
    }

    public async Task<List<AuditLog>> GetRecentLogsAsync(int limit = 100)
    {
        return await _db.AuditLogs
            .Find(_ => true)
            .SortByDescending(al => al.Timestamp)
            .Limit(limit)
            .ToListAsync();
    }
}
