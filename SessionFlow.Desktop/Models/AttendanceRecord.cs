using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum AttendanceStatus
{
    Absent = 0,
    Present = 1,
    Late = 2,
    Unmarked = 3
}

public class AttendanceRecord
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [BsonRepresentation(BsonType.String)]
    public Guid SessionId { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid StudentId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }

    
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
    public DateTimeOffset MarkedAt { get; set; } = DateTimeOffset.UtcNow;

    // Denormalized snapshot fields for history queries (set at mark-time)
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.String)]
    public Guid? GroupId { get; set; }

    [BsonIgnoreIfNull]
    public string? GroupName { get; set; }

    public int SessionNumber { get; set; } = 0;

    [BsonIgnoreIfNull]
    public DateTimeOffset? ScheduledAt { get; set; }  // Snapshot of session.ScheduledAt

    // Navigation
    [BsonIgnore]
    public Session? Session { get; set; }
    
    [BsonIgnore]
    public Student? Student { get; set; }
}
