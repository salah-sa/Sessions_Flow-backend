using System;

namespace SessionFlow.Desktop.Models;

/// <summary>
/// A non-persistent model representing a calculated session node in the group's timeline.
/// Used for timetable projection and history planning.
/// </summary>
public class GeneratedSession
{
    public int SessionNumber { get; set; }
    public DateTime ScheduledDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsCompleted { get; set; }
    public bool IsPast { get; set; }

    // Helper for combined date and time
    public DateTime ScheduledAt => ScheduledDate.Date.Add(StartTime);
}
