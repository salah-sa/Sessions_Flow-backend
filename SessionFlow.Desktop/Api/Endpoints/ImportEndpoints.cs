using System.Security.Claims;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Data;
using MongoDB.Driver;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class ImportEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/import").RequireAuthorization();

        // POST /api/import/3cschool/test — test connection to 3cschool.net
        group.MapPost("/3cschool/test", async (ThreeCSchoolService service, HttpContext ctx) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<ThreeCSchoolCredentials>();
            if (body == null || string.IsNullOrEmpty(body.Email) || string.IsNullOrEmpty(body.Password))
                return Results.BadRequest(new { error = "Email and password are required." });

            var (success, error, preview) = await service.TestConnectionAsync(body.Email, body.Password);

            if (!success)
                return Results.BadRequest(new { error });

            return Results.Ok(new { success = true, message = preview });
        });

        // POST /api/import/3cschool/preview — login and preview discoverable groups
        group.MapPost("/3cschool/preview", async (ThreeCSchoolService service, HttpContext ctx) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<ThreeCSchoolCredentials>();
            if (body == null || string.IsNullOrEmpty(body.Email) || string.IsNullOrEmpty(body.Password))
                return Results.BadRequest(new { error = "Email and password are required." });

            var (client, loginError) = await service.LoginAsync(body.Email, body.Password);
            if (client == null)
                return Results.BadRequest(new { error = loginError });

            var result = await service.FetchGroupsPreviewAsync(client);

            if (!result.Success)
            {
                client.Dispose();
                return Results.BadRequest(new { error = result.Error });
            }

            // Discovery Mode ONLY. Deep scan (student fetch) is deferred to /execute to keep preview fast.

            client.Dispose();

            return Results.Ok(new
            {
                success = true,
                groupsFound = result.GroupsFound,
                groups = result.Groups.Select(g => new
                {
                    name = g.Name,
                    raw3cTitle = g.Raw3cTitle,
                    normalizedGroupName = g.NormalizedGroupName,
                    courseLabel = g.CourseLabel,
                    level = g.Level,
                    schedule = g.Schedule,
                    scheduleDay = g.ScheduleDay,
                    scheduleTimeRange = g.ScheduleTimeRange,
                    studentCount = g.StudentCount,
                    alreadyExists = g.AlreadyExists,
                    detailUrl = g.DetailUrl,
                    sourceUrl = g.SourceUrl,
                    totalSessions = g.TotalSessions,
                    completedSessions = g.CompletedSessions,
                    currentSessionNumber = g.CurrentSessionNumber,
                    sourceGroupId = g.SourceGroupId,
                    instructorName = g.InstructorName,
                    confidenceScore = g.ConfidenceScore,
                    semanticMismatch = g.SemanticMismatch,
                    warnings = g.Warnings,
                    studentFetchSource = g.StudentFetchSource,
                    rawTitleSource = g.RawTitleSource,
                    groupStatus = g.GroupStatus,
                    students = g.Students.Select(s => new { name = s.Name, studentId = s.StudentId })
                })
            });
        });

        // POST /api/import/3cschool/execute — full import pipeline
        group.MapPost("/3cschool/execute", async (ThreeCSchoolService service, HttpContext ctx) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<ThreeCSchoolCredentials>();
            if (body == null || string.IsNullOrEmpty(body.Email) || string.IsNullOrEmpty(body.Password))
                return Results.BadRequest(new { error = "Email and password are required." });

            var userId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var engineerId))
                return Results.Unauthorized();

            var result = await service.ImportAllAsync(body.Email, body.Password, engineerId);

            if (!result.Success && result.Error != null)
                return Results.BadRequest(new { error = result.Error });

            return Results.Ok(new
            {
                success = true,
                groupsFound = result.GroupsFound,
                groupsImported = result.GroupsImported,
                studentsImported = result.StudentsImported,
                schedulesImported = result.SchedulesImported,
                groups = result.Groups.Select(g => new
                {
                    name = g.Name,
                    raw3cTitle = g.Raw3cTitle,
                    normalizedGroupName = g.NormalizedGroupName,
                    courseLabel = g.CourseLabel,
                    level = g.Level,
                    studentCount = g.StudentCount,
                    alreadyExists = g.AlreadyExists,
                    totalSessions = g.TotalSessions,
                    completedSessions = g.CompletedSessions,
                    sourceGroupId = g.SourceGroupId,
                    sourceUrl = g.SourceUrl,
                    instructorName = g.InstructorName
                })
            });
        });

        // GET /api/import/3cschool/debug-html — retrieve last saved HTML for analysis
        app.MapGet("/api/import/3cschool/debug-html", async (MongoService db) =>
        {
            var doc = await db.Settings.Find(s => s.Key == "3c_last_panel_html").FirstOrDefaultAsync();
            if (doc == null) return Results.NotFound(new { error = "No saved HTML found. Run a 'Test Connection' first." });
            return Results.Content(doc.Value, "text/html");
        });
    }

    private record ThreeCSchoolCredentials(string Email, string Password);
}
