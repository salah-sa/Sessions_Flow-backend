using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum SessionStatus
{
    Scheduled = 0,
    Active = 1,
    Ended = 2,
    Cancelled = 3
}

public class Session
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }
    
    public int SessionNumber { get; set; } = 1;
    public DateTimeOffset ScheduledAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public SessionStatus Status { get; set; } = SessionStatus.Scheduled;
    public string? Notes { get; set; }
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    
    // Skip/Cancel support — prevents session number advancement
    public bool IsSkipped { get; set; }
    public string? SkipReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Optimistic concurrency control — prevents race conditions on session start/end
    public int Version { get; set; } = 1;
    
    // Stamped Data (Mandatory for Production)
    public decimal StampedRevenue { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int TotalStudents { get; set; }
    public double AttendanceRate { get; set; }

    // Navigation
    [BsonIgnore]
    public Group? Group { get; set; }
    
    [BsonIgnore]
    public User? Engineer { get; set; }
    
    [BsonIgnore]
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}
