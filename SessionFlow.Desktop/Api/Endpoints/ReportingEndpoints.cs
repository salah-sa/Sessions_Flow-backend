using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Data;
using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class ReportingEndpoints
{
    public static void Map(WebApplication app)
    {
        var reports = app.MapGroup("/api/reports").RequireAuthorization();

        // GET /api/reports/session/{id} — download PDF report
        reports.MapGet("/session/{id:guid}", async (Guid id, ReportingService reporting, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            // Zero-Trust: verify caller owns this session before generating report
            var session = await db.Sessions.Find(s => s.Id == id && !s.IsDeleted).FirstOrDefaultAsync();
            if (session == null) return Results.NotFound(new { error = "Session not found." });
            if (session.EngineerId != userId) return Results.Forbid();

            try
            {
                var pdf = await reporting.GenerateSessionReportAsync(id);
                return Results.File(pdf, "application/pdf", $"session-report-{id}.pdf");
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // GET /api/reports/group/{id} — group summary report (Future)
        reports.MapGet("/group/{id:guid}", (Guid id, ReportingService reporting) => {
            return Results.Problem("Not implemented yet. Coming in Phase 25.");
        });
    }
}
