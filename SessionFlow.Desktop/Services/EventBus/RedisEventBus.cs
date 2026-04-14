using System.Text.Json;
using StackExchange.Redis;
using Microsoft.Extensions.Logging;

namespace SessionFlow.Desktop.Services.EventBus;

/// <summary>
/// Redis Pub/Sub implementation of the event bus.
/// All events are published to a Redis channel and broadcast to subscribers.
/// This enables cross-server event propagation in multi-instance deployments.
/// 
/// FALLBACK: If Redis is unavailable, events are dispatched directly in-process.
/// </summary>
public class RedisEventBus : IEventBus, IDisposable
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ISubscriber? _subscriber;
    private readonly ILogger<RedisEventBus> _logger;
    private readonly string _channelPrefix;
    private readonly string _serverId;
    private readonly List<Action<EventEnvelope>> _handlers = new();
    private readonly object _lock = new();
    private bool _redisAvailable;

    private const string EVENT_CHANNEL = "sessionflow:events";

    public RedisEventBus(IConnectionMultiplexer? redis, ILogger<RedisEventBus> logger, string instanceName = "SessionFlow:")
    {
        _logger = logger;
        _channelPrefix = instanceName;
        _serverId = $"{Environment.MachineName}:{Environment.ProcessId}";

        try
        {
            _redis = redis;
            if (_redis != null && _redis.IsConnected)
            {
                _subscriber = _redis.GetSubscriber();
                _redisAvailable = true;

                // Subscribe to the event channel
                _subscriber.Subscribe(RedisChannel.Literal($"{_channelPrefix}{EVENT_CHANNEL}"), (_, message) =>
                {
                    try
                    {
                        var envelope = JsonSerializer.Deserialize<EventEnvelope>(message!);
                        if (envelope == null) return;

                        // Skip events from this server instance (already dispatched locally)
                        if (envelope.OriginServerId == _serverId) return;

                        lock (_lock)
                        {
                            foreach (var handler in _handlers)
                            {
                                try { handler(envelope); }
                                catch (Exception ex) { _logger.LogError(ex, "Event handler error for {Event}", envelope.EventName); }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to deserialize Redis event");
                    }
                });

                _logger.LogInformation("Redis EventBus connected. ServerId={ServerId}", _serverId);
            }
            else
            {
                _redisAvailable = false;
                _logger.LogWarning("Redis unavailable — EventBus running in local-only mode");
            }
        }
        catch (Exception ex)
        {
            _redisAvailable = false;
            _logger.LogWarning(ex, "Redis connection failed — EventBus running in local-only mode");
        }
    }

    public async Task PublishAsync(EventEnvelope envelope)
    {
        envelope.OriginServerId = _serverId;
        envelope.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // Always dispatch locally (same server)
        DispatchLocal(envelope);

        // Also publish to Redis for cross-server propagation
        if (_redisAvailable && _subscriber != null)
        {
            try
            {
                var json = JsonSerializer.Serialize(envelope);
                await _subscriber.PublishAsync(
                    RedisChannel.Literal($"{_channelPrefix}{EVENT_CHANNEL}"),
                    json
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish event {Event} to Redis — local dispatch only", envelope.EventName);
            }
        }
    }

    public Task PublishAsync(string eventName, EventTargetType targetType, string target, object payload)
    {
        var envelope = new EventEnvelope
        {
            EventName = eventName,
            TargetType = targetType,
            Target = target,
            Payload = JsonSerializer.Serialize(payload)
        };
        return PublishAsync(envelope);
    }

    public IDisposable Subscribe(Action<EventEnvelope> handler)
    {
        lock (_lock)
        {
            _handlers.Add(handler);
        }
        return new Subscription(() =>
        {
            lock (_lock)
            {
                _handlers.Remove(handler);
            }
        });
    }

    private void DispatchLocal(EventEnvelope envelope)
    {
        lock (_lock)
        {
            foreach (var handler in _handlers)
            {
                try { handler(envelope); }
                catch (Exception ex) { _logger.LogError(ex, "Local event handler error for {Event}", envelope.EventName); }
            }
        }
    }

    public void Dispose()
    {
        _subscriber?.UnsubscribeAll();
    }

    private class Subscription : IDisposable
    {
        private readonly Action _unsubscribe;
        public Subscription(Action unsubscribe) => _unsubscribe = unsubscribe;
        public void Dispose() => _unsubscribe();
    }
}
