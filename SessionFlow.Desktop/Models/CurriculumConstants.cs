namespace SessionFlow.Desktop.Models;

public static class CurriculumConstants
{
    public static int GetMaxStudents(int level)
    {
        return 4;
    }

    public static int GetTotalSessions(int level)
    {
        return 13; // All levels: 13 sessions
    }

    public static string GetLevelName(int level)
    {
        return level switch
        {
            1 => "Fundamentals",
            2 => "Intermediate",
            3 => "Advanced",
            4 => "Masterclass",
            5 => "Expert",
            _ => "Unknown"
        };
    }

    public static decimal GetIdealRevenue(int level)
    {
        return level switch
        {
            1 => 1500,
            2 => 2000,
            3 => 2500,
            4 => 3000,
            5 => 3500,
            _ => 0
        };
    }
}
