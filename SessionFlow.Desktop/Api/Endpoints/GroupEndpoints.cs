using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using SessionFlow.Desktop.Api.Helpers;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class GroupEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/groups").RequireAuthorization();

        // GET /api/groups — list all groups with student count and schedule
        group.MapGet("/", async (MongoService db, HttpContext ctx, AuthService auth, SessionFlow.Desktop.Services.MultiTenancy.ITenantProvider tenantProvider,
            int? page, int? pageSize, string? search, string? status) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var builder = Builders<Group>.Filter;
            var filter = builder.Eq(g => g.IsDeleted, false);

            if (role == "Engineer" || role == "Admin")
            {
                var tenantFilter = await tenantProvider.GetTenantFilterAsync<Group>(db);
                filter &= tenantFilter;
            }
            else if (role == "Student")
            {
                // Use global resolver for consistent StudentId/UniqueStudentCode matching
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user != null)
                {
                    var studentInfos = await auth.ResolveAllStudentsForUser(user);
                    if (studentInfos != null && studentInfos.Any())
                    {
                        var studentGroupIds = studentInfos.Select(s => s.GroupId).ToList();
                        filter &= builder.In(g => g.Id, studentGroupIds);
                    }
                    else
                    {
                        return Results.Ok(PaginationHelper.Envelope(new List<object>(), 0, page ?? 1, pageSize ?? 20)); // No group found
                    }
                }
                else
                {
                    return Results.Ok(PaginationHelper.Envelope(new List<object>(), 0, page ?? 1, pageSize ?? 20));
                }
            }
            // Admin sees all
            
            // Add search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                filter &= builder.Regex(g => g.Name, new BsonRegularExpression(search.Trim(), "i"));
            }

            // Add status filter
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<GroupStatus>(status, true, out var st))
            {
                filter &= builder.Eq(g => g.Status, st);
            }
            
            var (skip, take) = PaginationHelper.Normalize(page, pageSize);
            var totalCount = await db.Groups.CountDocumentsAsync(filter);

            var groups = await db.Groups.Find(filter)
                .SortBy(g => g.Name)
                .Skip(skip)
                .Limit(take)
                .ToListAsync();

            var engineerIds = groups.Select(g => g.EngineerId).Distinct().ToList();
            var engineers = await db.Users.Find(u => engineerIds.Contains(u.Id)).ToListAsync();
            var engDict = engineers.ToDictionary(e => e.Id);

            var groupIds = groups.Select(g => g.Id).ToList();
            var allSchedules = await db.GroupSchedules.Find(s => groupIds.Contains(s.GroupId)).ToListAsync();
            var schedulesDict = allSchedules.GroupBy(s => s.GroupId).ToDictionary(g => g.Key, g => g.ToList());

            var allStudents = await db.Students.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted).ToListAsync();
            var studentCountDict = allStudents
                .GroupBy(s => s.GroupId)
                .ToDictionary(
                    g => g.Key, 
                    g => g.GroupBy(s => s.Name.ToLower().Trim()).Count()
                );

            var allSessions = await db.Sessions.Find(s => groupIds.Contains(s.GroupId) && !s.IsDeleted).ToListAsync();
            var sessionsDict = allSessions.GroupBy(s => s.GroupId).ToDictionary(g => g.Key, g => g.ToList());

            var result = new List<object>();

            foreach (var g in groups)
            {
                engDict.TryGetValue(g.EngineerId, out var engineer);
                var groupSchedules = schedulesDict.GetValueOrDefault(g.Id, new List<GroupSchedule>());
                var studentCount = studentCountDict.GetValueOrDefault(g.Id, 0);
                var groupSessions = sessionsDict.GetValueOrDefault(g.Id, new List<Session>());
                
                var nextSession = groupSessions
                    .Where(s => s.Status == SessionStatus.Scheduled && s.ScheduledAt > DateTimeOffset.UtcNow)
                    .OrderBy(s => s.ScheduledAt)
                    .Select(s => (DateTimeOffset?)s.ScheduledAt)
                    .FirstOrDefault();

                result.Add(new
                {
                    id = g.Id,
                    name = g.Name,
                    description = g.Description,
                    level = g.Level,
                    colorTag = g.ColorTag,
                    engineerId = g.EngineerId,
                    engineerName = engineer?.Name,
                    studentCount = studentCount,
                    schedules = groupSchedules.Select(s => new
                    {
                        id = s.Id,
                        dayOfWeek = s.DayOfWeek,
                        startTime = s.StartTime.ToString(@"hh\:mm"),
                        durationMinutes = s.DurationMinutes
                    }),
                    nextSession = nextSession,
                    status = g.Status.ToString(),
                    completedAt = g.CompletedAt,
                    currentSessionNumber = g.CurrentSessionNumber,
                    totalSessions = g.TotalSessions,
                    startingSessionNumber = g.StartingSessionNumber,
                    numberOfStudents = g.NumberOfStudents,
                    completedSessions = groupSessions.Count(s => s.Status == SessionStatus.Ended),
                    createdAt = g.CreatedAt
                });
            }

            return Results.Ok(PaginationHelper.Envelope(result, totalCount, page ?? 1, take));
        });

        // GET /api/groups/{id} — get detailed group info
        group.MapGet("/{id:guid}", async (Guid id, MongoService db, HttpContext ctx, AuthService auth, SessionFlow.Desktop.Services.MultiTenancy.ITenantProvider tenantProvider) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var builder = Builders<Group>.Filter;
            var filter = builder.Eq(g => g.Id, id) & builder.Eq(g => g.IsDeleted, false);

            if (role == "Engineer" || role == "Admin")
            {
                var tenantFilter = await tenantProvider.GetTenantFilterAsync<Group>(db);
                filter &= tenantFilter;
            }
            else if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return Results.Forbid();
                var studentInfos = await auth.ResolveAllStudentsForUser(user);
                if (studentInfos == null || !studentInfos.Any(s => s.GroupId == id)) return Results.Forbid();
            }

            var g = await db.Groups.Find(filter).FirstOrDefaultAsync();
            if (g == null) return Results.NotFound(new { error = "Group not found." });

            var engineer = await db.Users.Find(u => u.Id == g.EngineerId).FirstOrDefaultAsync();
            var schedules = await db.GroupSchedules.Find(s => s.GroupId == g.Id).ToListAsync();
            
            // Deduplicate to get the true unique student count
            var allRawStudents = await db.Students.Find(s => s.GroupId == g.Id && !s.IsDeleted).ToListAsync();
            var uniqueStudents = allRawStudents
                .GroupBy(s => s.Name.ToLower().Trim())
                .Select(group => group.OrderByDescending(s => s.UserId != null).ThenByDescending(s => s.CreatedAt).First())
                .ToList();
            
            var studentCount = uniqueStudents.Count;
            
            var groupSessions = await db.Sessions.Find(s => s.GroupId == g.Id && !s.IsDeleted).ToListAsync();
            var completedSessionsCount = groupSessions.Count(s => s.Status == SessionStatus.Ended);

            // All authenticated members of this group can see the member list
            // (security check at lines 155-163 already validates membership)
            var studentsList = uniqueStudents;

            return Results.Ok(new
            {
                id = g.Id,
                name = g.Name,
                description = g.Description,
                level = g.Level,
                colorTag = g.ColorTag,
                engineerId = g.EngineerId,
                engineerName = engineer?.Name,
                engineer = engineer != null ? new { id = engineer.Id, name = engineer.Name, role = engineer.Role.ToString(), avatarUrl = AuthEndpoints.ResolveAvatarUrl(engineer.AvatarUrl, ctx.Request) } : null,
                students = studentsList.Select(s => new
                {
                    id = s.Id,
                    name = s.Name,
                    groupId = s.GroupId,
                    studentId = s.StudentId,
                    uniqueStudentCode = s.UniqueStudentCode,
                    userId = s.UserId,
                    createdAt = s.CreatedAt
                }),
                studentCount = studentCount,
                schedules = schedules.Select(s => new
                {
                    id = s.Id,
                    dayOfWeek = s.DayOfWeek,
                    startTime = s.StartTime.ToString(@"hh\:mm"),
                    durationMinutes = s.DurationMinutes
                }),
                status = g.Status.ToString(),
                currentSessionNumber = g.CurrentSessionNumber,
                totalSessions = g.TotalSessions,
                completedSessions = completedSessionsCount,
                createdAt = g.CreatedAt
            });
        });

        // GET /api/groups/check-name?name=XYZ&excludeId=GUID — check if name is available
        group.MapGet("/check-name", async (string name, Guid? excludeId, MongoService db) =>
        {
            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new { available = false, error = "Name is required." });

            var filter = Builders<Group>.Filter.Eq(g => g.Name, name.Trim()) & Builders<Group>.Filter.Eq(g => g.IsDeleted, false);
            if (excludeId.HasValue)
                filter &= Builders<Group>.Filter.Ne(g => g.Id, excludeId.Value);

            var exists = await db.Groups.Find(filter).AnyAsync();
            return Results.Ok(new { available = !exists });
        });

        // POST /api/groups — create group + auto-generate sessions
        group.MapPost("/", async (CreateGroupRequest req, MongoService db, SessionService sessionService, HttpContext ctx, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus, SessionFlow.Desktop.Services.MultiTenancy.ITenantProvider tenantProvider) =>
        {
            try
            {
                var tenantId = tenantProvider.GetCurrentTenantId();
                if (tenantId == null) return Results.Unauthorized();
                var engineerId = tenantId.Value;

                if (string.IsNullOrWhiteSpace(req.Name))
                    return Results.BadRequest(new { error = "Group name is required." });

                var exists = await db.Groups.Find(g => g.Name == req.Name.Trim() && !g.IsDeleted).AnyAsync();
                if (exists)
                    return Results.Conflict(new { error = "A group with this name already exists." });

                // ─── B.2: GROUP COUNT LIMIT ENFORCEMENT ──────────────────────
                var engineer = await db.Users.Find(u => u.Id == engineerId).FirstOrDefaultAsync();
                if (engineer != null)
                {
                    var currentGroupCount = (int)await db.Groups.CountDocumentsAsync(g => g.EngineerId == engineerId && !g.IsDeleted);
                    var maxGroups = PlanLimit.GetMaxGroups(engineer.SubscriptionTier);
                    if (currentGroupCount >= maxGroups)
                    {
                        return Results.Json(new
                        {
                            error = $"Group limit reached ({maxGroups} groups on your {engineer.SubscriptionTier} plan). Upgrade your plan to create more groups.",
                            code = "GROUP_LIMIT_REACHED",
                            limit = maxGroups,
                            current = currentGroupCount,
                            tier = engineer.SubscriptionTier.ToString()
                        }, statusCode: 403);
                    }
                }
                // ──────────────────────────────────────────────────────────────

                if (req.Level < 1 || req.Level > 4)
                    return Results.BadRequest(new { error = "Level must be between 1 and 4." });

                // HARDENED VALIDATION: Prevent 0 or negative student slots
                if (req.NumberOfStudents <= 0)
                    return Results.BadRequest(new { error = "Number of students must be at least 1." });

                // HARDENED VALIDATION
                int maxStudents = CurriculumConstants.GetMaxStudents(req.Level);
                int totalSessions = CurriculumConstants.GetTotalSessions(req.Level);

                if (req.NumberOfStudents > maxStudents)
                   return Results.BadRequest(new { error = $"Security Restriction: Max students for Level {req.Level} is {maxStudents}." });

                if (req.StartingSessionNumber > totalSessions)
                   return Results.BadRequest(new { error = $"Security Restriction: Starting session number cannot exceed {totalSessions} for Level {req.Level}." });

                if (req.Frequency < 1 || req.Frequency > 3)
                    return Results.BadRequest(new { error = "Frequency must be between 1 and 3 times per week." });

                if (req.Schedules == null || req.Schedules.Count != req.Frequency)
                    return Results.BadRequest(new { error = $"Strict Rule: Must define exactly {req.Frequency} schedule slot(s) for Frequency={req.Frequency}." });

                int startingNum = req.StartingSessionNumber > 0 ? req.StartingSessionNumber : 1;

                // 1. Prepare and Validate Schedules
                var schedules = new List<GroupSchedule>();
                foreach (var sched in req.Schedules)
                {
                    if (string.IsNullOrWhiteSpace(sched.StartTime) || !TimeSpan.TryParse(sched.StartTime, out var parsedTime))
                        return Results.BadRequest(new { error = $"Invalid StartTime format provided: {sched.StartTime}" });

                    schedules.Add(new GroupSchedule
                    {
                        // Id will be generated, GroupId set after group insert
                        DayOfWeek = sched.DayOfWeek,
                        StartTime = parsedTime,
                        DurationMinutes = sched.DurationMinutes > 0 ? sched.DurationMinutes : 60
                    });
                }

                // 2. Prepare and Validate Cadets
                var studentsToInsert = new List<Student>();
                if (req.Cadets != null)
                {
                    foreach (var cadet in req.Cadets)
                    {
                        if (string.IsNullOrWhiteSpace(cadet.Name)) continue;
                        studentsToInsert.Add(new Student
                        {
                            Name = cadet.Name.Trim(),
                            StudentId = null, // System generated
                        });
                    }
                }

                // 3. Database Writes (Atomic Transaction)
                using var session = await db.Client.StartSessionAsync();
                session.StartTransaction();

                try
                {
                    var newGroup = new Group
                    {
                        Id = Guid.NewGuid(),
                        Name = req.Name.Trim(),
                        Description = req.Description?.Trim() ?? "",
                        Level = req.Level,
                        ColorTag = req.ColorTag ?? "blue",
                        EngineerId = engineerId,
                        NumberOfStudents = req.NumberOfStudents,
                        StartingSessionNumber = startingNum,
                        CurrentSessionNumber = startingNum,
                        TotalSessions = totalSessions,
                        Frequency = req.Frequency,
                        Status = GroupStatus.Active,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };

                    // Link children to the new group ID
                    foreach (var s in schedules) s.GroupId = newGroup.Id;
                    foreach (var s in studentsToInsert) 
                    {
                        s.GroupId = newGroup.Id;
                        s.UniqueStudentCode = Student.GenerateCode(s.Name, newGroup.Id);
                    }

                    // Execute all insertions WITHIN transaction
                    await db.Groups.InsertOneAsync(session, newGroup);
                    if (schedules.Count > 0) await db.GroupSchedules.InsertManyAsync(session, schedules);
                    if (studentsToInsert.Count > 0) await db.Students.InsertManyAsync(session, studentsToInsert);

                    await session.CommitTransactionAsync();

                    // 4. Post-Commit Operations (Non-Atomic with Group Creation)
                    // We generate sessions OUTSIDE the main transaction to prevent timeouts or heavy 
                    // calculation/write errors from rolling back a successfully created group.
                    // If this fails, the group is still created and sessions can be regenerated later.
                    try
                    {
                        await sessionService.AutoGenerateSessionsAsync(newGroup, null);
                    }
                    catch (Exception ex)
                    {
                        // LOG error but do NOT fail the group creation response.
                        // This prevents the "Failed to create group" false-error reported by users.
                        Serilog.Log.Error(ex, "Failed to auto-generate sessions for new group {GroupId} after commit", newGroup.Id);
                    }

                    // Return full object to satisfy frontend expectations
                    var responseData = new
                    {
                        id = newGroup.Id,
                        name = newGroup.Name,
                        description = newGroup.Description,
                        level = newGroup.Level,
                        colorTag = newGroup.ColorTag,
                        engineerId = newGroup.EngineerId,
                        status = newGroup.Status.ToString(),
                        studentCount = studentsToInsert.Count,
                        totalSessions = newGroup.TotalSessions,
                        currentSessionNumber = newGroup.CurrentSessionNumber,
                        schedules = schedules.Select(s => new {
                            id = s.Id,
                            dayOfWeek = s.DayOfWeek,
                            startTime = s.StartTime.ToString(@"hh\:mm"),
                            durationMinutes = s.DurationMinutes
                        }),
                        students = studentsToInsert.Select(s => new {
                            id = s.Id,
                            name = s.Name,
                            groupId = s.GroupId,
                            studentId = s.StudentId,
                            uniqueStudentCode = s.UniqueStudentCode
                        })
                    };

                    await eventBus.PublishAsync(SessionFlow.Desktop.Services.EventBus.Events.GroupCreated, SessionFlow.Desktop.Services.EventBus.EventTargetType.All, "", responseData);

                    return Results.Created($"/api/groups/{newGroup.Id}", responseData);
                }
                catch (Exception ex)
                {
                    await session.AbortTransactionAsync();
                    // Log the detailed error but return a clean JSON for the frontend
                    return Results.Json(new { 
                        error = "Failed to create group. Please check your data and try again.", 
                        detail = ex.Message 
                    }, statusCode: 500);
                }
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "Internal server error occurred.", detail = ex.Message }, statusCode: 500);
            }
        });

        // PUT /api/groups/{id} — update group info
        group.MapPut("/{id:guid}", async (Guid id, UpdateGroupRequest req, MongoService db, SessionService sessionService, HttpContext ctx, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus, SessionFlow.Desktop.Services.MultiTenancy.ITenantProvider tenantProvider) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            var g = await db.Groups.Find(x => x.Id == id).FirstOrDefaultAsync();
            if (g == null) return Results.NotFound(new { error = "Group not found." });

            if (role != "Admin" && g.EngineerId != tenantId.Value)
                return Results.Forbid();

            var update = Builders<Group>.Update.Set(x => x.UpdatedAt, DateTimeOffset.UtcNow);

            if (!string.IsNullOrWhiteSpace(req.Name))
            {
                var nameExists = await db.Groups.Find(x => x.Name == req.Name.Trim() && x.Id != id && !x.IsDeleted).AnyAsync();
                if (nameExists)
                    return Results.Conflict(new { error = "A group with this name already exists." });
                update = update.Set(x => x.Name, req.Name.Trim());
            }

            if (req.Description != null) update = update.Set(x => x.Description, req.Description.Trim());
            if (req.ColorTag != null) update = update.Set(x => x.ColorTag, req.ColorTag);
            if (req.Level.HasValue && req.Level >= 1 && req.Level <= 4) update = update.Set(x => x.Level, req.Level.Value);
            if (req.NumberOfStudents.HasValue) 
             {
                if (req.NumberOfStudents.Value <= 0)
                    return Results.BadRequest(new { error = "Number of students must be at least 1." });
                var level = req.Level ?? g.Level;
                var max = CurriculumConstants.GetMaxStudents(level);
                if (req.NumberOfStudents > max) return Results.BadRequest(new { error = $"Security Restriction: Max students for Level {level} is {max}." });
                update = update.Set(x => x.NumberOfStudents, req.NumberOfStudents.Value);
             }

            if (req.StartingSessionNumber.HasValue)
            {
                var level = req.Level ?? g.Level;
                var total = CurriculumConstants.GetTotalSessions(level);
                if (req.StartingSessionNumber > total) return Results.BadRequest(new { error = $"Security Restriction: Starting session number cannot exceed {total} for Level {level}." });
                update = update.Set(x => x.StartingSessionNumber, req.StartingSessionNumber.Value);
                
                // Sync CurrentSessionNumber if it hasn't progressed past the new start
                if (g.CurrentSessionNumber < req.StartingSessionNumber.Value)
                {
                    update = update.Set(x => x.CurrentSessionNumber, req.StartingSessionNumber.Value);
                }
            }
            
            if (req.Frequency.HasValue && req.Frequency >= 1 && req.Frequency <= 3)
                update = update.Set(x => x.Frequency, req.Frequency.Value);

            var strictTotal = CurriculumConstants.GetTotalSessions(req.Level ?? g.Level);
            update = update.Set(x => x.TotalSessions, strictTotal);

            await db.Groups.UpdateOneAsync(x => x.Id == id, update);

            // AUTO-REGENERATE if schedule-impacting fields changed
            if (req.Frequency.HasValue || req.Level.HasValue || req.Schedules != null || req.StartingSessionNumber.HasValue)
            {
                var finalGroup = await db.Groups.Find(x => x.Id == id).FirstOrDefaultAsync();
                if (finalGroup != null)
                {
                    // If schedules were provided in the same PUT, update them first
                    if (req.Schedules != null)
                    {
                        await db.GroupSchedules.DeleteManyAsync(s => s.GroupId == id);
                        var newSchedules = new List<GroupSchedule>();
                        foreach (var sched in req.Schedules)
                        {
                            if (string.IsNullOrWhiteSpace(sched.StartTime) || !TimeSpan.TryParse(sched.StartTime, out var parsedTime))
                                return Results.BadRequest(new { error = $"Invalid StartTime format provided: {sched.StartTime}" });

                            newSchedules.Add(new GroupSchedule
                            {
                                GroupId = id,
                                DayOfWeek = sched.DayOfWeek,
                                StartTime = parsedTime,
                                DurationMinutes = sched.DurationMinutes > 0 ? sched.DurationMinutes : 60
                            });
                        }
                        await db.GroupSchedules.InsertManyAsync(newSchedules);
                    }

                    await sessionService.RegenerateFutureSessionsAsync(finalGroup);
                }
            }

            var updated = await db.Groups.Find(x => x.Id == id).FirstOrDefaultAsync();
            var responseData = new
            {
                id = updated!.Id,
                name = updated.Name,
                description = updated.Description,
                level = updated.Level,
                frequency = updated.Frequency,
                numberOfStudents = updated.NumberOfStudents,
                colorTag = updated.ColorTag,
                status = updated.Status.ToString()
            };

            await eventBus.PublishAsync(SessionFlow.Desktop.Services.EventBus.Events.GroupStatusChanged, SessionFlow.Desktop.Services.EventBus.EventTargetType.All, "", new { groupId = updated!.Id, group = responseData });

            return Results.Ok(responseData);
        });

        // POST /api/groups/{id}/regenerate-sessions — manual trigger
        group.MapPost("/{id:guid}/regenerate-sessions", async (Guid id, MongoService db, SessionService sessionService, HttpContext ctx, SessionFlow.Desktop.Services.MultiTenancy.ITenantProvider tenantProvider) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            var g = await db.Groups.Find(x => x.Id == id && !x.IsDeleted).FirstOrDefaultAsync();
            if (g == null) return Results.NotFound(new { error = "Group not found." });

            if (role != "Admin" && g.EngineerId != tenantId.Value)
                return Results.Forbid();

            await sessionService.RegenerateFutureSessionsAsync(g);
            return Results.Ok(new { message = "Future sessions regenerated successfully based on latest schedule." });
        });

        // DELETE /api/groups/all — hard delete all groups and related data (factory reset)
        group.MapDelete("/all", async (MongoService db, HttpContext ctx, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus) =>
        {
            // SECURITY: Factory reset is Admin-only — prevent accidental or malicious data wipe
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin")
                return Results.Forbid();

            var filter = Builders<Group>.Filter.Empty;
            var groups = await db.Groups.Find(filter).ToListAsync();
            var groupIds = groups.Select(g => g.Id).ToList();

            if (groupIds.Count > 0)
            {
                await db.Sessions.DeleteManyAsync(s => groupIds.Contains(s.GroupId));
                await db.GroupSchedules.DeleteManyAsync(s => groupIds.Contains(s.GroupId));
                await db.Students.DeleteManyAsync(s => groupIds.Contains(s.GroupId));
                await db.ChatMessages.DeleteManyAsync(s => groupIds.Contains(s.GroupId));
                await db.Groups.DeleteManyAsync(filter);
                foreach (var gId in groupIds) {
                    await eventBus.PublishAsync(SessionFlow.Desktop.Services.EventBus.Events.GroupDeleted, SessionFlow.Desktop.Services.EventBus.EventTargetType.All, "", new { groupId = gId });
                }
            }

            return Results.Ok(new { message = $"Successfully deleted {groupIds.Count} groups and all associated data." });
        });

        // DELETE /api/groups/{id} — soft delete / archive
        group.MapDelete("/{id:guid}", async (Guid id, MongoService db, HttpContext ctx, SessionFlow.Desktop.Services.EventBus.IEventBus eventBus, SessionFlow.Desktop.Services.MultiTenancy.ITenantProvider tenantProvider) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            var g = await db.Groups.Find(x => x.Id == id).FirstOrDefaultAsync();
            if (g == null) return Results.NotFound(new { error = "Group not found." });

            if (role != "Admin" && g.EngineerId != tenantId.Value)
                return Results.Forbid();

            // UX FIX: Prevent deleting if there's an ACTIVE session
            var hasActiveSession = await db.Sessions.Find(s => s.GroupId == id && s.Status == SessionStatus.Active && !s.IsDeleted).AnyAsync();
            if (hasActiveSession)
                return Results.BadRequest(new { error = "Cannot delete group while a session is currently ACTIVE. Please end the session first." });

            using var session = await db.Client.StartSessionAsync();
            session.StartTransaction();

            try
            {
                var update = Builders<Group>.Update
                    .Set(g => g.IsDeleted, true)
                    .Set(g => g.Status, GroupStatus.Archived)
                    .Set(g => g.DeletedAt, DateTimeOffset.UtcNow)
                    .Set(g => g.UpdatedAt, DateTimeOffset.UtcNow);
                
                await db.Groups.UpdateOneAsync(session, g => g.Id == id, update);

                // Cascade soft-delete to students
                await db.Students.UpdateManyAsync(
                    session,
                    s => s.GroupId == id && !s.IsDeleted,
                    Builders<Student>.Update.Set(s => s.IsDeleted, true).Set(s => s.UpdatedAt, DateTimeOffset.UtcNow)
                );

                // Cascade soft-delete to ALL sessions (Scheduled, Active, or Ended)
                await db.Sessions.UpdateManyAsync(
                    session,
                    s => s.GroupId == id && !s.IsDeleted,
                    Builders<Session>.Update.Set(s => s.IsDeleted, true).Set(s => s.UpdatedAt, DateTimeOffset.UtcNow)
                );

                // Cascade soft-delete to chat messages
                await db.ChatMessages.UpdateManyAsync(
                    session,
                    m => m.GroupId == id && !m.IsDeleted,
                    Builders<ChatMessage>.Update.Set(m => m.IsDeleted, true).Set(m => m.UpdatedAt, DateTimeOffset.UtcNow)
                );

                await db.GroupSchedules.DeleteManyAsync(session, s => s.GroupId == id);

                await session.CommitTransactionAsync();

                await eventBus.PublishAsync(SessionFlow.Desktop.Services.EventBus.Events.GroupDeleted, SessionFlow.Desktop.Services.EventBus.EventTargetType.All, "", new { groupId = id });

                return Results.Ok(new { message = $"Group '{g.Name}' has been successfully archived." });
            }
            catch (Exception ex)
            {
                await session.AbortTransactionAsync();
                return Results.Json(new { error = "Failed to archive group due to a system error.", detail = ex.Message }, statusCode: 500);
            }
        });

        // GET /api/groups/{id}/students — list students in group
        group.MapGet("/{id:guid}/students", async (Guid id, MongoService db, HttpContext ctx, AuthService auth) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var g = await db.Groups.Find(x => x.Id == id).FirstOrDefaultAsync();
            if (g == null) return Results.NotFound(new { error = "Group not found." });

            if (role == "Engineer" && g.EngineerId != userId)
                return Results.Forbid();

            if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return Results.Forbid();
                var studentInfos = await auth.ResolveAllStudentsForUser(user);
                if (studentInfos == null || !studentInfos.Any(s => s.GroupId == id)) return Results.Forbid();
            }

            var rawStudents = await db.Students
                .Find(s => s.GroupId == id && !s.IsDeleted)
                .SortBy(s => s.Name)
                .ToListAsync();

            var students = rawStudents
                .GroupBy(s => s.Name.ToLower().Trim())
                .Select(group => group.OrderByDescending(s => s.UserId != null).ThenByDescending(s => s.CreatedAt).First())
                .OrderBy(s => s.Name)
                .ToList();

            return Results.Ok(students.Select(s => new
            {
                id = s.Id,
                name = s.Name,
                groupId = s.GroupId,
                studentId = s.StudentId,
                uniqueStudentCode = s.UniqueStudentCode,
                level = g.Level,
                createdAt = s.CreatedAt
            }));
        });

        // POST /api/groups/{id}/students — add student to group
        group.MapPost("/{id:guid}/students", async (Guid id, AddStudentRequest req, MongoService db) =>
        {
            var g = await db.Groups.Find(x => x.Id == id).FirstOrDefaultAsync();
            if (g == null) return Results.NotFound(new { error = "Group not found." });

            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Student name is required." });

            var activeStudents = (int)await db.Students.CountDocumentsAsync(s => s.GroupId == id && !s.IsDeleted);
            var maxStudents = CurriculumConstants.GetMaxStudents(g.Level);

            if (activeStudents >= maxStudents)
                return Results.BadRequest(new { error = $"Security Restriction: Group is full. Maximum {maxStudents} students for Level {g.Level}." });

            var student = new Student
            {
                Name = req.Name.Trim(),
                GroupId = id,
                UniqueStudentCode = Student.GenerateCode(req.Name.Trim(), id)
            };

            await db.Students.InsertOneAsync(student);

            return Results.Created($"/api/students/{student.Id}", new
            {
                id = student.Id,
                name = student.Name,
                groupId = student.GroupId,
                studentId = student.StudentId,
                uniqueStudentCode = student.UniqueStudentCode,
                createdAt = student.CreatedAt
            });
        });
    }

    public record CreateGroupRequest(
        [property: System.Text.Json.Serialization.JsonPropertyName("name")] string Name, 
        [property: System.Text.Json.Serialization.JsonPropertyName("description")] string? Description, 
        [property: System.Text.Json.Serialization.JsonPropertyName("level")] int Level, 
        [property: System.Text.Json.Serialization.JsonPropertyName("colorTag")] string? ColorTag, 
        [property: System.Text.Json.Serialization.JsonPropertyName("numberOfStudents")] int NumberOfStudents, 
        [property: System.Text.Json.Serialization.JsonPropertyName("startingSessionNumber")] int StartingSessionNumber, 
        [property: System.Text.Json.Serialization.JsonPropertyName("totalSessions")] int TotalSessions, 
        [property: System.Text.Json.Serialization.JsonPropertyName("frequency")] int Frequency, 
        [property: System.Text.Json.Serialization.JsonPropertyName("schedules")] List<ScheduleItem>? Schedules, 
        [property: System.Text.Json.Serialization.JsonPropertyName("cadets")] List<CadetRecord>? Cadets
    );
    public record ScheduleItem(
        [property: System.Text.Json.Serialization.JsonPropertyName("dayOfWeek")] int DayOfWeek, 
        [property: System.Text.Json.Serialization.JsonPropertyName("startTime")] string StartTime, 
        [property: System.Text.Json.Serialization.JsonPropertyName("durationMinutes")] int DurationMinutes
    );
    public record CadetRecord(
        [property: System.Text.Json.Serialization.JsonPropertyName("name")] string Name, 
        [property: System.Text.Json.Serialization.JsonPropertyName("studentId")] string? StudentId
    );
    public record UpdateGroupRequest(
        [property: System.Text.Json.Serialization.JsonPropertyName("name")] string? Name, 
        [property: System.Text.Json.Serialization.JsonPropertyName("description")] string? Description, 
        [property: System.Text.Json.Serialization.JsonPropertyName("colorTag")] string? ColorTag, 
        [property: System.Text.Json.Serialization.JsonPropertyName("level")] int? Level, 
        [property: System.Text.Json.Serialization.JsonPropertyName("numberOfStudents")] int? NumberOfStudents, 
        [property: System.Text.Json.Serialization.JsonPropertyName("startingSessionNumber")] int? StartingSessionNumber, 
        [property: System.Text.Json.Serialization.JsonPropertyName("totalSessions")] int? TotalSessions, 
        [property: System.Text.Json.Serialization.JsonPropertyName("frequency")] int? Frequency, 
        [property: System.Text.Json.Serialization.JsonPropertyName("schedules")] List<ScheduleItem>? Schedules
    );
    public record AddStudentRequest(string Name);
}

