namespace SessionFlow.Desktop.Models;

public static class CurriculumConstants
{
    public static int GetMaxStudents(int level)
    {
        return level == 4 ? 2 : 4;
    }

    public static int GetTotalSessions(int level)
    {
        return level == 2 ? 12 : 13;
    }

    public static string GetLevelName(int level)
    {
        return level switch
        {
            1 => "Fundamentals",
            2 => "Intermediate",
            3 => "Advanced",
            4 => "Masterclass",
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
            _ => 0
        };
    }
}
