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

        // GET /api/attendance?sessionId=&studentId= — get attendance records with filters
        group.MapGet("/", async (MongoService db, string? sessionId, string? studentId) =>
        {
            var builder = Builders<AttendanceRecord>.Filter;
            var filter = builder.Empty;

            if (Guid.TryParse(sessionId, out var sid))
                filter &= builder.Eq(ar => ar.SessionId, sid);

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
                sessionDict.TryGetValue(ar.SessionId, out var session);

                return new
                {
                    id = ar.Id,
                    sessionId = ar.SessionId,
                    studentId = ar.StudentId,
                    studentName = student?.Name,
                    sessionDate = session?.ScheduledAt,
                    status = ar.Status.ToString(),
                    markedAt = ar.MarkedAt
                };
            }).OrderBy(r => r.studentName).ToList();

            return Results.Ok(result);
        });
    }
}
