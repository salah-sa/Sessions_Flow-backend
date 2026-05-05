using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AnalyticsEndpoints
{
    public static void Map(WebApplication app)
    {
        // ── Public Analytics Ingest (Frontend events) ─────────────────────────
        var ingest = app.MapGroup("/api/v1/analytics").RequireAuthorization();

        // POST /api/analytics/event — Single event from frontend
        ingest.MapPost("/event", async (
            AnalyticsEventRequest req,
            AnalyticsService analytics,
            ClaimsPrincipal user,
            HttpContext ctx) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) is string s && Guid.TryParse(s, out var g) ? g : (Guid?)null;
            var role = user.FindFirstValue(ClaimTypes.Role) ?? "unknown";
            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            var ua = ctx.Request.Headers["User-Agent"].ToString();
            await analytics.TrackEventAsync(req, userId, role, ip, ua);
            return Results.Ok();
        });

        // POST /api/analytics/events/batch — Batch events from frontend
        ingest.MapPost("/events/batch", async (
            AnalyticsBatchRequest req,
            AnalyticsService analytics,
            ClaimsPrincipal user,
            HttpContext ctx) =>
        {
            if (req.Events.Count > 100)
                return Results.BadRequest(new { error = "Batch limit is 100 events." });
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) is string s && Guid.TryParse(s, out var g) ? g : (Guid?)null;
            var role = user.FindFirstValue(ClaimTypes.Role) ?? "unknown";
            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            var ua = ctx.Request.Headers["User-Agent"].ToString();
            await analytics.TrackBatchAsync(req.Events, userId, role, ip, ua);
            return Results.Ok(new { tracked = req.Events.Count });
        });

        // ── Admin Analytics Dashboard ──────────────────────────────────────────
        var admin = app.MapGroup("/api/v1/analytics/admin")
            .RequireAuthorization()
            .AddEndpointFilter(async (ctx, next) =>
            {
                var user = ctx.HttpContext.User;
                var role = user.FindFirstValue(ClaimTypes.Role);
                if (role != "Admin")
                    return Results.Forbid();
                return await next(ctx);
            });

        // GET /api/analytics/admin/overview
        admin.MapGet("/overview", async (AnalyticsService analytics) =>
        {
            var overview = await analytics.GetOverviewAsync();
            return Results.Ok(overview);
        });

        // GET /api/analytics/admin/dau?days=30
        admin.MapGet("/dau", async (AnalyticsService analytics, [FromQuery] int days = 30) =>
        {
            var dau = await analytics.GetDauAsync(Math.Clamp(days, 7, 90));
            return Results.Ok(dau);
        });

        // GET /api/analytics/admin/feature-usage
        admin.MapGet("/feature-usage", async (AnalyticsService analytics, [FromQuery] int days = 30) =>
        {
            var usage = await analytics.GetFeatureUsageAsync(Math.Clamp(days, 7, 90));
            return Results.Ok(usage);
        });

        // GET /api/analytics/admin/sessions
        admin.MapGet("/sessions", async (AnalyticsService analytics) =>
        {
            var metrics = await analytics.GetSessionMetricsAsync();
            return Results.Ok(metrics);
        });

        // GET /api/analytics/admin/roles
        admin.MapGet("/roles", async (AnalyticsService analytics) =>
        {
            var distribution = await analytics.GetRoleDistributionAsync();
            return Results.Ok(distribution);
        });

        // GET /api/analytics/admin/recent-events
        admin.MapGet("/recent-events", async (AnalyticsService analytics, [FromQuery] int limit = 100) =>
        {
            var events = await analytics.GetRecentEventsAsync(Math.Clamp(limit, 10, 500));
            return Results.Ok(events);
        });
    }
}
