using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/settings").RequireAuthorization();

        // GET /api/settings - all settings (filtered by role)
        group.MapGet("/", async (MongoService db, ClaimsPrincipal user) =>
        {
            var role = user.FindFirst(ClaimTypes.Role)?.Value;
            var settingsList = await db.Settings.Find(_ => true).ToListAsync();
            
            // Non-admins only see public settings
            if (role != "Admin")
            {
                var publicKeys = new[] { "app_name", "app_logo_text", "terminal_id", "price_level_1", "price_level_2", "price_level_3", "price_level_4" };
                settingsList = settingsList.Where(s => publicKeys.Contains(s.Key.ToLower())).ToList();
            }

            return Results.Ok(settingsList.Select(s => new {
                id = s.Id,
                key = s.Key,
                value = s.Value,
                updatedAt = s.UpdatedAt
            }));
        });

        // PUT /api/settings - upsert settings
        group.MapPut("/", [Microsoft.AspNetCore.Authorization.Authorize("AdminOnly")] async (Dictionary<string, string> updates, MongoService db, HttpContext ctx) =>    
        {
            foreach (var (key, value) in updates)
            {
                var filter = Builders<Setting>.Filter.Eq(s => s.Key, key);
                var update = Builders<Setting>.Update
                    .Set(s => s.Value, value)
                    .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow)
                    .SetOnInsert(s => s.Id, MongoDB.Bson.ObjectId.GenerateNewId().ToString());

                await db.Settings.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });     
            }

            return Results.Ok(new { message = "Settings updated." });
        });

        // POST /api/settings/test-email
        group.MapPost("/test-email", [Microsoft.AspNetCore.Authorization.Authorize("AdminOnly")] async (TestEmailRequest req, EmailService emailService, HttpContext ctx) =>
        {
            var to = req.To;
            if (string.IsNullOrWhiteSpace(to))
            {
                to = ctx.User.FindFirst(ClaimTypes.Email)?.Value ?? "";
            }

            if (string.IsNullOrWhiteSpace(to))
                return Results.BadRequest(new { error = "No email address provided." });

            var (success, error) = await emailService.SendTestEmailAsync(to);
            if (!success)
                return Results.BadRequest(new { error = error ?? "Failed to send test email." });

            return Results.Ok(new { message = $"Test email sent to {to}." });
        });


        // POST /api/export/history
        app.MapPost("/api/export/history", async (ExportRequest req, MongoService db) =>
        {
            if (string.IsNullOrWhiteSpace(req.FilePath))
                return Results.BadRequest(new { error = "File path is required." });

            var sessionBuilder = Builders<Session>.Filter;
            var sessionFilter = sessionBuilder.Empty;

            if (req.StartDate.HasValue)
                sessionFilter &= sessionBuilder.Gte(s => s.ScheduledAt, req.StartDate.Value);
            if (req.EndDate.HasValue)
                sessionFilter &= sessionBuilder.Lte(s => s.ScheduledAt, req.EndDate.Value);
            if (!string.IsNullOrEmpty(req.GroupId) && Guid.TryParse(req.GroupId, out var gid))
                sessionFilter &= sessionBuilder.Eq(s => s.GroupId, gid);

            var sessions = await db.Sessions.Find(sessionFilter).ToListAsync();
            var sessionIds = sessions.Select(s => s.Id).ToList();

            var records = await db.AttendanceRecords.Find(r => sessionIds.Contains(r.SessionId)).ToListAsync();

            var studentIds = records.Select(r => r.StudentId).Distinct().ToList();
            var students = await db.Students.Find(s => studentIds.Contains(s.Id)).ToListAsync();
            var studentDict = students.ToDictionary(s => s.Id);

            var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
            var groups = await db.Groups.Find(g => groupIds.Contains(g.Id)).ToListAsync();
            var groupDict = groups.ToDictionary(g => g.Id);

            var sessionDict = sessions.ToDictionary(s => s.Id);

            var sortedRecords = records.Select(r =>
            {
                var session = sessionDict[r.SessionId];
                studentDict.TryGetValue(r.StudentId, out var student);
                groupDict.TryGetValue(session.GroupId, out var groupInfo);

                return new
                {
                    Date = session.ScheduledAt,
                    Time = session.ScheduledAt,
                    Group = groupInfo?.Name ?? "",
                    Student = student?.Name ?? "",
                    Status = r.Status.ToString()
                };
            })
            .OrderBy(r => r.Date)
            .ThenBy(r => r.Student)
            .ToList();

            var csv = new StringBuilder();
            csv.AppendLine("Date,Time,Group,Student,Status");

            var cairoOffset = TimeSpan.FromHours(2);
            foreach (var r in sortedRecords)
            {
                var dynamicRec = (dynamic)r;
                var sessionTime = ((DateTimeOffset)dynamicRec.Date).ToOffset(cairoOffset);
                var gName = ((string)dynamicRec.Group).Replace(",", ";");
                var sName = ((string)dynamicRec.Student).Replace(",", ";");
                csv.AppendLine($"{sessionTime:yyyy-MM-dd},{sessionTime:HH:mm},{gName},{sName},{dynamicRec.Status}");
            }

            try
            {
                var dir = Path.GetDirectoryName(req.FilePath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                await File.WriteAllTextAsync(req.FilePath, csv.ToString(), Encoding.UTF8);
                return Results.Ok(new { message = $"Exported {sortedRecords.Count} records to {req.FilePath}." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = $"Failed to write file: {ex.Message}" });
            }
        }).RequireAuthorization();
    }

    public record TestEmailRequest(string? To);
    public record ExportRequest(string FilePath, DateTimeOffset? StartDate, DateTimeOffset? EndDate, string? GroupId);
}
