using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class AnalyticsService
{
    private readonly MongoService _db;

    public AnalyticsService(MongoService db)
    {
        _db = db;
    }

    // ── KPI Overview ────────────────────────────────────────────────────────────
    public async Task<AnalyticsOverview> GetOverviewAsync()
    {
        var today = DateTimeOffset.UtcNow.Date;
        var weekAgo = today.AddDays(-7);
        var monthAgo = today.AddDays(-30);

        var totalUsers = await _db.Users.CountDocumentsAsync(_ => true);
        // "Active today" derived from UsageCounters (users who made requests today)
        // Cairo local date key format to match UsageCounter convention
        var todayKey = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var activeToday = await _db.UsageCounters.CountDocumentsAsync(
            u => u.DateKey == todayKey);
        var newThisMonth = await _db.Users.CountDocumentsAsync(
            u => u.CreatedAt >= monthAgo);
        var sessionsToday = await _db.Sessions.CountDocumentsAsync(
            s => s.ScheduledAt >= today && !s.IsDeleted);
        var sessionsThisWeek = await _db.Sessions.CountDocumentsAsync(
            s => s.ScheduledAt >= weekAgo && !s.IsDeleted);

        // Compute attendance rate this week
        var weekSessions = await _db.Sessions
            .Find(s => s.ScheduledAt >= weekAgo && !s.IsDeleted)
            .Project(s => s.Id)
            .ToListAsync();

        double attendanceRate = 0;
        if (weekSessions.Count > 0)
        {
            var total = await _db.AttendanceRecords.CountDocumentsAsync(
                r => weekSessions.Contains(r.SessionId));
            var present = await _db.AttendanceRecords.CountDocumentsAsync(
                r => weekSessions.Contains(r.SessionId) && r.Status == AttendanceStatus.Present);
            attendanceRate = total > 0 ? Math.Round((double)present / total * 100, 1) : 0;
        }

        return new AnalyticsOverview(
            TotalUsers: (int)totalUsers,
            ActiveUsersToday: (int)activeToday,
            NewUsersThisMonth: (int)newThisMonth,
            SessionsToday: (int)sessionsToday,
            SessionsThisWeek: (int)sessionsThisWeek,
            AttendanceRateThisWeek: attendanceRate
        );
    }

    // ── Daily Active Users (based on AnalyticsEvents tracking) ─────────────────
    public async Task<List<DauDataPoint>> GetDauAsync(int days = 30)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-days);
        
        // Use AnalyticsEvents for accurate DAU (userId distinct per day)
        var events = await _db.AnalyticsEvents
            .Find(e => e.Timestamp >= since && e.EventType == "page_view")
            .Project(e => new { e.UserId, e.Timestamp })
            .ToListAsync();

        // Fallback: use user creation if no events yet
        if (events.Count == 0)
        {
            var users = await _db.Users.Find(u => u.CreatedAt >= since)
                .Project(u => new { u.CreatedAt })
                .ToListAsync();
            return users
                .GroupBy(u => u.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new DauDataPoint(g.Key.ToString("yyyy-MM-dd"), g.Count()))
                .ToList();
        }

        return events
            .Where(e => e.UserId.HasValue)
            .GroupBy(e => e.Timestamp.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DauDataPoint(g.Key.ToString("yyyy-MM-dd"), g.Select(x => x.UserId).Distinct().Count()))
            .ToList();
    }

    // ── Analytics Event Tracking (Hybrid approach) ──────────────────────────────
    public async Task TrackEventAsync(AnalyticsEventRequest req, Guid? userId, string userRole, string? ip, string? userAgent)
    {
        var evt = new AnalyticsEvent
        {
            UserId = userId,
            UserRole = userRole,
            EventType = req.EventType,
            Route = req.Route,
            BrowserSessionId = req.BrowserSessionId,
            Metadata = req.Metadata ?? new(),
            IpAddress = ip,
            UserAgent = userAgent
        };
        await _db.AnalyticsEvents.InsertOneAsync(evt);
    }

    public async Task TrackBatchAsync(List<AnalyticsEventRequest> reqs, Guid? userId, string userRole, string? ip, string? userAgent)
    {
        if (reqs.Count == 0) return;
        var events = reqs.Select(r => new AnalyticsEvent
        {
            UserId = userId,
            UserRole = userRole,
            EventType = r.EventType,
            Route = r.Route,
            BrowserSessionId = r.BrowserSessionId,
            Metadata = r.Metadata ?? new(),
            IpAddress = ip,
            UserAgent = userAgent
        }).ToList();
        await _db.AnalyticsEvents.InsertManyAsync(events);
    }

    // ── Feature Usage (page visits per route) ───────────────────────────────────
    public async Task<List<FeatureUsagePoint>> GetFeatureUsageAsync(int days = 30)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-days);
        var events = await _db.AnalyticsEvents
            .Find(e => e.Timestamp >= since && e.EventType == "page_view")
            .ToListAsync();

        return events
            .GroupBy(e => e.Route)
            .OrderByDescending(g => g.Count())
            .Take(20)
            .Select(g => new FeatureUsagePoint(g.Key, g.Count()))
            .ToList();
    }

    // ── Session Metrics ──────────────────────────────────────────────────────────
    public async Task<SessionMetrics> GetSessionMetricsAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var weekAgo = now.AddDays(-7);

        var sessions = await _db.Sessions
            .Find(s => s.ScheduledAt >= weekAgo && !s.IsDeleted)
            .ToListAsync();

        // Peak hours from this week's sessions
        var peakHours = sessions
            .GroupBy(s => s.ScheduledAt.Hour)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => new PeakHour(g.Key, g.Count()))
            .ToList();

        return new SessionMetrics(
            TotalThisWeek: sessions.Count,
            PeakHours: peakHours
        );
    }

    // ── User Role Distribution ───────────────────────────────────────────────────
    public async Task<List<RoleDistribution>> GetRoleDistributionAsync()
    {
        var users = await _db.Users.Find(_ => true)
            .Project(u => u.Role)
            .ToListAsync();

        return users
            .GroupBy(r => r.ToString())
            .Select(g => new RoleDistribution(g.Key, g.Count()))
            .ToList();
    }

    // ── Recent Events Feed ───────────────────────────────────────────────────────
    public async Task<List<AnalyticsEvent>> GetRecentEventsAsync(int limit = 100)
    {
        return await _db.AnalyticsEvents
            .Find(_ => true)
            .SortByDescending(e => e.Timestamp)
            .Limit(limit)
            .ToListAsync();
    }
}

// ── Response DTOs ──────────────────────────────────────────────────────────────
public record AnalyticsOverview(
    int TotalUsers,
    int ActiveUsersToday,
    int NewUsersThisMonth,
    int SessionsToday,
    int SessionsThisWeek,
    double AttendanceRateThisWeek);

public record DauDataPoint(string Date, int Count);
public record FeatureUsagePoint(string Route, int Visits);
public record SessionMetrics(int TotalThisWeek, List<PeakHour> PeakHours);
public record PeakHour(int Hour, int Count);
public record RoleDistribution(string Role, int Count);
