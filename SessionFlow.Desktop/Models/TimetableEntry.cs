using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class TimeSegment
{
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
}

public class TimetableEntry
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }
    
    public int DayOfWeek { get; set; } // 0=Sunday ... 6=Saturday
    public bool IsAvailable { get; set; } = true;
    public List<TimeSegment> Segments { get; set; } = new();
    
    // Legacy fields for backward compatibility, avoiding breaking changes
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation
    [BsonIgnore]
    public User? Engineer { get; set; }
}
