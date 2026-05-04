using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Manages per-user, per-day usage counters for rate-limited resources.
/// Counters use Cairo local date keys and are auto-deleted after 30 days by TTL index.
/// </summary>
public class UsageService
{
    private readonly MongoService _db;
    private readonly Services.EventBus.IEventBus _eventBus;

    private static readonly TimeZoneInfo CairoTz = TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");

    public UsageService(MongoService db, Services.EventBus.IEventBus eventBus)
    {
        _db = db;
        _eventBus = eventBus;
    }

    private static string GetCairoDateKey()
    {
        var cairoNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, CairoTz);
        return cairoNow.ToString("yyyy-MM-dd");
    }

    // ─────────────────────────────────────────────────────────────────────
    // Retrieval
    // ─────────────────────────────────────────────────────────────────────

    /// <summary>Returns today's counter for a user (returns a zeroed counter if no activity yet).</summary>
    public async Task<UsageCounter> GetTodayAsync(Guid userId, CancellationToken ct = default)
    {
        var dateKey = GetCairoDateKey();
        return await _db.UsageCounters
            .Find(c => c.UserId == userId && c.DateKey == dateKey)
            .FirstOrDefaultAsync(ct)
            ?? new UsageCounter { UserId = userId, DateKey = dateKey };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Atomic increments — upsert pattern
    // ─────────────────────────────────────────────────────────────────────

    public Task IncrementMessagesAsync(Guid userId, CancellationToken ct = default)
        => IncrementFieldAsync(userId, nameof(UsageCounter.MessagesCount), ct);

    public Task IncrementImagesAsync(Guid userId, CancellationToken ct = default)
        => IncrementFieldAsync(userId, nameof(UsageCounter.ImagesCount), ct);

    public Task IncrementVideosAsync(Guid userId, CancellationToken ct = default)
        => IncrementFieldAsync(userId, nameof(UsageCounter.VideosCount), ct);

    public Task IncrementFilesAsync(Guid userId, CancellationToken ct = default)
        => IncrementFieldAsync(userId, nameof(UsageCounter.FilesCount), ct);

    public Task IncrementAttendanceAsync(Guid userId, CancellationToken ct = default)
        => IncrementFieldAsync(userId, nameof(UsageCounter.AttendanceCount), ct);

    // ─────────────────────────────────────────────────────────────────────
    // Usage summary DTO — returned by /api/usage/today
    // ─────────────────────────────────────────────────────────────────────

    public record ResourceUsage(int Used, int Limit, int Remaining);
    public record UsageSummary(
        ResourceUsage Messages,
        ResourceUsage Images,
        ResourceUsage Videos,
        ResourceUsage Files,
        ResourceUsage Attendance,
        ResourceUsage Groups);

    public async Task<UsageSummary> GetSummaryAsync(
        Guid userId,
        SubscriptionTier tier,
        int currentGroupCount,
        string? role = null,
        CancellationToken ct = default)
    {
        var counter = await GetTodayAsync(userId, ct);

        ResourceUsage Calc(int used, int limit)
        {
            var safeLimit = limit == int.MaxValue ? int.MaxValue : limit;
            var remaining = safeLimit == int.MaxValue ? int.MaxValue : Math.Max(0, safeLimit - used);
            return new ResourceUsage(used, safeLimit, remaining);
        }

        return new UsageSummary(
            Messages: Calc(counter.MessagesCount, PlanLimit.GetMaxDailyMessages(tier, role)),
            Images: Calc(counter.ImagesCount, PlanLimit.GetMaxDailyImages(tier, role)),
            Videos: Calc(counter.VideosCount, PlanLimit.GetMaxDailyVideos(tier, role)),
            Files: Calc(counter.FilesCount, PlanLimit.GetMaxDailyFiles(tier, role)),
            Attendance: Calc(counter.AttendanceCount, PlanLimit.GetMaxDailyAttendance(tier, role)),
            Groups: Calc(currentGroupCount, PlanLimit.GetMaxGroups(tier, role))
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal: Atomic field increment with upsert
    // ─────────────────────────────────────────────────────────────────────

    private async Task IncrementFieldAsync(Guid userId, string fieldName, CancellationToken ct)
    {
        var dateKey = GetCairoDateKey();
        var filter = Builders<UsageCounter>.Filter.And(
            Builders<UsageCounter>.Filter.Eq(c => c.UserId, userId),
            Builders<UsageCounter>.Filter.Eq(c => c.DateKey, dateKey)
        );

        var fieldMap = new Dictionary<string, string>
        {
            [nameof(UsageCounter.MessagesCount)]  = "MessagesCount",
            [nameof(UsageCounter.ImagesCount)]    = "ImagesCount",
            [nameof(UsageCounter.VideosCount)]    = "VideosCount",
            [nameof(UsageCounter.FilesCount)]     = "FilesCount",
            [nameof(UsageCounter.AttendanceCount)]= "AttendanceCount",
        };

        if (!fieldMap.TryGetValue(fieldName, out var mongoField)) return;

        var update = Builders<UsageCounter>.Update
            .Inc(mongoField, 1)
            .Set(c => c.UpdatedAt, DateTimeOffset.UtcNow)
            .SetOnInsert(c => c.Id, Guid.NewGuid())
            .SetOnInsert(c => c.UserId, userId)
            .SetOnInsert(c => c.DateKey, dateKey);

        await _db.UsageCounters.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);

        // Emit real-time usage update (fire-and-forget to avoid blocking the request)
        _ = _eventBus.PublishAsync(
            Services.EventBus.Events.UsageUpdated,
            Services.EventBus.EventTargetType.User,
            userId.ToString(),
            new { userId = userId.ToString(), field = mongoField });
    }
}
