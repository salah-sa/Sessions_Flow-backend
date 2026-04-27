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

        // Explicitly set the EngineerId to the recipient's ID if they are an Engineer/Admin
        // This ensures the notification is visible in their own tenant context.
        var user = await _db.GlobalUsers.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user != null)
        {
            notification.EngineerId = user.Role == UserRole.Admin || user.Role == UserRole.Engineer 
                ? user.Id 
                : user.EngineerId;
        }

        await _db.GlobalNotifications.InsertOneAsync(notification);
        
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
        return await _db.GlobalNotifications
            .Find(n => n.UserId == userId)
            .SortByDescending(n => n.CreatedAt)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task MarkAsReadAsync(Guid notificationId)
    {
        var notification = await _db.GlobalNotifications.Find(n => n.Id == notificationId).FirstOrDefaultAsync();
        if (notification == null) return;

        var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
        await _db.GlobalNotifications.UpdateOneAsync(n => n.Id == notificationId, update);
        
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
        await _db.GlobalNotifications.UpdateManyAsync(n => n.UserId == userId && !n.IsRead, update);
        
        // Notify client to update count via event bus
        await _eventBus.PublishAsync(Events.NotificationRead, EventTargetType.User, userId.ToString(), new
        {
            action = "readAll"
        });
    }

    public async Task<long> GetUnreadCountAsync(Guid userId)
    {
        return await _db.GlobalNotifications.CountDocumentsAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task NotifyAdminsAsync(string title, string message, NotificationType type = NotificationType.Warning)
    {
        var admins = await _db.GlobalUsers.Find(u => u.Role == UserRole.Admin).ToListAsync();
        foreach (var admin in admins)
        {
            await CreateNotificationAsync(admin.Id, title, message, type);
        }
    }
}
