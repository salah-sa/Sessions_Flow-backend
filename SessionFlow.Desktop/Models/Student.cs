using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class Student
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Name { get; set; } = string.Empty;
    public string? StudentId { get; set; } // Identifier assigned by engineer
    
    /// <summary>
    /// App-generated deterministic unique code for this student.
    /// Derived from a hash of (Name + GroupId) to guarantee stability across imports.
    /// Format: STU-2026-A3F8B
    /// </summary>
    public string UniqueStudentCode { get; set; } = "";

    /// <summary>
    /// Generates a deterministic unique student code from name + groupId.
    /// Format: STU-YYYY-XXXXX
    /// </summary>
    public static string GenerateCode(string name, Guid groupId)
    {
        var input = $"{name.Trim().ToUpperInvariant()}:{groupId}";
        using var sha = System.Security.Cryptography.SHA256.Create();
        var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
        var hex = BitConverter.ToString(hash).Replace("-", "");
        var year = DateTime.UtcNow.Year;
        return $"STU-{year}-{hex[..5].ToUpperInvariant()}";
    }
    
    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid EngineerId { get; set; }

    
    [BsonRepresentation(BsonType.String)]
    public Guid? UserId { get; set; } // Links to User account (if student self-registered)
    
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation
    [BsonIgnore]
    public Group? Group { get; set; }
    
    [BsonIgnore]
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}
