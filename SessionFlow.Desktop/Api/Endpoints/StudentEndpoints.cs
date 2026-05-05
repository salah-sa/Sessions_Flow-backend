using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using SessionFlow.Desktop.Api.Helpers;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using Microsoft.Extensions.Caching.Memory;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class StudentEndpoints
{
    private static MemoryCache _cache = new(new MemoryCacheOptions());

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/v1/students").RequireAuthorization();

        // GET /api/student/dashboard - SSOT for Student UI
        app.MapGet("/api/student/dashboard", async (MongoService db, HttpContext ctx, AuthService auth) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;

            if (!Guid.TryParse(userIdStr, out var userId) || role != "Student")
                return Results.Forbid();

            var cacheKey = $"student_dashboard_{userId}";
            if (_cache.TryGetValue(cacheKey, out object? cached) && cached != null)
                return Results.Ok(cached);

            var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null) return Results.Unauthorized();

            var student = await auth.ResolveStudentForUser(user);
            if (student == null)
            {
                return Results.Ok(new { error = new { code = "NO_GROUP", message = "Student not assigned to a group" } });
            }

            var groupEntity = await db.Groups.Find(g => g.Id == student.GroupId && !g.IsDeleted).FirstOrDefaultAsync();
            if (groupEntity == null)
            {
                return Results.Ok(new { error = new { code = "NO_GROUP", message = "Student group not found" } });
            }

            var engineer = await db.Users.Find(u => u.Id == groupEntity.EngineerId).FirstOrDefaultAsync();

            var nowUtc = DateTime.UtcNow;
            var cairo = TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time");
            var nowCairo = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, cairo);
            var todayStart = nowCairo.Date;
            var todayEnd = todayStart.AddDays(1);

            // Fetch optimized sessions timeline
            var completed = await db.Sessions
                .Find(s => s.GroupId == groupEntity.Id && s.Status == SessionStatus.Ended)
                .SortByDescending(s => s.ScheduledAt)
                .Limit(5)
                .ToListAsync();

            var upcoming = await db.Sessions
                .Find(s => s.GroupId == groupEntity.Id && s.ScheduledAt > nowUtc)
                .SortBy(s => s.ScheduledAt)
                .Limit(5)
                .ToListAsync();

            var totalCount = (int)await db.Sessions.CountDocumentsAsync(s => s.GroupId == groupEntity.Id);
            var completedCount = (int)await db.Sessions.CountDocumentsAsync(s => s.GroupId == groupEntity.Id && s.Status == SessionStatus.Ended);
            
            var timeline = completed
                .Concat(upcoming)
                .OrderBy(s => s.ScheduledAt)
                .ToList();

            var todaySession = upcoming.FirstOrDefault(s => 
            {
                var sCairo = TimeZoneInfo.ConvertTimeFromUtc(s.ScheduledAt.UtcDateTime, cairo);
                return sCairo >= todayStart && sCairo < todayEnd;
            });

            var nextSession = upcoming.FirstOrDefault(s => s.Id != todaySession?.Id);

            var missed = await db.Sessions
                .Find(s => s.GroupId == groupEntity.Id && s.ScheduledAt < nowUtc && s.Status == SessionStatus.Scheduled)
                .SortByDescending(s => s.ScheduledAt)
                .FirstOrDefaultAsync();

            object? primaryAction = null;

            if (missed != null)
            {
                primaryAction = new {
                    type = "missed",
                    label = $"You missed session #{missed.SessionNumber}",
                    priority = 1
                };
            }
            else if (groupEntity.Status == GroupStatus.Completed)
            {
                primaryAction = new { type = "completed", label = "Course Complete 🎓", priority = 4 };
            }
            else if (todaySession != null)
            {
                primaryAction = new {
                    type = "session_today",
                    label = $"You have a session today at {TimeZoneInfo.ConvertTimeFromUtc(todaySession.ScheduledAt.UtcDateTime, cairo):h:mm tt}",
                    priority = 2
                };
            }
            else if (nextSession != null)
            {
                primaryAction = new {
                    type = "next_session",
                    label = $"Next session on {TimeZoneInfo.ConvertTimeFromUtc(nextSession.ScheduledAt.UtcDateTime, cairo):MMM dd}",
                    priority = 3
                };
            }
            else
            {
                primaryAction = new { type = "none", label = "No upcoming sessions", priority = 5 };
            }

            var result = new
            {
                identity = new
                {
                    studentId = student.StudentId,
                    name = student.Name,
                    groupName = groupEntity.Name,
                    groupId = groupEntity.Id,
                    groupStatus = groupEntity.Status.ToString(),
                    level = groupEntity.Level,
                    engineerName = engineer?.Name,
                    avatarUrl = user.AvatarUrl,
                    latitude = user.Latitude,
                    longitude = user.Longitude,
                    city = user.City,
                    groupScheduleTime = groupEntity.ParsedTime
                },
                todaySession = todaySession == null ? null : new { id = todaySession.Id, number = todaySession.SessionNumber, status = todaySession.Status.ToString(), scheduledAt = todaySession.ScheduledAt },
                nextSession = nextSession == null ? null : new { id = nextSession.Id, number = nextSession.SessionNumber, status = nextSession.Status.ToString(), scheduledAt = nextSession.ScheduledAt },
                progress = new
                {
                    completed = completedCount,
                    total = totalCount,
                    remaining = Math.Max(0, totalCount - completedCount),
                    percentage = totalCount > 0 ? (double)completedCount / totalCount * 100 : 0
                },
                timeline = timeline.Select(s => new { id = s.Id, number = s.SessionNumber, status = s.Status.ToString(), scheduledAt = s.ScheduledAt }).ToList(),
                primaryAction = primaryAction,
                error = (object?)null
            };

            _cache.Set(cacheKey, result, TimeSpan.FromSeconds(5));

            return Results.Ok(result);
        }).RequireAuthorization();

        // GET /api/students — list all students with search/filter
        group.MapGet("/", async (MongoService db, HttpContext ctx, 
            int? page, int? pageSize, string? search, string? groupId) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var builder = Builders<Student>.Filter;
            var filter = builder.Eq(s => s.IsDeleted, false);

            if (role == "Engineer" || role == "Admin")
            {
                // Zero-Trust: both Engineer AND Admin only see students in their own groups
                var myGroups = await db.Groups.Find(g => g.EngineerId == userId && !g.IsDeleted).ToListAsync();
                var myGroupIds = myGroups.Select(g => g.Id).ToList();
                if (myGroupIds.Count == 0)
                    return Results.Ok(PaginationHelper.Envelope(new List<object>(), 0, page ?? 1, pageSize ?? 20));
                filter &= builder.In(s => s.GroupId, myGroupIds);
            }
            else if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user != null && !string.IsNullOrEmpty(user.StudentId))
                {
                    filter &= builder.Eq(s => s.StudentId, user.StudentId);
                }
                else
                {
                    return Results.Ok(PaginationHelper.Envelope(new List<object>(), 0, page ?? 1, pageSize ?? 20));
                }
            }

            if (!string.IsNullOrWhiteSpace(search))
                filter &= builder.Regex(s => s.Name, new MongoDB.Bson.BsonRegularExpression(search.Trim(), "i"));

            if (Guid.TryParse(groupId, out var gid))
                filter &= builder.Eq(s => s.GroupId, gid);

            var (skip, take) = PaginationHelper.Normalize(page, pageSize);
            var totalCount = await db.Students.CountDocumentsAsync(filter);

            var students = await db.Students
                .Find(filter)
                .SortBy(s => s.Name)
                .Skip(skip)
                .Limit(take)
                .ToListAsync();

            var studentIds = students.Select(s => s.Id).ToList();
            var groupIds = students.Select(s => s.GroupId).Distinct().ToList();

            var groups = await db.Groups.Find(g => groupIds.Contains(g.Id)).ToListAsync();
            var groupDict = groups.ToDictionary(g => g.Id);

            var allRecords = await db.AttendanceRecords.Find(ar => studentIds.Contains(ar.StudentId)).ToListAsync();
            var recordsDict = allRecords.GroupBy(ar => ar.StudentId).ToDictionary(g => g.Key, g => g.ToList());

            var result = new List<object>();
            foreach (var s in students)
            {
                groupDict.TryGetValue(s.GroupId, out var g);
                var records = recordsDict.GetValueOrDefault(s.Id, new List<AttendanceRecord>());
                
                var lastActive = records
                    .OrderByDescending(ar => ar.MarkedAt)
                    .Select(ar => (DateTimeOffset?)ar.MarkedAt)
                    .FirstOrDefault();

                result.Add(new
                {
                    id = s.Id,
                    name = s.Name,
                    studentId = s.StudentId,
                    uniqueStudentCode = s.UniqueStudentCode,
                    groupId = s.GroupId,
                    userId = s.UserId,
                    group = g != null ? new { name = g.Name, colorTag = g.ColorTag, level = g.Level } : null,
                    groupName = g?.Name,
                    groupColorTag = g?.ColorTag,
                    totalSessions = records.Count,
                    presentCount = records.Count(ar => ar.Status == AttendanceStatus.Present),
                    lateCount = records.Count(ar => ar.Status == AttendanceStatus.Late),
                    attendanceRate = records.Count > 0
                        ? (double)(records.Count(ar => ar.Status == AttendanceStatus.Present || ar.Status == AttendanceStatus.Late))
                            / records.Count * 100.0
                        : 0.0,
                    lastActive = lastActive,
                    isDeleted = s.IsDeleted,
                    createdAt = s.CreatedAt,
                    updatedAt = s.UpdatedAt
                });
            }

            return Results.Ok(PaginationHelper.Envelope(result, totalCount, page ?? 1, take));
        });

        // GET /api/students/{id} — student detail
        group.MapGet("/{id:guid}", async (Guid id, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var student = await db.Students.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (student == null)
                return Results.NotFound(new { error = "Student not found." });

            // Zero-Trust: verify ownership through group chain for both Engineer and Admin
            if (role == "Engineer" || role == "Admin")
            {
                var gOwner = await db.Groups.Find(g => g.Id == student.GroupId).FirstOrDefaultAsync();
                if (gOwner == null || gOwner.EngineerId != userId)
                    return Results.Forbid();
            }
            else if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null || user.StudentId != student.StudentId)
                    return Results.Forbid();
            }

            var g = await db.Groups.Find(x => x.Id == student.GroupId).FirstOrDefaultAsync();

            return Results.Ok(new
            {
                id = student.Id,
                name = student.Name,
                studentId = student.StudentId,
                uniqueStudentCode = student.UniqueStudentCode,
                groupId = student.GroupId,
                userId = student.UserId,
                groupName = g?.Name,
                groupColorTag = g?.ColorTag,
                createdAt = student.CreatedAt
            });
        });

        // PUT /api/students/{id}
        group.MapPut("/{id:guid}", async (Guid id, UpdateStudentRequest req, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var student = await db.Students.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (student == null)
                return Results.NotFound(new { error = "Student not found." });

            // Zero-Trust: both Engineer AND Admin must own the student's group
            var gOwner = await db.Groups.Find(g => g.Id == student.GroupId).FirstOrDefaultAsync();
            if (gOwner == null || gOwner.EngineerId != userId)
                return Results.Forbid();

            var update = Builders<Student>.Update.Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);

            if (!string.IsNullOrWhiteSpace(req.Name))
                update = update.Set(s => s.Name, req.Name.Trim());

            if (req.GroupId.HasValue && req.GroupId.Value != student.GroupId)
            {
                var newGroup = await db.Groups.Find(g => g.Id == req.GroupId.Value).FirstOrDefaultAsync();
                if (newGroup == null)
                    return Results.BadRequest(new { error = "Target group not found." });

                // Zero-Trust: target group must also belong to the same engineer
                if (newGroup.EngineerId != userId)
                    return Results.Forbid();

                var activeStudents = (int)await db.Students.CountDocumentsAsync(s => s.GroupId == req.GroupId.Value && !s.IsDeleted && s.Id != id);
                var maxStudents = CurriculumConstants.GetMaxStudents(newGroup.Level);
                if (activeStudents >= maxStudents)
                    return Results.BadRequest(new { error = $"Target group is full. Maximum {maxStudents} students for Level {newGroup.Level}." });

                update = update.Set(s => s.GroupId, req.GroupId.Value);
            }

            await db.Students.UpdateOneAsync(s => s.Id == id, update);
            return Results.Ok(new { id = student.Id, name = req.Name ?? student.Name, groupId = req.GroupId ?? student.GroupId });
        });

        // DELETE /api/students/{id}
        group.MapDelete("/{id:guid}", async (Guid id, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            // Zero-Trust: verify student belongs to caller's group before deleting
            var student = await db.Students.Find(s => s.Id == id && !s.IsDeleted).FirstOrDefaultAsync();
            if (student == null) return Results.NotFound(new { error = "Student not found." });

            var gOwner = await db.Groups.Find(g => g.Id == student.GroupId).FirstOrDefaultAsync();
            if (gOwner == null || gOwner.EngineerId != userId) return Results.Forbid();

            var update = Builders<Student>.Update
                .Set(s => s.IsDeleted, true)
                .Set(s => s.DeletedAt, DateTimeOffset.UtcNow)
                .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);
            
            var result = await db.Students.UpdateOneAsync(s => s.Id == id, update);
            if (result.MatchedCount == 0) return Results.NotFound(new { error = "Student not found." });

            return Results.Ok(new { message = "Student deleted." });
        });

        // GET /api/students/{id}/attendance
        group.MapGet("/{id:guid}/attendance", async (Guid id, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var student = await db.Students.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (student == null)
                return Results.NotFound(new { error = "Student not found." });

            // Zero-Trust: verify ownership through group chain
            if (role == "Engineer" || role == "Admin")
            {
                var gOwner = await db.Groups.Find(g => g.Id == student.GroupId).FirstOrDefaultAsync();
                if (gOwner == null || gOwner.EngineerId != userId)
                    return Results.Forbid();
            }
            else if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null || user.StudentId != student.StudentId)
                    return Results.Forbid();
            }

            var records = await db.AttendanceRecords.Find(ar => ar.StudentId == id).ToListAsync();
            
            // Fix N+1 Query: Batch load sessions entirely instead of looping db.Sessions.Find
            var sessionIds = records.Select(ar => ar.SessionId).Distinct().ToList();
            var sessions = await db.Sessions.Find(s => sessionIds.Contains(s.Id)).ToListAsync();
            var sessionDict = sessions.ToDictionary(s => s.Id);
            
            // Fix N+1 Query: Batch load groups entirely instead of looping db.Groups.Find
            var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
            var groups = await db.Groups.Find(g => groupIds.Contains(g.Id)).ToListAsync();
            var groupDict = groups.ToDictionary(g => g.Id);

            var list = new List<object>();
            foreach (var ar in records)
            {
                if (!sessionDict.TryGetValue(ar.SessionId, out var session)) continue;

                groupDict.TryGetValue(session.GroupId, out var g);
                list.Add(new
                {
                    id = ar.Id,
                    sessionId = ar.SessionId,
                    sessionDate = session.ScheduledAt,
                    groupName = g?.Name,
                    status = ar.Status.ToString(),
                    markedAt = ar.MarkedAt
                });
            }

            var sortedList = list.OrderByDescending(r => ((dynamic)r).sessionDate).ToList();

            var total = sortedList.Count;
            var present = sortedList.Count(r => ((dynamic)r).status == "Present");
            var late = sortedList.Count(r => ((dynamic)r).status == "Late");
            var absent = sortedList.Count(r => ((dynamic)r).status == "Absent");
            var rate = total > 0 ? (double)(present + late) / total * 100.0 : 0.0;

            return Results.Ok(new
            {
                studentId = id,
                studentName = student.Name,
                totalSessions = total,
                presentCount = present,
                lateCount = late,
                absentCount = absent,
                attendanceRate = Math.Round(rate, 1),
                records = sortedList
            });
        });

        // PUT /api/student/location - Update any user's geo-coordinates
        app.MapPut("/api/student/location", async (UpdateLocationRequest req, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!Guid.TryParse(userIdStr, out var userId))
                return Results.Forbid();

            var update = Builders<User>.Update
                .Set(u => u.City, req.City?.Trim())
                .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);

            if (req.Lat.HasValue && req.Lng.HasValue)
            {
                update = update.Set(u => u.Latitude, req.Lat.Value)
                               .Set(u => u.Longitude, req.Lng.Value);
            }

            var result = await db.Users.UpdateOneAsync(u => u.Id == userId, update);
            if (result.MatchedCount == 0) return Results.NotFound();

            return Results.Ok();
        }).RequireAuthorization();

        // GET /api/students/locations - Get scoped user locations for the world map
        app.MapGet("/api/students/locations", async (MongoService db, IPresenceService presence, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            // Zero-Trust: engineers/admins only see locations of users in their own groups
            List<Guid> allowedUserIds = new();
            if (role == "Engineer" || role == "Admin")
            {
                var myGroups = await db.Groups.Find(g => g.EngineerId == userId && !g.IsDeleted).ToListAsync();
                var myGroupIds = myGroups.Select(g => g.Id).ToList();
                var myStudents = await db.Students.Find(s => myGroupIds.Contains(s.GroupId) && s.UserId != null && !s.IsDeleted).ToListAsync();
                allowedUserIds = myStudents.Where(s => s.UserId.HasValue).Select(s => s.UserId!.Value).ToList();
                allowedUserIds.Add(userId); // also include themselves
            }
            else if (role == "Student")
            {
                allowedUserIds.Add(userId); // students only see themselves
            }

            var usersWithLocation = await db.Users
                .Find(u => u.Latitude != null && u.Longitude != null && allowedUserIds.Contains(u.Id))
                .ToListAsync();

            if (!usersWithLocation.Any()) return Results.Ok(new List<object>());

            var onlineUserIds = presence.GetOnlineUserIds().ToHashSet();

            var userIds = usersWithLocation.Select(u => u.Id).ToList();
            var studentDocs = await db.Students.Find(s => s.UserId != null && userIds.Contains(s.UserId.Value)).ToListAsync();
            var studentDict = studentDocs.ToDictionary(s => s.UserId!.Value);

            var groupIds = studentDocs.Select(s => s.GroupId).Distinct().ToList();
            var groups = await db.Groups.Find(g => groupIds.Contains(g.Id)).ToListAsync();
            var groupDict = groups.ToDictionary(g => g.Id);

            var result = usersWithLocation.Select(u => 
            {
                int level = 1;
                if (studentDict.TryGetValue(u.Id, out var s) && groupDict.TryGetValue(s.GroupId, out var g))
                {
                    level = g.Level;
                }

                return new {
                    id = u.Id,
                    name = u.Name,
                    lat = u.Latitude,
                    lng = u.Longitude,
                    city = u.City,
                    level = level,
                    role = u.Role.ToString().ToLower(),
                    avatarUrl = AuthEndpoints.ResolveAvatarUrl(u.AvatarUrl, ctx.Request),
                    isOnline = onlineUserIds.Contains(u.Id.ToString())
                };
            }).ToList();

            return Results.Ok(result);
        }).RequireAuthorization();
    }

    public record UpdateStudentRequest(string? Name, Guid? GroupId);
    public record UpdateLocationRequest(double? Lat, double? Lng, string? City);
}

