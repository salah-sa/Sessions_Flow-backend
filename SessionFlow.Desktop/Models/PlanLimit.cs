namespace SessionFlow.Desktop.Models;

public static class PlanLimit
{
    public static int GetMaxGroups(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 2,
        SubscriptionTier.Pro => 15,
        SubscriptionTier.Enterprise => int.MaxValue,
        _ => 0
    };

    public static int GetMaxStudentsPerGroup(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 8,
        SubscriptionTier.Pro => 25,
        SubscriptionTier.Enterprise => 50,
        _ => 0
    };

    public static int GetMaxSessionsPerGroup(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 13,
        SubscriptionTier.Pro => int.MaxValue,
        SubscriptionTier.Enterprise => int.MaxValue,
        _ => 0
    };

    public static bool HasFeature(SubscriptionTier tier, string feature) => (tier, feature) switch
    {
        (_, "attendance_basic") => true,
        (SubscriptionTier.Pro or SubscriptionTier.Enterprise, "attendance_detailed") => true,
        (SubscriptionTier.Pro or SubscriptionTier.Enterprise, "student_map") => true,
        (SubscriptionTier.Enterprise, "white_label") => true,
        (SubscriptionTier.Enterprise, "ai_summaries") => true,
        _ => false
    };

    public static long GetPriceMonthlyPiasters(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Pro => 149_00, // 149 EGP
        SubscriptionTier.Enterprise => 499_00, // 499 EGP
        _ => 0
    };

    public static long GetPriceAnnualPiasters(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Pro => 1490_00, // ~2 months free
        SubscriptionTier.Enterprise => 4990_00, // ~2 months free
        _ => 0
    };
}
