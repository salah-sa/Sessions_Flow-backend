using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class FeatureFlagEndpoints
{
    public static void Map(WebApplication app)
    {
        // ── User-facing: flags for current user ───────────────────────────────
        app.MapGet("/api/flags/me", async (
            FeatureFlagService flags,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = user.FindFirstValue(ClaimTypes.Role) ?? "Engineer";
            var tier = user.FindFirstValue("subscription_tier") ?? "Free";
            var myFlags = await flags.GetFlagsForUserAsync(userId, role, tier);
            return Results.Ok(myFlags);
        }).RequireAuthorization();

        // ── Admin: full CRUD ──────────────────────────────────────────────────
        var admin = app.MapGroup("/api/admin/flags")
            .RequireAuthorization("AdminOnly");

        // GET /api/admin/flags
        admin.MapGet("/", async (FeatureFlagService flags) =>
        {
            var all = await flags.GetAllFlagsAsync();
            return Results.Ok(all);
        });

        // POST /api/admin/flags
        admin.MapPost("/", async (
            CreateFlagRequest req,
            FeatureFlagService flags,
            ClaimsPrincipal user) =>
        {
            if (string.IsNullOrWhiteSpace(req.Key) || string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Key and Name are required." });

            var updatedBy = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            var flag = await flags.CreateFlagAsync(req, updatedBy);
            return Results.Ok(flag);
        });

        // PATCH /api/admin/flags/:key
        admin.MapPatch("/{key}", async (
            string key,
            UpdateFlagRequest req,
            FeatureFlagService flags,
            ClaimsPrincipal user) =>
        {
            var updatedBy = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            var updated = await flags.UpdateFlagAsync(key, req, updatedBy);
            return updated
                ? Results.Ok(new { message = $"Flag '{key}' updated." })
                : Results.NotFound(new { error = $"Flag '{key}' not found." });
        });

        // DELETE /api/admin/flags/:key
        admin.MapDelete("/{key}", async (string key, FeatureFlagService flags) =>
        {
            var deleted = await flags.DeleteFlagAsync(key);
            return deleted
                ? Results.Ok(new { message = $"Flag '{key}' deleted." })
                : Results.NotFound(new { error = $"Flag '{key}' not found." });
        });
    }
}
