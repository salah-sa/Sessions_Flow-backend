using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class GroupSchedule
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }
    
    public int DayOfWeek { get; set; } // 0=Sunday, 1=Monday, ..., 6=Saturday
    public TimeSpan StartTime { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation
    [BsonIgnore]
    public Group? Group { get; set; }
}
