using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using StackExchange.Redis;
using System.Security.Claims;
using System.Text;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AIEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/ai").RequireAuthorization();

        // ── POST /api/ai/chat — SSE Streaming ────────────────────────────────
        group.MapPost("/chat", async (
            AIChatRequest req,
            AIService ai,
            IConnectionMultiplexer? redis,
            ClaimsPrincipal user,
            HttpContext ctx) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var userRole = user.FindFirstValue(ClaimTypes.Role) ?? "Engineer";
            var userTier = user.FindFirstValue("subscription_tier") ?? "Free";

            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers["Cache-Control"] = "no-cache";
            ctx.Response.Headers["X-Accel-Buffering"] = "no";

            var cacheDb = redis?.GetDatabase();
            var ct = ctx.RequestAborted;

            try
            {
                await foreach (var chunk in ai.ChatStreamAsync(
                    userId, userRole, req.SessionId, req.Message, req.History, userTier, ct))
                {
                    // SSE format
                    var escaped = chunk.Replace("\n", "\\n").Replace("\r", "");
                    var line = $"data: {escaped}\n\n";
                    await ctx.Response.WriteAsync(line, ct);
                    await ctx.Response.Body.FlushAsync(ct);
                }
                await ctx.Response.WriteAsync("data: [DONE]\n\n", ct);
            }
            catch (OperationCanceledException) { /* Client disconnected */ }
        });

        // ── GET /api/ai/usage — Current day quota usage ───────────────────────
        group.MapGet("/usage", async (
            AIService ai,
            IConnectionMultiplexer? redis,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var tier = user.FindFirstValue("subscription_tier") ?? "Free";
            var cacheDb = redis?.GetDatabase();
            var used = await ai.GetDailyUsageAsync(userId, cacheDb);

            var limits = new Dictionary<string, int>
            {
                ["Free"] = 20, ["Pro"] = 200, ["Ultra"] = 500, ["Enterprise"] = 9999
            };
            var limit = limits.GetValueOrDefault(tier, 20);

            return Results.Ok(new { used, limit, tier });
        });

        // ── GET /api/ai/logs — Paginated AI history ───────────────────────────
        group.MapGet("/logs", [Authorize(Policy = "AdminOnly")] async (
            AIService ai,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? userId = null) =>
        {
            Guid? uid = userId != null && Guid.TryParse(userId, out var g) ? g : null;
            var logs = await ai.GetLogsAsync(uid, page, pageSize);
            return Results.Ok(logs.Select(l => new
            {
                id = l.Id,
                userId = l.UserId,
                userName = l.UserName,
                sessionId = l.SessionId,
                prompt = l.Prompt.Length > 100 ? l.Prompt[..100] + "..." : l.Prompt,
                response = l.Response.Length > 200 ? l.Response[..200] + "..." : l.Response,
                model = l.Model,
                durationMs = l.DurationMs,
                wasCached = l.WasCached,
                wasError = l.WasError,
                timestamp = l.Timestamp
            }));
        });

        // ── GET /api/ai/presets — User's saved presets ───────────────────────
        group.MapGet("/presets", async (AIService ai, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var presets = await ai.GetPresetsAsync(userId);
            return Results.Ok(presets);
        });

        // ── POST /api/ai/presets — Save new preset ────────────────────────────
        group.MapPost("/presets", async (AIPresetRequest req, AIService ai, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Prompt))
                return Results.BadRequest(new { error = "Title and Prompt are required." });

            var preset = await ai.CreatePresetAsync(userId, req);
            return Results.Ok(preset);
        });

        // ── DELETE /api/ai/presets/:id — Delete preset ───────────────────────
        group.MapDelete("/presets/{id:guid}", async (Guid id, AIService ai, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await ai.DeletePresetAsync(id, userId);
            return Results.Ok(new { message = "Preset deleted." });
        });
    }
}
