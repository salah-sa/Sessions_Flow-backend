using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public class Setting
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
