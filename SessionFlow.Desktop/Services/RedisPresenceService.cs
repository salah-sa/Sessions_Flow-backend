using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Redis-backed presence service with TTL-based auto-offline.
/// Falls back to in-memory PresenceService if Redis is unavailable.
///
/// Redis Keys:
///   presence:{userId}     → status (online/away) with 60s TTL
///   connections:{connId}  → userId (reverse lookup)
///   user:conns:{userId}   → Hash of connectionId → "1"
///   heartbeat:{userId}    → timestamp of last heartbeat
/// </summary>
public class RedisPresenceService : IPresenceService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly IDatabase? _db;
    private readonly ILogger<RedisPresenceService> _logger;
    private readonly PresenceService _fallback;
    private readonly string _prefix;
    private readonly bool _redisAvailable;

    private const int PRESENCE_TTL_SECONDS = 60;
    private const int HEARTBEAT_TTL_SECONDS = 90;

    // In-process connection map for fast reverse lookup (Redis also stores this, but latency matters)
    private readonly ConcurrentDictionary<string, string> _localConnectionMap = new();

    public RedisPresenceService(
        IConnectionMultiplexer? redis,
        ILogger<RedisPresenceService> logger,
        string instanceName = "SessionFlow:")
    {
        _logger = logger;
        _prefix = instanceName;
        _fallback = new PresenceService();

        try
        {
            _redis = redis;
            if (_redis != null && _redis.IsConnected)
            {
                _db = _redis.GetDatabase();
                _redisAvailable = true;
                _logger.LogInformation("RedisPresenceService connected");
            }
            else
            {
                _redisAvailable = false;
                _logger.LogWarning("Redis unavailable — PresenceService using in-memory fallback");
            }
        }
        catch (Exception ex)
        {
            _redisAvailable = false;
            _logger.LogWarning(ex, "Redis connection failed — PresenceService using in-memory fallback");
        }
    }

    public void UserConnected(string userId, string connectionId)
    {
        _localConnectionMap[connectionId] = userId;
        _fallback.UserConnected(userId, connectionId);

        if (_redisAvailable && _db != null)
        {
            try
            {
                var batch = _db.CreateBatch();
                // Set presence with TTL
                batch.StringSetAsync($"{_prefix}presence:{userId}", "online", TimeSpan.FromSeconds(PRESENCE_TTL_SECONDS));
                // Map connection → user
                batch.StringSetAsync($"{_prefix}connections:{connectionId}", userId, TimeSpan.FromHours(24));
                // Add to user's connection set
                batch.HashSetAsync($"{_prefix}user:conns:{userId}", connectionId, "1");
                // Record heartbeat
                batch.StringSetAsync($"{_prefix}heartbeat:{userId}", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(), TimeSpan.FromSeconds(HEARTBEAT_TTL_SECONDS));
                batch.Execute();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write presence to Redis for {UserId}", userId);
            }
        }
    }

    public async Task<bool> UserDisconnectedAsync(string connectionId)
    {
        var userId = GetUserIdForConnection(connectionId);
        _localConnectionMap.TryRemove(connectionId, out _);
        bool fallbackOffline = await _fallback.UserDisconnectedAsync(connectionId);

        if (_redisAvailable && _db != null && userId != null)
        {
            try
            {
                // Remove this connection
                await _db.KeyDeleteAsync($"{_prefix}connections:{connectionId}");
                await _db.HashDeleteAsync($"{_prefix}user:conns:{userId}", connectionId);

                // Check if user has other connections
                var remaining = await _db.HashLengthAsync($"{_prefix}user:conns:{userId}");
                if (remaining == 0)
                {
                    await _db.KeyDeleteAsync($"{_prefix}presence:{userId}");
                    await _db.KeyDeleteAsync($"{_prefix}user:conns:{userId}");
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to remove presence from Redis for connection {ConnId}", connectionId);
            }
        }
        return fallbackOffline;
    }

    public bool IsOnline(string userId)
    {
        if (_redisAvailable && _db != null)
        {
            try
            {
                return _db.KeyExists($"{_prefix}presence:{userId}");
            }
            catch
            {
                return _fallback.IsOnline(userId);
            }
        }
        return _fallback.IsOnline(userId);
    }

    public List<string> GetOnlineUserIds()
    {
        if (_redisAvailable && _redis != null && _db != null)
        {
            try
            {
                var server = _redis.GetServer(_redis.GetEndPoints().First());
                var keys = server.Keys(pattern: $"{_prefix}presence:*").ToList();
                return keys.Select(k => k.ToString().Replace($"{_prefix}presence:", "")).ToList();
            }
            catch
            {
                return _fallback.GetOnlineUserIds();
            }
        }
        return _fallback.GetOnlineUserIds();
    }

    public void RecordHeartbeat(string userId)
    {
        _fallback.RecordHeartbeat(userId);

        if (_redisAvailable && _db != null)
        {
            try
            {
                var batch = _db.CreateBatch();
                // Refresh presence TTL
                var currentStatus = _db.StringGet($"{_prefix}presence:{userId}");
                var status = currentStatus.HasValue ? currentStatus.ToString() : "online";
                batch.StringSetAsync($"{_prefix}presence:{userId}", status, TimeSpan.FromSeconds(PRESENCE_TTL_SECONDS));
                batch.StringSetAsync($"{_prefix}heartbeat:{userId}", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(), TimeSpan.FromSeconds(HEARTBEAT_TTL_SECONDS));
                batch.Execute();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record heartbeat in Redis for {UserId}", userId);
            }
        }
    }

    public List<object> GetPresenceSnapshot(IEnumerable<string> userIds)
    {
        var snapshot = new List<object>();
        foreach (var id in userIds)
        {
            snapshot.Add(new
            {
                userId = id,
                isOnline = IsOnline(id),
                status = GetStatus(id),
                lastSeen = GetLastSeen(id)
            });
        }
        return snapshot;
    }

    public string? GetUserIdForConnection(string connectionId)
    {
        // Fast local lookup first
        if (_localConnectionMap.TryGetValue(connectionId, out var userId))
            return userId;

        // Fall back to in-memory service
        return _fallback.GetUserIdForConnection(connectionId);
    }

    public async Task SetPresenceAsync(string userId, bool isOnline, string connectionId)
    {
        if (isOnline)
        {
            UserConnected(userId, connectionId);
        }
        else
        {
            await UserDisconnectedAsync(connectionId);
        }
    }

    public async Task SetAwayAsync(string userId)
    {
        await _fallback.SetAwayAsync(userId);

        if (_redisAvailable && _db != null)
        {
            try
            {
                await _db.StringSetAsync($"{_prefix}presence:{userId}", "away", TimeSpan.FromSeconds(PRESENCE_TTL_SECONDS));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to set away status in Redis for {UserId}", userId);
            }
        }
    }

    public string GetStatus(string userId)
    {
        if (_redisAvailable && _db != null)
        {
            try
            {
                var status = _db.StringGet($"{_prefix}presence:{userId}");
                if (status.HasValue) return status.ToString();
                return "offline";
            }
            catch
            {
                return _fallback.GetStatus(userId);
            }
        }
        return _fallback.GetStatus(userId);
    }

    private DateTimeOffset? GetLastSeen(string userId)
    {
        if (_redisAvailable && _db != null)
        {
            try
            {
                var ts = _db.StringGet($"{_prefix}heartbeat:{userId}");
                if (ts.HasValue && long.TryParse(ts, out var millis))
                    return DateTimeOffset.FromUnixTimeMilliseconds(millis);
            }
            catch { /* Fallback below */ }
        }
        return null;
    }

    public int GetConnectionCount(string userId)
    {
        if (_redisAvailable && _db != null)
        {
            try
            {
                return (int)_db.HashLength($"{_prefix}user:conns:{userId}");
            }
            catch
            {
                return _fallback.GetConnectionCount(userId);
            }
        }
        return _fallback.GetConnectionCount(userId);
    }
}
