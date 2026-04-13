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
    
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
    public DateTimeOffset MarkedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation
    [BsonIgnore]
    public Session? Session { get; set; }
    
    [BsonIgnore]
    public Student? Student { get; set; }
}
