using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class EngineerEndpoints
{
    public static void Map(WebApplication app)
    {
        // --- Engineer stats ---
        var engineers = app.MapGroup("/api/v1/engineers").RequireAuthorization("AdminOnly");

        // GET /api/engineers â€” list all engineers with stats (Admin only)
        engineers.MapGet("/", async (MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var engineerUsers = await db.Users
                .Find(u => u.Role == UserRole.Engineer && u.IsApproved)
                .ToListAsync();

            var engineerIds = engineerUsers.Select(u => u.Id).ToList();

            var allSessions = await db.Sessions.Find(s => engineerIds.Contains(s.EngineerId) && !s.IsDeleted).ToListAsync();
            var sessionsByEng = allSessions.GroupBy(s => s.EngineerId).ToDictionary(g => g.Key, g => g.ToList());

            var allGroups = await db.Groups.Find(g => engineerIds.Contains(g.EngineerId) && !g.IsDeleted).ToListAsync();
            var groupsByEng = allGroups.GroupBy(g => g.EngineerId).ToDictionary(g => g.Key, g => g.ToList());

            var groupIds = allGroups.Select(g => g.Id).ToList();
            var allStudents = await db.Students.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted).ToListAsync();
            var studentsByGroup = allStudents.GroupBy(s => s.GroupId).ToDictionary(g => g.Key, g => g.Count());

            var engineerList = new List<object>();

            foreach (var u in engineerUsers)
            {
                var userSessions = sessionsByEng.GetValueOrDefault(u.Id, new List<Session>());
                var userGroups = groupsByEng.GetValueOrDefault(u.Id, new List<Group>());
                
                var sessionsCount = userSessions.Count;
                var completedSessions = userSessions.Count(s => s.Status == SessionStatus.Ended);
                var groupsCount = userGroups.Count;
                
                var studentsManaged = userGroups.Sum(g => studentsByGroup.GetValueOrDefault(g.Id, 0));
                
                var lastEndedSession = userSessions
                    .Where(s => s.Status == SessionStatus.Ended)
                    .OrderByDescending(s => s.EndedAt)
                    .FirstOrDefault();

                engineerList.Add(new
                {
                    id = u.Id,
                    name = u.Name,
                    email = u.Email,
                    sessionsCount = sessionsCount,
                    completedSessions = completedSessions,
                    groupsCount = groupsCount,
                    studentsManaged = studentsManaged,
                    lastActive = lastEndedSession?.EndedAt,
                    createdAt = u.CreatedAt
                });
            }

            return Results.Ok(engineerList);
        });

        // GET /api/engineers/{id}/stats â€” detailed stats for one engineer
        engineers.MapGet("/{id:guid}/stats", async (Guid id, MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var engineer = await db.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (engineer == null)
                return Results.NotFound(new { error = "Engineer not found." });

            var sessions = await db.Sessions.Find(s => s.EngineerId == id && !s.IsDeleted).ToListAsync();
            var totalSessions = sessions.Count;
            var completedSessions = sessions.Count(s => s.Status == SessionStatus.Ended);
            var activeSessions = sessions.Count(s => s.Status == SessionStatus.Active);
            
            var groups = await db.Groups.Find(g => g.EngineerId == id && !g.IsDeleted).ToListAsync();
            var groupIds = groups.Select(g => g.Id).ToList();
            var students = await db.Students.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted).ToListAsync();

            var sessionIds = sessions.Where(s => s.Status == SessionStatus.Ended).Select(s => s.Id).ToList();
            var allAttendance = await db.AttendanceRecords.Find(ar => sessionIds.Contains(ar.SessionId)).ToListAsync();
            
            var avgAttendanceRate = allAttendance.Count > 0
                ? (double)allAttendance.Count(ar => ar.Status == AttendanceStatus.Present || ar.Status == AttendanceStatus.Late) / allAttendance.Count * 100.0
                : 0.0;

            return Results.Ok(new
            {
                id = engineer.Id,
                name = engineer.Name,
                email = engineer.Email,
                totalSessions,
                completedSessions,
                activeSessions,
                groupsCount = groups.Count,
                studentsManaged = students.Count,
                averageAttendanceRate = Math.Round(avgAttendanceRate, 1),
                groups = groups.Select(g => new { 
                    id = g.Id, 
                    name = g.Name, 
                    colorTag = g.ColorTag, 
                    studentCount = students.Count(s => s.GroupId == g.Id) 
                }),
                createdAt = engineer.CreatedAt
            });
        });

        // --- Pending engineers ---
        var pending = app.MapGroup("/api/v1/pending").RequireAuthorization("AdminOnly");

        // GET /api/pending â€” list pending registrations (Admin only)
        pending.MapGet("/", async (MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var list = await db.PendingEngineers
                .Find(_ => true)
                .SortByDescending(p => p.RequestedAt)
                .ToListAsync();

            return Results.Ok(list.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                email = p.Email,
                accessCode = p.AccessCode,
                status = p.Status.ToString(),
                requestedAt = p.RequestedAt
            }));
        });

        // PUT /api/pending/{id}/approve — approve engineer
        pending.MapPut("/{id:guid}/approve", async (Guid id, AuthService auth, AuditService audit, HttpContext ctx) =>
        {
            try 
            {
                var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
                if (role != "Admin")
                    return Results.Forbid();

                var (user, error) = await auth.ApproveEngineerAsync(id);
                if (error != null)
                    return Results.BadRequest(new { error });

                // Audit Log with safe claim extraction
                var adminIdClaim = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
                var adminName = ctx.User.FindFirstValue(ClaimTypes.Name) ?? "Admin";

                if (Guid.TryParse(adminIdClaim, out var adminId))
                {
                    await audit.LogActionAsync(adminId, adminName, "Approve Engineer", "User", user!.Id.ToString(), $"Approved {user.Email}");
                }

                return Results.Ok(new
                {
                    message = "Engineer approved.",
                    user = new { id = user!.Id, name = user.Name, email = user.Email }
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 400);
            }
        });

        // PUT /api/pending/{id}/deny — deny engineer
        pending.MapPut("/{id:guid}/deny", async (Guid id, AuthService auth, AuditService audit, HttpContext ctx) =>
        {
            try 
            {
                var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
                if (role != "Admin")
                    return Results.Forbid();

                var (success, error) = await auth.DenyEngineerAsync(id);
                if (error != null)
                    return Results.BadRequest(new { error });

                // Audit Log with safe claim extraction
                var adminIdClaim = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
                var adminName = ctx.User.FindFirstValue(ClaimTypes.Name) ?? "Admin";

                if (Guid.TryParse(adminIdClaim, out var adminId))
                {
                    await audit.LogActionAsync(adminId, adminName, "Deny Engineer", "PendingEngineer", id.ToString(), "Registration rejected");
                }

                return Results.Ok(new { message = "Engineer denied." });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 400);
            }
        });

        // --- Engineer codes ---
        var codes = app.MapGroup("/api/v1/engineer-codes").RequireAuthorization("AdminOnly");

        // GET /api/engineer-codes â€” list all codes
        codes.MapGet("/", async (MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var codeList = await db.EngineerCodes
                .Find(_ => true)
                .SortByDescending(c => c.CreatedAt)
                .ToListAsync();

            // Batch-load users to avoid N+1
            var usedByEngineerIds = codeList.Where(c => c.UsedByEngineerId.HasValue).Select(c => c.UsedByEngineerId!.Value).Distinct().ToList();
            var userMap = (await db.Users.Find(u => usedByEngineerIds.Contains(u.Id)).ToListAsync())
                .ToDictionary(u => u.Id, u => u.Name);

            var result = codeList.Select(c => new
            {
                id = c.Id,
                code = c.Code,
                isUsed = c.IsUsed,
                usedByEngineerName = c.UsedByEngineerId.HasValue && userMap.ContainsKey(c.UsedByEngineerId.Value) ? userMap[c.UsedByEngineerId.Value] : null,
                createdAt = c.CreatedAt
            });

            return Results.Ok(result);
        });

        // POST /api/engineer-codes â€” generate new code
        codes.MapPost("/", async (MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            string code;

            do
            {
                code = new string(Enumerable.Range(0, 8).Select(_ => chars[random.Next(chars.Length)]).ToArray());
            } while (await db.EngineerCodes.Find(c => c.Code == code).AnyAsync());

            var engineerCode = new EngineerCode { Code = code };
            await db.EngineerCodes.InsertOneAsync(engineerCode);

            return Results.Created($"/api/engineer-codes/{engineerCode.Id}", new
            {
                id = engineerCode.Id,
                code = engineerCode.Code,
                isUsed = false
            });
        });

        // DELETE /api/engineer-codes/{id}
        codes.MapDelete("/{id:guid}", async (Guid id, MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var result = await db.EngineerCodes.DeleteOneAsync(c => c.Id == id);
            if (result.DeletedCount == 0)
                return Results.NotFound(new { error = "Code not found." });

            return Results.Ok(new { message = "Code revoked." });
        });
    }
}

