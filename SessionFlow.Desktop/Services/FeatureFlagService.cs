using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services.EventBus;
using StackExchange.Redis;
using System.Text.Json;

namespace SessionFlow.Desktop.Services;

public class FeatureFlagService
{
    private readonly MongoService _db;
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<FeatureFlagService> _logger;
    private readonly IEventBus _eventBus;
    private const string CachePrefix = "ff:";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    public FeatureFlagService(MongoService db, IConnectionMultiplexer? redis, ILogger<FeatureFlagService> logger, IEventBus eventBus)
    {
        _db = db;
        _redis = redis;
        _logger = logger;
        _eventBus = eventBus;
    }

    /// <summary>Check if a feature flag is enabled for a given user (with Redis cache).</summary>
    public async Task<bool> IsEnabledAsync(string key, Guid userId, string userRole, string userTier)
    {
        var flag = await GetFlagAsync(key);
        if (flag == null) return false;
        if (!flag.Enabled) return false;

        // Override for specific users
        if (flag.OverrideUserIds.Contains(userId.ToString())) return true;

        // Admin always gets all features
        if (userRole == "Admin") return true;

        // Tier check
        if (flag.AllowedTiers.Count == 0) return true; // No restriction
        return flag.AllowedTiers.Contains(userTier);
    }

    public async Task<List<FeatureFlag>> GetAllFlagsAsync()
    {
        return await _db.FeatureFlags.Find(_ => true)
            .SortBy(f => f.Name)
            .ToListAsync();
    }

    public async Task<FeatureFlag?> GetFlagAsync(string key)
    {
        // Try Redis cache first
        var cacheDb = _redis?.GetDatabase();
        if (cacheDb != null)
        {
            var cached = await cacheDb.StringGetAsync($"{CachePrefix}{key}");
            if (!cached.IsNullOrEmpty)
            {
                try { return JsonSerializer.Deserialize<FeatureFlag>(cached!); }
                catch { /* cache miss — fall through */ }
            }
        }

        var flag = await _db.FeatureFlags.Find(f => f.Key == key).FirstOrDefaultAsync();

        // Populate cache
        if (flag != null && cacheDb != null)
        {
            await cacheDb.StringSetAsync($"{CachePrefix}{key}",
                JsonSerializer.Serialize(flag), CacheTtl);
        }

        return flag;
    }

    public async Task<FeatureFlag> CreateFlagAsync(CreateFlagRequest req, string updatedBy)
    {
        var flag = new FeatureFlag
        {
            Key = req.Key.ToLowerInvariant().Trim(),
            Name = req.Name,
            Description = req.Description,
            Enabled = req.Enabled,
            AllowedTiers = req.AllowedTiers,
            UpdatedBy = updatedBy
        };
        await _db.FeatureFlags.InsertOneAsync(flag);
        await InvalidateCacheAsync(flag.Key);
        _ = _eventBus.PublishAsync(Events.FlagUpdated, EventTargetType.All, "", new { key = flag.Key, enabled = flag.Enabled, action = "created" });
        return flag;
    }

    public async Task<bool> UpdateFlagAsync(string key, UpdateFlagRequest req, string updatedBy)
    {
        var update = Builders<FeatureFlag>.Update
            .Set(f => f.Enabled, req.Enabled)
            .Set(f => f.AllowedTiers, req.AllowedTiers)
            .Set(f => f.OverrideUserIds, req.OverrideUserIds)
            .Set(f => f.UpdatedAt, DateTimeOffset.UtcNow)
            .Set(f => f.UpdatedBy, updatedBy);

        if (!string.IsNullOrEmpty(req.Description))
            update = update.Set(f => f.Description, req.Description);

        var result = await _db.FeatureFlags.UpdateOneAsync(f => f.Key == key, update);
        await InvalidateCacheAsync(key);
        if (result.ModifiedCount > 0)
            _ = _eventBus.PublishAsync(Events.FlagUpdated, EventTargetType.All, "", new { key, enabled = req.Enabled, action = "updated" });
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteFlagAsync(string key)
    {
        var result = await _db.FeatureFlags.DeleteOneAsync(f => f.Key == key);
        await InvalidateCacheAsync(key);
        if (result.DeletedCount > 0)
            _ = _eventBus.PublishAsync(Events.FlagUpdated, EventTargetType.All, "", new { key, enabled = false, action = "deleted" });
        return result.DeletedCount > 0;
    }

    /// <summary>Get all flags visible to a specific user (for frontend feature gating).</summary>
    public async Task<Dictionary<string, bool>> GetFlagsForUserAsync(Guid userId, string role, string tier)
    {
        var flags = await GetAllFlagsAsync();
        var result = new Dictionary<string, bool>();
        foreach (var f in flags)
        {
            result[f.Key] = await IsEnabledAsync(f.Key, userId, role, tier);
        }
        return result;
    }

    public async Task SeedDefaultFlagsAsync()
    {
        var defaults = new[]
        {
            new CreateFlagRequest("ai.center", "AI Control Center", "Access to the AI Center page and chat", true, ["Pro","Ultra","Enterprise"]),
            new CreateFlagRequest("ai.presets", "AI Prompt Presets", "Save and load AI prompt presets", true, ["Pro","Ultra","Enterprise"]),
            new CreateFlagRequest("analytics.dashboard", "Analytics Dashboard", "Full analytics page with charts", true, ["Ultra","Enterprise"]),
            new CreateFlagRequest("broadcast.schedule", "Broadcast Scheduling", "Schedule future broadcasts", true, ["Enterprise"]),
            new CreateFlagRequest("data.export.csv", "CSV Data Export", "Export user/attendance data to CSV", true, ["Pro","Ultra","Enterprise"]),
            new CreateFlagRequest("session.timeline", "Session Timeline", "View detailed user action timeline", true, ["Ultra","Enterprise"]),
        };

        var existingKeys = await _db.FeatureFlags
            .Find(_ => true).Project(f => f.Key).ToListAsync();
        var existingSet = existingKeys.ToHashSet();

        foreach (var d in defaults.Where(d => !existingSet.Contains(d.Key)))
        {
            await CreateFlagAsync(d, "system");
        }
    }

    private async Task InvalidateCacheAsync(string key)
    {
        var cacheDb = _redis?.GetDatabase();
        if (cacheDb != null)
            await cacheDb.KeyDeleteAsync($"{CachePrefix}{key}");
    }
}

public record CreateFlagRequest(
    string Key,
    string Name,
    string Description,
    bool Enabled,
    List<string> AllowedTiers);

public record UpdateFlagRequest(
    bool Enabled,
    List<string> AllowedTiers,
    List<string> OverrideUserIds,
    string? Description = null);
