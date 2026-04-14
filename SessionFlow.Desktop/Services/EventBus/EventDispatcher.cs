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

    public EventDispatcher(
        IEventBus eventBus,
        IHubContext<SessionHub> hubContext,
        ILogger<EventDispatcher> logger)
    {
        _eventBus = eventBus;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _subscription = _eventBus.Subscribe(async (envelope) =>
        {
            try
            {
                await DispatchToSignalR(envelope);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch event {Event} to SignalR", envelope.EventName);
            }
        });

        _logger.LogInformation("EventDispatcher started — routing events from EventBus to SignalR");

        // Keep running until cancelled
        return Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task DispatchToSignalR(EventEnvelope envelope)
    {
        // Deserialize payload to pass through as object
        object? payload = null;
        if (!string.IsNullOrEmpty(envelope.Payload))
        {
            try
            {
                payload = JsonSerializer.Deserialize<JsonElement>(envelope.Payload);
            }
            catch
            {
                payload = envelope.Payload; // Pass as raw string if deserialization fails
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
