using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class SchedulingService
{
    private readonly MongoService _db;

    public SchedulingService(MongoService db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns a list of free time slots (HH:mm strings) for a given engineer on a given date.
    /// Walks from the engineer's availability start to end in 15-min increments,
    /// excluding any slot that would overlap with an existing session.
    /// </summary>
    public async Task<List<string>> GetFreeSlotsAsync(Guid engineerId, DateTime date, int durationMinutes)
    {
        var dayOfWeek = (int)date.DayOfWeek;

        // 1. Get engineer's availability for this day
        var entry = await _db.TimetableEntries
            .Find(t => t.EngineerId == engineerId && t.DayOfWeek == dayOfWeek && t.IsAvailable)
            .FirstOrDefaultAsync();

        if (entry == null)
            return new List<string>();

        // Build list of all valid time segments for the day
        var validSegments = new List<TimeSegment>();
        
        if (entry.Segments != null && entry.Segments.Any())
        {
            validSegments.AddRange(entry.Segments);
        }
        else if (entry.StartTime.HasValue && entry.EndTime.HasValue)
        {
            // Fallback to legacy fields
            validSegments.Add(new TimeSegment 
            { 
                StartTime = entry.StartTime.Value, 
                EndTime = entry.EndTime.Value 
            });
        }
        
        if (!validSegments.Any())
            return new List<string>();

        // 2. Get all existing sessions for this engineer on this date
        var cairoTz = GetCairoTimeZone();
        var dayStart = new DateTimeOffset(date, cairoTz.GetUtcOffset(date)).ToUniversalTime();
        var dayEnd = dayStart.AddDays(1);

        var existingSessions = await _db.Sessions
            .Find(s => s.EngineerId == engineerId
                       && s.ScheduledAt >= dayStart
                       && s.ScheduledAt < dayEnd
                       && !s.IsDeleted
                       && s.Status != SessionStatus.Cancelled)
            .ToListAsync();

        // 3. Build list of occupied time ranges
        var occupiedRanges = new List<(TimeSpan start, TimeSpan end)>();
        foreach (var session in existingSessions)
        {
            var sessionCairo = TimeZoneInfo.ConvertTimeFromUtc(session.ScheduledAt.UtcDateTime, cairoTz);
            var sessionStart = sessionCairo.TimeOfDay;

            var groupSchedule = await _db.GroupSchedules
                .Find(gs => gs.GroupId == session.GroupId)
                .FirstOrDefaultAsync();
            var sessionDuration = groupSchedule?.DurationMinutes ?? 60;

            occupiedRanges.Add((sessionStart, sessionStart.Add(TimeSpan.FromMinutes(sessionDuration))));
        }

        // 4. Walk in 15-min steps and find free slots across all valid segments
        var step = TimeSpan.FromMinutes(15);
        var duration = TimeSpan.FromMinutes(durationMinutes);
        var freeSlots = new List<string>();

        foreach (var segment in validSegments)
        {
            var availStart = segment.StartTime;
            var availEnd = segment.EndTime;

            for (var candidate = availStart; candidate + duration <= availEnd; candidate += step)
            {
                var candidateEnd = candidate + duration;

                bool overlaps = false;
                foreach (var (occStart, occEnd) in occupiedRanges)
                {
                    if (candidate < occEnd && candidateEnd > occStart)
                    {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps)
                {
                    freeSlots.Add(candidate.ToString(@"hh\:mm"));
                }
            }
        }
        
        // Remove duplicates and sort just in case segments overlapped
        return freeSlots.Distinct().OrderBy(t => t).ToList();
    }

    private static TimeZoneInfo GetCairoTimeZone()
    {
        try
        {
            // Windows naming
            return TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            try
            {
                // IANA (Linux/macOS) naming
                return TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo");
            }
            catch (TimeZoneNotFoundException)
            {
                // Fallback to UTC+2 if both fail
                return TimeZoneInfo.CreateCustomTimeZone("Cairo", TimeSpan.FromHours(2), "Cairo", "Cairo");
            }
        }
    }
}
