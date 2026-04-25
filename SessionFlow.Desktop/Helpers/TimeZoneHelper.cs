using Microsoft.Extensions.Configuration;
using System;

namespace SessionFlow.Desktop.Helpers;

public static class TimeZoneHelper
{
    public static TimeZoneInfo GetConfiguredTimeZone(IConfiguration? config = null)
    {
        var tzId = config?.GetValue<string>("Application:Timezone") ?? "Africa/Cairo";
        
        // Try the configured value first (supports both Windows and IANA IDs)
        try { return TimeZoneInfo.FindSystemTimeZoneById(tzId); }
        catch (TimeZoneNotFoundException) { }
        
        // Fallback: try Windows-style "Egypt Standard Time"
        try { return TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time"); }
        catch (TimeZoneNotFoundException) { }
        
        // Final fallback: UTC+2 (Static) - only if everything else fails
        return TimeZoneInfo.CreateCustomTimeZone("Cairo", TimeSpan.FromHours(2), "Cairo", "Cairo");
    }

    public static DateTimeOffset ToCairoTime(this DateTimeOffset utcTime, IConfiguration? config = null)
    {
        var tz = GetConfiguredTimeZone(config);
        return TimeZoneInfo.ConvertTime(utcTime, tz);
    }
    
    public static TimeSpan GetCairoOffset(IConfiguration? config = null)
    {
        var tz = GetConfiguredTimeZone(config);
        return tz.GetUtcOffset(DateTimeOffset.UtcNow);
    }
}
