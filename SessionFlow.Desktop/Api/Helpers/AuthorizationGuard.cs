using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Helpers;

/// <summary>
/// Centralized ownership validation for multi-tenant data isolation.
/// Every mutating endpoint MUST call the appropriate guard before performing any action.
/// Admin role bypasses all ownership checks.
/// </summary>
public static class AuthorizationGuard
{
    /// <summary>
    /// Extracts the authenticated user's identity from JWT claims.
    /// Returns (userId, role) or an error string if the claims are invalid.
    /// </summary>
    public static (Guid userId, string role, string? error) ExtractIdentity(HttpContext ctx)
    {
        var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value ?? "";

        if (!Guid.TryParse(userIdStr, out var userId))
            return (Guid.Empty, "", "Unauthorized: Invalid or missing user identity.");

        return (userId, role, null);
    }

    /// <summary>
    /// Verifies the current user owns the specified group.
    /// Returns null if authorized, or a Forbid/Unauthorized IResult if not.
    /// Admin role always passes.
    /// </summary>
    public static async Task<IResult?> EnsureOwnsGroup(Guid groupId, Guid userId, string role, MongoService db)
    {
        if (role == "Admin") return null;

        var group = await db.Groups.Find(g => g.Id == groupId).FirstOrDefaultAsync();
        if (group == null)
            return Results.NotFound(new { error = "Group not found." });

        if (group.EngineerId != userId)
            return Results.Forbid();

        return null;
    }

    /// <summary>
    /// Verifies the current user owns the group that a session belongs to.
    /// Returns null if authorized, or Forbid/NotFound.
    /// Admin role always passes.
    /// </summary>
    public static async Task<IResult?> EnsureOwnsSession(Guid sessionId, Guid userId, string role, MongoService db)
    {
        if (role == "Admin") return null;

        var session = await db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null)
            return Results.NotFound(new { error = "Session not found." });

        if (role == "Engineer" && session.EngineerId != userId)
            return Results.Forbid();

        return null;
    }

    /// <summary>
    /// Verifies the current user owns the group that a student belongs to.
    /// Returns null if authorized, or Forbid/NotFound.
    /// Admin role always passes.
    /// </summary>
    public static async Task<IResult?> EnsureOwnsStudent(Guid studentId, Guid userId, string role, MongoService db)
    {
        if (role == "Admin") return null;

        var student = await db.Students.Find(s => s.Id == studentId).FirstOrDefaultAsync();
        if (student == null)
            return Results.NotFound(new { error = "Student not found." });

        var group = await db.Groups.Find(g => g.Id == student.GroupId).FirstOrDefaultAsync();
        if (group == null || group.EngineerId != userId)
            return Results.Forbid();

        return null;
    }

    /// <summary>
    /// Verifies the current user owns the group that a schedule entry belongs to.
    /// Returns null if authorized, or Forbid/NotFound.
    /// Admin role always passes.
    /// </summary>
    public static async Task<IResult?> EnsureOwnsGroupSchedule(Guid scheduleId, Guid userId, string role, MongoService db)
    {
        if (role == "Admin") return null;

        var schedule = await db.GroupSchedules.Find(gs => gs.Id == scheduleId).FirstOrDefaultAsync();
        if (schedule == null)
            return Results.NotFound(new { error = "Schedule not found." });

        var group = await db.Groups.Find(g => g.Id == schedule.GroupId).FirstOrDefaultAsync();
        if (group == null || group.EngineerId != userId)
            return Results.Forbid();

        return null;
    }
}
