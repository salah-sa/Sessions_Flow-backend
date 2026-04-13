using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Generates recurring session schedules for a group based on its schedule configuration.
/// Given a day-of-week and start time, produces weekly session dates from a base date
/// until TotalSessions is reached, skipping already-completed sessions.
/// </summary>
public static class ScheduleEngine
{
    /// <summary>
    /// Generate a full timeline of sessions for a group based on multiple weekly schedules.
    /// handles frequency 1, 2, or 3.
    /// </summary>
    public static List<GeneratedSession> GenerateTimeline(
        int totalSessions,
        int completedSessions,
        List<GroupSchedule> schedules,
        int startingSessionNumber = 1,
        DateTime? firstSessionDate = null)
    {
        var sessions = new List<GeneratedSession>();
        var now = DateTime.Now;

        if (schedules == null || !schedules.Any())
            return sessions;

        // Sort schedules by DayOfWeek to ensure deterministic ordering
        var sortedSchedules = schedules.OrderBy(s => (s.DayOfWeek == 0 ? 7 : s.DayOfWeek)).ThenBy(s => s.StartTime).ToList();

        // Find the start date
        DateTime startDate = firstSessionDate?.Date ?? now.Date;
        
        // Correct the start date to the first occurrence of any schedule day
        // if no firstSessionDate is provided.
        if (!firstSessionDate.HasValue)
        {
            if (!sortedSchedules.Any())
            {
                startDate = now.Date;
            }
            else
            {
                var nextOccurrences = sortedSchedules.Select(s => GetNextDayOfWeek(now.AddDays(-1), (DayOfWeek)s.DayOfWeek)).ToList();
                startDate = nextOccurrences.Min();
            }
        }

        // Number of sessions to generate = remaining sessions from starting point
        int sessionsToGenerate = totalSessions - startingSessionNumber + 1;
        if (sessionsToGenerate <= 0) return sessions;

        // RE-IMPLEMENTING with a clean Daily Iterator approach
        int currentSessionCount = 0;
        DateTime iterator = startDate;
        
        while (currentSessionCount < sessionsToGenerate)
        {
            DayOfWeek day = iterator.DayOfWeek;
            var matchingSchedules = sortedSchedules.Where(s => s.DayOfWeek == (int)day).OrderBy(s => s.StartTime).ToList();
            
            foreach (var sched in matchingSchedules)
            {
                if (currentSessionCount >= sessionsToGenerate) break;
                
                // Session number is offset from startingSessionNumber
                var sessionNumber = startingSessionNumber + currentSessionCount;
                
                sessions.Add(new GeneratedSession
                {
                    SessionNumber = sessionNumber,
                    ScheduledDate = iterator,
                    StartTime = sched.StartTime,
                    DurationMinutes = sched.DurationMinutes,
                    IsCompleted = sessionNumber <= completedSessions,
                    IsPast = iterator.Date < now.Date
                });
                currentSessionCount++;
            }
            
            iterator = iterator.AddDays(1);
        }

        return sessions;
    }

    /// <summary>
    /// Generate sessions from a Group and its list of schedules.
    /// Respects StartingSessionNumber so a group starting at session 4 of 12 generates 9 sessions (4-12).
    /// </summary>
    public static List<GeneratedSession> GenerateFromGroup(Group group, List<GroupSchedule> schedules)
    {
        return GenerateTimeline(
            totalSessions: group.TotalSessions,
            completedSessions: group.CurrentSessionNumber - 1,
            schedules: schedules,
            startingSessionNumber: group.StartingSessionNumber,
            firstSessionDate: group.ParsedDate
        );
    }

    private static DateTime GetDateInWeek(DateTime start, int weeksToAdd, DayOfWeek target)
    {
        // Find the start of the week for 'start' (let's assume Monday is start)
        int diff = (7 + (start.DayOfWeek - DayOfWeek.Monday)) % 7;
        DateTime startOfWeek = start.AddDays(-1 * diff).Date;
        
        DateTime targetInFirstWeek = startOfWeek.AddDays((7 + (target - DayOfWeek.Monday)) % 7);
        return targetInFirstWeek.AddDays(7 * weeksToAdd);
    }

    private static DateTime GetNextDayOfWeek(DateTime from, DayOfWeek target)
    {
        var daysUntil = ((int)target - (int)from.DayOfWeek + 7) % 7;
        if (daysUntil == 0) daysUntil = 0; // Allow same day if we use AddDays(-1) outside
        return from.Date.AddDays(daysUntil);
    }
}
