using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Api.Helpers;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class ReportingEndpoints
{
    public static void Map(WebApplication app)
    {
        var reports = app.MapGroup("/api/reports").RequireAuthorization();

        // GET /api/reports/session/{id} — download PDF report
        reports.MapGet("/session/{id:guid}", async (Guid id, ReportingService reporting, MongoService db, HttpContext ctx) =>
        {
            var (uid, role, identityError) = AuthorizationGuard.ExtractIdentity(ctx);
            if (identityError != null) return Results.Unauthorized();

            // SECURITY: Ownership check — only the owning engineer or admin can download reports
            var session = await db.GlobalSessions.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (session == null) return Results.NotFound(new { error = "Session not found." });
            if (role != "Admin" && session.EngineerId != uid) return Results.Forbid();

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
