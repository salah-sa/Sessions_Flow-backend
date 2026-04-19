using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class TimetableEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/timetable").RequireAuthorization();

        // GET /api/timetable — weekly schedule
        group.MapGet("/", async (MongoService db, AuthService auth, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Guid.TryParse(userIdStr, out var uid)) return Results.Unauthorized();

            var now = DateTimeOffset.UtcNow;
            var cairoOffset = TimeSpan.FromHours(2);
            var cairoNow = now.ToOffset(cairoOffset);

            var daysSinceMonday = ((int)cairoNow.DayOfWeek - 1 + 7) % 7;
            var weekStart = new DateTimeOffset(cairoNow.Date.AddDays(-daysSinceMonday), cairoOffset).ToUniversalTime();
            var weekEnd = weekStart.AddDays(7);

            var sessionBuilder = Builders<Session>.Filter;
            var sessionFilter = sessionBuilder.Gte(s => s.ScheduledAt, weekStart) & 
                               sessionBuilder.Lt(s => s.ScheduledAt, weekEnd) &
                               sessionBuilder.Eq(s => s.IsDeleted, false);

            List<Guid> studentGroupIds = new();
            if (role == "Student")
            {
                var user = await db.Users.Find(u => u.Id == uid).FirstOrDefaultAsync();
                if (user != null)
                {
                    var studentInfos = await auth.ResolveAllStudentsForUser(user);
                    studentGroupIds = studentInfos?.Select(s => s.GroupId).ToList() ?? new();
                }
                
                if (!studentGroupIds.Any())
                    return Results.Ok(new { sessions = new List<object>(), availability = new List<object>(), groupSchedules = new List<object>(), weekStart, weekEnd });

                sessionFilter &= sessionBuilder.In(s => s.GroupId, studentGroupIds);
            }
            else if (role == "Engineer")
            {
                sessionFilter &= sessionBuilder.Eq(s => s.EngineerId, uid);
            }

            var sessions = await db.Sessions.Find(sessionFilter).SortBy(s => s.ScheduledAt).ToListAsync();
            
            var groupIds = sessions.Select(s => s.GroupId).Distinct().ToList();
            var engineerIds = sessions.Select(s => s.EngineerId).Distinct().ToList();
            
            var groupsList = await db.Groups.Find(g => groupIds.Contains(g.Id)).ToListAsync();
            var engineersList = await db.Users.Find(u => engineerIds.Contains(u.Id)).ToListAsync();

            var groupDict = groupsList.ToDictionary(g => g.Id);
            var engDict = engineersList.ToDictionary(e => e.Id);
            
            var sessionResults = new List<object>();
            foreach (var s in sessions)
            {
                groupDict.TryGetValue(s.GroupId, out var g);
                if (g == null || g.IsDeleted) continue;

                engDict.TryGetValue(s.EngineerId, out var eng);
                
                sessionResults.Add(new
                {
                    id = s.Id,
                    groupId = s.GroupId,
                    groupName = g?.Name,
                    groupColorTag = g?.ColorTag,
                    engineerId = s.EngineerId,
                    engineerName = eng?.Name,
                    scheduledAt = s.ScheduledAt,
                    status = s.Status.ToString(),
                    dayOfWeek = (int)s.ScheduledAt.ToOffset(cairoOffset).DayOfWeek
                });
            }

            var availabilityBuilder = Builders<TimetableEntry>.Filter;
            var availabilityFilter = availabilityBuilder.Empty;
            
            if (role == "Student")
            {
                // Availability isn't relevant for students in the same way, return empty or keep as is? 
                // Actually, availability is per engineer. Students don't have availability entries.
                availabilityFilter &= availabilityBuilder.Eq(t => t.Id, Guid.Empty); 
            }
            else if (role == "Engineer")
            {
                availabilityFilter &= availabilityBuilder.Eq(t => t.EngineerId, uid);
            }

            var availability = await db.TimetableEntries.Find(availabilityFilter).ToListAsync();

            // Resolve which groups to show schedules for
            List<Guid> activeGroupIds;
            if (role == "Student")
            {
                activeGroupIds = studentGroupIds;
            }
            else if (role == "Admin")
            {
                activeGroupIds = await db.Groups.Find(g => !g.IsDeleted).Project(g => g.Id).ToListAsync();
            }
            else // Engineer
            {
                activeGroupIds = await db.Groups.Find(g => g.EngineerId == uid && !g.IsDeleted).Project(g => g.Id).ToListAsync();
            }

            var schedules = await db.GroupSchedules.Find(gs => activeGroupIds.Contains(gs.GroupId)).ToListAsync();

            return Results.Ok(new 
            { 
                sessions = sessionResults, 
                availability = availability.Select(t => new
                {
                    id = t.Id,
                    engineerId = t.EngineerId,
                    dayOfWeek = t.DayOfWeek,
                    isAvailable = t.IsAvailable,
                    segments = t.Segments,
                    startTime = t.StartTime.HasValue ? t.StartTime.Value.ToString(@"hh\:mm") : null,
                    endTime = t.EndTime.HasValue ? t.EndTime.Value.ToString(@"hh\:mm") : null
                }),
                groupSchedules = schedules.Select(gs => new {
                    id = gs.Id,
                    groupId = gs.GroupId,
                    groupName = groupDict.TryGetValue(gs.GroupId, out var g) ? g.Name : "Unknown",
                    groupColorTag = groupDict.TryGetValue(gs.GroupId, out var g2) ? g2.ColorTag : "blue",
                    dayOfWeek = gs.DayOfWeek,
                    startTime = gs.StartTime.ToString(@"hh\:mm"),
                    durationMinutes = gs.DurationMinutes
                }),
                weekStart, 
                weekEnd 
            });
        });

        // PUT /api/timetable — update group schedules
        group.MapPut("/", async (List<UpdateScheduleItem> items, MongoService db) =>
        {
            foreach (var item in items)
            {
                if (Guid.TryParse(item.Id, out var id))
                {
                    var update = Builders<GroupSchedule>.Update
                        .Set(gs => gs.DayOfWeek, item.DayOfWeek)
                        .Set(gs => gs.StartTime, TimeSpan.Parse(item.StartTime))
                        .Set(gs => gs.DurationMinutes, item.DurationMinutes)
                        .Set(gs => gs.UpdatedAt, DateTimeOffset.UtcNow);
                    
                    await db.GroupSchedules.UpdateOneAsync(gs => gs.Id == id, update);
                }
            }

            return Results.Ok(new { message = "Schedule updated." });
        });

        // GET /api/timetable/availability
        group.MapGet("/availability", async (MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var uid))
                return Results.Unauthorized();

            var entries = await db.TimetableEntries
                .Find(t => t.EngineerId == uid)
                .SortBy(t => t.DayOfWeek)
                .ToListAsync();

            return Results.Ok(entries.Select(t => new
            {
                id = t.Id,
                dayOfWeek = t.DayOfWeek,
                isAvailable = t.IsAvailable,
                segments = t.Segments,
                startTime = t.StartTime.HasValue ? t.StartTime.Value.ToString(@"hh\:mm") : null,
                endTime = t.EndTime.HasValue ? t.EndTime.Value.ToString(@"hh\:mm") : null
            }));
        });

        // PUT /api/timetable/availability
        group.MapPut("/availability", async (List<UpdateAvailabilityItem> items, MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var uid))
                return Results.Unauthorized();

            foreach (var item in items)
            {
                var entry = await db.TimetableEntries
                    .Find(t => t.EngineerId == uid && t.DayOfWeek == item.DayOfWeek)
                    .FirstOrDefaultAsync();

                if (entry != null)
                {
                    var update = Builders<TimetableEntry>.Update
                        .Set(t => t.IsAvailable, item.IsAvailable)
                        .Set(t => t.StartTime, string.IsNullOrEmpty(item.StartTime) ? null : TimeSpan.Parse(item.StartTime))
                        .Set(t => t.EndTime, string.IsNullOrEmpty(item.EndTime) ? null : TimeSpan.Parse(item.EndTime))
                        .Set(t => t.UpdatedAt, DateTimeOffset.UtcNow);
                    
                    await db.TimetableEntries.UpdateOneAsync(t => t.Id == entry.Id, update);
                }
                else
                {
                    await db.TimetableEntries.InsertOneAsync(new TimetableEntry
                    {
                        EngineerId = uid,
                        DayOfWeek = item.DayOfWeek,
                        IsAvailable = item.IsAvailable,
                        StartTime = string.IsNullOrEmpty(item.StartTime) ? null : TimeSpan.Parse(item.StartTime),
                        EndTime = string.IsNullOrEmpty(item.EndTime) ? null : TimeSpan.Parse(item.EndTime)
                    });
                }
            }

            return Results.Ok(new { message = "Availability updated." });
        });

        // POST /api/timetable/auto-fill — auto-sync availability matrix from group schedules
        group.MapPost("/auto-fill", async (MongoService db, HttpContext ctx) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var uid))
                return Results.Unauthorized();

            // Get all groups managed by this engineer
            var groups = await db.Groups.Find(g => g.EngineerId == uid && !g.IsDeleted).ToListAsync();
            var groupIds = groups.Select(g => g.Id).ToList();

            // Get all schedules for these groups
            var schedules = await db.GroupSchedules.Find(gs => groupIds.Contains(gs.GroupId)).ToListAsync();

            if (schedules.Count == 0)
                return Results.BadRequest(new { error = "No group schedules found to sync from." });

            // Group schedules by day of week
            var schedulesByDay = schedules.GroupBy(s => s.DayOfWeek);

            // Clear or update availability matrix for each day
            for (int day = 0; day < 7; day++)
            {
                var daySchedules = schedulesByDay.FirstOrDefault(g => g.Key == day)?.ToList();
                
                if (daySchedules != null && daySchedules.Count > 0)
                {
                    var minStart = daySchedules.Min(s => s.StartTime);
                    var maxEnd = daySchedules.Max(s => s.StartTime.Add(TimeSpan.FromMinutes(s.DurationMinutes)));

                    var update = Builders<TimetableEntry>.Update
                        .Set(t => t.IsAvailable, true)
                        .Set(t => t.StartTime, minStart)
                        .Set(t => t.EndTime, maxEnd)
                        .Set(t => t.UpdatedAt, DateTimeOffset.UtcNow);

                    await db.TimetableEntries.UpdateOneAsync(
                        t => t.EngineerId == uid && t.DayOfWeek == day,
                        update,
                        new UpdateOptions { IsUpsert = true }
                    );
                }
                else
                {
                    // If no schedules for this day, mark as unavailable
                    var update = Builders<TimetableEntry>.Update
                        .Set(t => t.IsAvailable, false)
                        .Set(t => t.StartTime, null)
                        .Set(t => t.EndTime, null)
                        .Set(t => t.UpdatedAt, DateTimeOffset.UtcNow);

                    await db.TimetableEntries.UpdateOneAsync(
                        t => t.EngineerId == uid && t.DayOfWeek == day,
                        update,
                        new UpdateOptions { IsUpsert = true }
                    );
                }
            }

            return Results.Ok(new { message = "Availability matrix synchronized from group schedules." });
        });

        // GET /api/timetable/free-slots
        group.MapGet("/free-slots", async (Guid engineerId, string date, int duration, SchedulingService schedulingService) =>
        {
            if (!DateTime.TryParse(date, out var parsedDate))
                return Results.BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD." });

            var slots = await schedulingService.GetFreeSlotsAsync(engineerId, parsedDate, duration);
            return Results.Ok(slots);
        });
    }

    public record UpdateScheduleItem(string Id, int DayOfWeek, string StartTime, int DurationMinutes);
    public record UpdateAvailabilityItem(int DayOfWeek, bool IsAvailable, string? StartTime, string? EndTime);
}
