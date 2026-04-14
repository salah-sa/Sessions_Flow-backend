using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services.EventBus;

namespace SessionFlow.Desktop.Services;

public class NotificationService
{
    private readonly MongoService _db;
    private readonly IEventBus _eventBus;
    
    public static Action<string, string>? ShowToastAction { get; set; }

    public NotificationService(MongoService db, IEventBus eventBus)
    {
        _db = db;
        _eventBus = eventBus;
    }

    public async Task<Notification> CreateNotificationAsync(Guid userId, string title, string message, NotificationType type = NotificationType.Info)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            IsRead = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _db.Notifications.InsertOneAsync(notification);
        
        // Publish through event bus (decoupled from SignalR)
        await _eventBus.PublishAsync(Events.NotificationCreated, EventTargetType.User, userId.ToString(), new
        {
            notificationId = notification.Id,
            title,
            message,
            type = type.ToString()
        });
        
        return notification;
    }

    public async Task<List<Notification>> GetUserNotificationsAsync(Guid userId, int limit = 20)
    {
        return await _db.Notifications
            .Find(n => n.UserId == userId)
            .SortByDescending(n => n.CreatedAt)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task MarkAsReadAsync(Guid notificationId)
    {
        var notification = await _db.Notifications.Find(n => n.Id == notificationId).FirstOrDefaultAsync();
        if (notification == null) return;

        var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
        await _db.Notifications.UpdateOneAsync(n => n.Id == notificationId, update);
        
        // Notify client to update count via event bus
        await _eventBus.PublishAsync(Events.NotificationRead, EventTargetType.User, notification.UserId.ToString(), new
        {
            notificationId,
            action = "read"
        });
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
        await _db.Notifications.UpdateManyAsync(n => n.UserId == userId && !n.IsRead, update);
        
        // Notify client to update count via event bus
        await _eventBus.PublishAsync(Events.NotificationRead, EventTargetType.User, userId.ToString(), new
        {
            action = "readAll"
        });
    }

    public async Task<long> GetUnreadCountAsync(Guid userId)
    {
        return await _db.Notifications.CountDocumentsAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task NotifyAdminsAsync(string title, string message, NotificationType type = NotificationType.Warning)
    {
        var admins = await _db.Users.Find(u => u.Role == UserRole.Admin).ToListAsync();
        foreach (var admin in admins)
        {
            await CreateNotificationAsync(admin.Id, title, message, type);
        }
    }
}
