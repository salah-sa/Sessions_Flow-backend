using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

/// <summary>
/// Per-user, per-day usage counters. DateKey is in Cairo local date format "yyyy-MM-dd".
/// A unique compound index on (UserId, DateKey) ensures exactly one document per user per day.
/// Reset is implicit — a new day produces a new document.
/// </summary>
public class UsageCounter
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    /// <summary>Cairo-local date key: "2026-05-02"</summary>
    public string DateKey { get; set; } = string.Empty;

    public int MessagesCount { get; set; } = 0;
    public int ImagesCount { get; set; } = 0;
    public int VideosCount { get; set; } = 0;
    public int FilesCount { get; set; } = 0;
    public int AttendanceCount { get; set; } = 0;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
