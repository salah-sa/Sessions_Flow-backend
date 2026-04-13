using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class EngineerCode
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Code { get; set; } = string.Empty;
    public bool IsUsed { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid? UsedByEngineerId { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation
    [BsonIgnore]
    public User? UsedByEngineer { get; set; }
}
