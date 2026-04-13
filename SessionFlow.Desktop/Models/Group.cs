using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum GroupStatus
{
    Active = 0,
    Completed = 1,
    Archived = 2
}

public class Group
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public string ColorTag { get; set; } = "blue";
    
    public GroupStatus Status { get; set; } = GroupStatus.Active;
    public DateTimeOffset? CompletedAt { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }
    
    public int NumberOfStudents { get; set; }
    public int Capacity { get; set; } = 25;
    public int CurrentSessionNumber { get; set; } = 1;
    public int StartingSessionNumber { get; set; } = 1;
    public int TotalSessions { get; set; } = 13;
    
    // 3C Import Metadata
    public string? Raw3cTitle { get; set; }           // Full "3c.Mid.Semi pri.Unity 2.11112025.7.30pm"
    public string? NormalizedGroupName { get; set; }  // Lowercase, trimmed, collapsed version
    public string? StandardizedName { get; set; }     // Canonical: "3C.MID.AR.UNITY.2"
    public string? CourseLabel { get; set; }           // e.g. "Mid.Semi pri.Unity 2" (derived)
    public string? SourceGroupId { get; set; }        // 3C platform numeric group ID
    public string? SourceUrl { get; set; }            // Full URL to group page on 3C
    public string? InstructorName { get; set; }       // Instructor from ticket page
    
    // Smart Parser Output Fields
    public string? ParsedLevel { get; set; }          // MID, SR, JR, PRI
    public string? ParsedTrack { get; set; }          // AR, ER, MED
    public string? ParsedCourse { get; set; }         // UNITY, PYTHON, etc.
    public int? ParsedGroupNumber { get; set; }       // 2, 3, 4
    public string? ParsedInstructor { get; set; }     // Salah, etc.
    public DateTime? ParsedDate { get; set; }         // First session date from raw title
    public string? ParsedTime { get; set; }           // Session time from raw title
    public string? ParsedCode { get; set; }           // External numeric code
    
    public int Frequency { get; set; } = 1; // 1x, 2x, or 3x per week
    
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties (Ignored for MongoDB persistence)
    [BsonIgnore]
    public User? Engineer { get; set; }
    
    [BsonIgnore]
    public ICollection<Student> Students { get; set; } = new List<Student>();
    
    [BsonIgnore]
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    
    public ICollection<GroupSchedule> Schedules { get; set; } = new List<GroupSchedule>();
    
    [BsonIgnore]
    public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
}
