namespace SessionFlow.Desktop.Models;

public static class PlanLimit
{
    public static int GetMaxGroups(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 2,
        SubscriptionTier.Pro => 15,
        SubscriptionTier.Ultra => int.MaxValue,
        _ => 0
    };

    public static int GetMaxStudentsPerGroup(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 8,
        SubscriptionTier.Pro => 25,
        SubscriptionTier.Ultra => 50,
        _ => 0
    };

    public static int GetMaxSessionsPerGroup(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 13,
        SubscriptionTier.Pro => int.MaxValue,
        SubscriptionTier.Ultra => int.MaxValue,
        _ => 0
    };

    public static bool HasFeature(SubscriptionTier tier, string feature) => (tier, feature) switch
    {
        (_, "attendance_basic") => true,
        (SubscriptionTier.Pro or SubscriptionTier.Ultra, "attendance_detailed") => true,
        (SubscriptionTier.Pro or SubscriptionTier.Ultra, "student_map") => true,
        (SubscriptionTier.Ultra, "white_label") => true,
        (SubscriptionTier.Ultra, "ai_summaries") => true,
        _ => false
    };

    public static int GetMaxDailyMessages(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 12,
        SubscriptionTier.Pro => 30,
        SubscriptionTier.Ultra => int.MaxValue,
        _ => 0
    };

    public static int GetMaxCharactersPerMessage(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 1800,
        SubscriptionTier.Pro => 3600,
        SubscriptionTier.Ultra => 10000,
        _ => 0
    };

    public static int GetMaxDailyImages(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 3,
        SubscriptionTier.Pro => 10,
        SubscriptionTier.Ultra => 30,
        _ => 0
    };

    public static int GetMaxDailyVideos(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Free => 1,
        SubscriptionTier.Pro => 3,
        SubscriptionTier.Ultra => 10,
        _ => 0
    };

    public static long GetPriceMonthlyPiasters(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Pro => 30_00, // 30 EGP
        SubscriptionTier.Ultra => 50_00, // 50 EGP
        _ => 0
    };

    public static long GetPriceAnnualPiasters(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Pro => 300_00, // ~2 months free
        SubscriptionTier.Ultra => 500_00, // ~2 months free
        _ => 0
    };

    public static long GetPrice(SubscriptionTier tier, bool isAnnual)
        => isAnnual ? GetPriceAnnualPiasters(tier) : GetPriceMonthlyPiasters(tier);
}
