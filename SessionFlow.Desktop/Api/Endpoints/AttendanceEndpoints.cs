using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AttendanceEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/attendance").RequireAuthorization();

        // GET /api/attendance?sessionId=&studentId= — get attendance records with tenant isolation
        group.MapGet("/", async (MongoService db, HttpContext ctx, string? sessionId, string? studentId) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var builder = Builders<AttendanceRecord>.Filter;
            var filter = builder.Empty;

            // Zero-Trust: sessionId is mandatory to scope results
            if (!Guid.TryParse(sessionId, out var sid))
                return Results.BadRequest(new { error = "sessionId is required." });

            filter &= builder.Eq(ar => ar.SessionId, sid);

            // Verify the caller owns the session
            var session = await db.Sessions.Find(s => s.Id == sid && !s.IsDeleted).FirstOrDefaultAsync();
            if (session == null) return Results.NotFound(new { error = "Session not found." });

            if (role == "Engineer" || role == "Admin")
            {
                if (session.EngineerId != userId) return Results.Forbid();
            }
            else if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null || string.IsNullOrEmpty(user.StudentId)) return Results.Forbid();
                var studentInfo = await db.Students.Find(s => s.StudentId == user.StudentId && !s.IsDeleted).FirstOrDefaultAsync();
                if (studentInfo == null || studentInfo.GroupId != session.GroupId) return Results.Forbid();
            }

            if (Guid.TryParse(studentId, out var stid))
                filter &= builder.Eq(ar => ar.StudentId, stid);

            var query = db.AttendanceRecords.Find(filter);
            var records = await query.ToListAsync();

            var studentIds = records.Select(r => r.StudentId).Distinct().ToList();
            var sessionIds = records.Select(r => r.SessionId).Distinct().ToList();

            var students = await db.Students.Find(s => studentIds.Contains(s.Id)).ToListAsync();
            var sessions = await db.Sessions.Find(s => sessionIds.Contains(s.Id)).ToListAsync();

            var studentDict = students.ToDictionary(s => s.Id);
            var sessionDict = sessions.ToDictionary(s => s.Id);

            var result = records.Select(ar =>
            {
                studentDict.TryGetValue(ar.StudentId, out var student);
                sessionDict.TryGetValue(ar.SessionId, out var sess);

                return new
                {
                    id = ar.Id,
                    sessionId = ar.SessionId,
                    studentId = ar.StudentId,
                    studentName = student?.Name,
                    sessionDate = sess?.ScheduledAt,
                    status = ar.Status.ToString(),
                    markedAt = ar.MarkedAt
                };
            }).OrderBy(r => r.studentName).ToList();

            return Results.Ok(result);
        });
    }
}
