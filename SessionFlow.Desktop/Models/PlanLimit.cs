namespace SessionFlow.Desktop.Models;

public static class PlanLimit
{
    public static int GetMaxGroups(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 10,
            SubscriptionTier.Pro => 15,
            SubscriptionTier.Ultra => 35,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    public static int GetMaxStudentsPerGroup(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 8,
            SubscriptionTier.Pro => 25,
            SubscriptionTier.Ultra => 40,
            SubscriptionTier.Enterprise => 50,
            _ => 0
        };

    public static int GetMaxSessionsPerGroup(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 13,
            SubscriptionTier.Pro => int.MaxValue,
            SubscriptionTier.Ultra => int.MaxValue,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    public static bool HasFeature(SubscriptionTier tier, string feature, string? role = null)
    {
        if (IsAdminBypass(role)) return true;
        return (tier, feature) switch
        {
            (_, "attendance_basic") => true,
            (SubscriptionTier.Pro or SubscriptionTier.Ultra or SubscriptionTier.Enterprise, "attendance_detailed") => true,
            (SubscriptionTier.Pro or SubscriptionTier.Ultra or SubscriptionTier.Enterprise, "student_map") => true,
            (SubscriptionTier.Enterprise, "white_label") => true,
            (SubscriptionTier.Ultra or SubscriptionTier.Enterprise, "ai_summaries") => true,
            _ => false
        };
    }

    public static long GetPriceMonthlyPiasters(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Pro => 50_00,          // 50 EGP
        SubscriptionTier.Ultra => 100_00,       // 100 EGP
        SubscriptionTier.Enterprise => 130_00,  // 130 EGP
        _ => 0
    };

    public static long GetPriceAnnualPiasters(SubscriptionTier tier) => tier switch
    {
        SubscriptionTier.Pro => 528_00,          // 528 EGP (~12% savings)
        SubscriptionTier.Ultra => 1056_00,       // 1056 EGP (~12% savings)
        SubscriptionTier.Enterprise => 1380_00,  // 1380 EGP (~11.5% savings)
        _ => 0
    };

    public static long GetPrice(SubscriptionTier tier, bool isAnnual)
        => isAnnual ? GetPriceAnnualPiasters(tier) : GetPriceMonthlyPiasters(tier);

    // ═══════════════════════════════════════
    // Chat & Media Limits
    // ═══════════════════════════════════════

    public static int GetMaxDailyMessages(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 15,
            SubscriptionTier.Pro => int.MaxValue,
            SubscriptionTier.Ultra => int.MaxValue,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    public static int GetMaxDailyImages(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 1,
            SubscriptionTier.Pro => 4,
            SubscriptionTier.Ultra => 12,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    public static int GetMaxDailyVideos(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 0,
            SubscriptionTier.Pro => 1,
            SubscriptionTier.Ultra => 5,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    public static int GetMaxDailyFiles(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 0,
            SubscriptionTier.Pro => 1,
            SubscriptionTier.Ultra => 10,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    // ═══════════════════════════════════════
    // Attendance Limits
    // ═══════════════════════════════════════

    public static int GetMaxDailyAttendance(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) ? int.MaxValue : tier switch
        {
            SubscriptionTier.Free => 1,
            SubscriptionTier.Pro => 2,
            SubscriptionTier.Ultra => 4,
            SubscriptionTier.Enterprise => int.MaxValue,
            _ => 0
        };

    // ═══════════════════════════════════════
    // Feature Gates
    // ═══════════════════════════════════════

    public static bool CallsEnabled(SubscriptionTier tier, string? role = null) =>
        IsAdminBypass(role) || tier switch
        {
            SubscriptionTier.Pro => true,
            SubscriptionTier.Ultra => true,
            SubscriptionTier.Enterprise => true,
            _ => false
        };

    // ═══════════════════════════════════════
    // AI Feature Gate
    // ═══════════════════════════════════════

    /// <summary>
    /// AI Summaries, smart analytics — available on Ultra+ and for Admin role (always).
    /// Role is passed as a string to avoid circular dependencies with UserRole enum.
    /// </summary>
    public static bool HasAIAccess(SubscriptionTier tier, string? role = null)
    {
        if (role is "Admin") return true;
        return tier is SubscriptionTier.Ultra or SubscriptionTier.Enterprise;
    }

    // ═══════════════════════════════════════
    // Admin Bypass — Admins are never blocked
    // ═══════════════════════════════════════

    /// <summary>
    /// Returns true for Admin role — they bypass all tier-based resource limits.
    /// </summary>
    public static bool IsAdminBypass(string? role) => role is "Admin";
}
