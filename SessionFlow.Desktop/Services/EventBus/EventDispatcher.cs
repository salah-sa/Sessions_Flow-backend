using System.Threading.Channels;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SessionFlow.Desktop.Api.Hubs;

namespace SessionFlow.Desktop.Services.EventBus;

/// <summary>
/// Background service that subscribes to the EventBus and routes events to SignalR clients.
/// This is the DECOUPLING LAYER: any service can publish events, and this dispatcher
/// ensures they reach the correct WebSocket clients.
///
/// Routes based on EventTargetType:
///   Group → Clients.Group(target)
///   User  → Clients.User(target)
///   All   → Clients.All
/// </summary>
public class EventDispatcher : BackgroundService
{
    private readonly IEventBus _eventBus;
    private readonly IHubContext<SessionHub> _hubContext;
    private readonly ILogger<EventDispatcher> _logger;
    private IDisposable? _subscription;
    private readonly Channel<EventEnvelope> _queue = Channel.CreateUnbounded<EventEnvelope>();
    private readonly SemaphoreSlim _concurrencyLimiter = new SemaphoreSlim(100); // Max 100 concurrent dispatches

    public EventDispatcher(
        IEventBus eventBus,
        IHubContext<SessionHub> hubContext,
        ILogger<EventDispatcher> logger)
    {
        _eventBus = eventBus;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _subscription = _eventBus.Subscribe((envelope) =>
        {
            // Non-blocking enqueue — safe for synchronous Action<T> signature
            _queue.Writer.TryWrite(envelope);
        });

        _logger.LogInformation("EventDispatcher started — routing events from EventBus to SignalR");

        // Process events concurrently preventing a single-lane queue bottleneck
        await foreach (var envelope in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            await _concurrencyLimiter.WaitAsync(stoppingToken);

            _ = Task.Run(async () =>
            {
                try
                {
                    await DispatchToSignalR(envelope);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to dispatch event {Event} to SignalR", envelope.EventName);
                }
                finally
                {
                    _concurrencyLimiter.Release();
                }
            }, stoppingToken);
        }
    }

    private async Task DispatchToSignalR(EventEnvelope envelope)
    {
        // Deserialize payload so SignalR serializes it as an object graph to clients rather than a raw JSON string.
        object? payload = null;
        if (!string.IsNullOrEmpty(envelope.Payload))
        {
            try
            {
                payload = JsonSerializer.Deserialize<JsonElement>(envelope.Payload);
            }
            catch
            {
                payload = envelope.Payload; // Fallback to raw string if not JSON
            }
        }

        switch (envelope.TargetType)
        {
            case EventTargetType.Group:
                await _hubContext.Clients.Group(envelope.Target)
                    .SendAsync(envelope.EventName, payload);
                break;

            case EventTargetType.User:
                await _hubContext.Clients.User(envelope.Target)
                    .SendAsync(envelope.EventName, payload);
                break;

            case EventTargetType.All:
                await _hubContext.Clients.All
                    .SendAsync(envelope.EventName, payload);
                break;

            case EventTargetType.Caller:
                // For Caller target, envelope.Target must contain the connectionId
                if (!string.IsNullOrEmpty(envelope.Target))
                {
                    await _hubContext.Clients.Client(envelope.Target)
                        .SendAsync(envelope.EventName, payload);
                }
                break;
            
            case EventTargetType.Role:
                if (!string.IsNullOrEmpty(envelope.Target))
                {
                    await _hubContext.Clients.Group($"role_{envelope.Target}")
                        .SendAsync(envelope.EventName, payload);
                }
                break;

            default:
                _logger.LogWarning("Unknown target type {TargetType} for event {Event}",
                    envelope.TargetType, envelope.EventName);
                break;
        }
    }

    public override void Dispose()
    {
        _subscription?.Dispose();
        base.Dispose();
    }
}
