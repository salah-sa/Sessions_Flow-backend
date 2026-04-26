using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using System.Collections.Generic;
using System.Linq;
using System;
using System.Threading.Tasks;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AdminMaintenanceEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/admin/maintenance");

        group.MapPost("/fix-session-times", async (MongoService db, SessionService sessionService) =>
        {
            var cairoTz = sessionService.GetConfiguredTimeZone();
            var sessions = await db.Sessions.Find(s => s.Status == SessionStatus.Scheduled && !s.IsDeleted).ToListAsync();
            var fixedCount = 0;

            foreach (var session in sessions)
            {
                var groupObj = await db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync();
                if (groupObj == null) continue;

                var schedules = await db.GroupSchedules.Find(gs => gs.GroupId == groupObj.Id).ToListAsync();
                if (schedules.Count == 0) continue;

                // Current scheduled time in Cairo
                var currentCairo = TimeZoneInfo.ConvertTime(session.ScheduledAt, cairoTz);
                var dow = (int)currentCairo.DayOfWeek;

                // Find matching schedule for this DOW
                var schedule = schedules.FirstOrDefault(s => s.DayOfWeek == dow);
                if (schedule == null) continue;

                // Reconstruct the correct UTC time
                var correctCairo = new DateTime(currentCairo.Year, currentCairo.Month, currentCairo.Day,
                    schedule.StartTime.Hours, schedule.StartTime.Minutes, 0);
                
                var correctOffset = cairoTz.GetUtcOffset(correctCairo);
                var correctScheduledAt = new DateTimeOffset(correctCairo, correctOffset).ToUniversalTime();

                if (session.ScheduledAt != correctScheduledAt)
                {
                    await db.Sessions.UpdateOneAsync(
                        s => s.Id == session.Id,
                        Builders<Session>.Update.Set(s => s.ScheduledAt, correctScheduledAt)
                    );
                    fixedCount++;
                }
            }

            return Results.Ok(new { message = $"Migration complete. Fixed {fixedCount} sessions.", totalChecked = sessions.Count });
        }).RequireAuthorization("AdminOnly");

        // NEW: Cleanup duplicate sessions (keeps oldest, soft-deletes rest)
        group.MapPost("/cleanup-duplicates", async (MongoService db) =>
        {
            var allSessions = await db.Sessions.Find(s => !s.IsDeleted).ToListAsync();
            
            // Group by GroupId + ScheduledAt (rounded to minute)
            var groups = allSessions.GroupBy(s => new { 
                s.GroupId, 
                Time = new DateTimeOffset(s.ScheduledAt.Year, s.ScheduledAt.Month, s.ScheduledAt.Day, 
                                        s.ScheduledAt.Hour, s.ScheduledAt.Minute, 0, TimeSpan.Zero) 
            });

            var cleanedCount = 0;
            foreach (var g in groups)
            {
                if (g.Count() <= 1) continue;

                // Keep the oldest one (first created)
                var sorted = g.OrderBy(s => s.CreatedAt).ToList();
                var toDelete = sorted.Skip(1).Select(s => s.Id).ToList();

                var update = Builders<Session>.Update
                    .Set(s => s.IsDeleted, true)
                    .Set(s => s.DeletedAt, DateTimeOffset.UtcNow)
                    .Set(s => s.Status, SessionStatus.Cancelled)
                    .Set(s => s.Notes, "Automatically cleaned up as duplicate");

                await db.Sessions.UpdateManyAsync(s => toDelete.Contains(s.Id), update);
                cleanedCount += toDelete.Count;
            }

            return Results.Ok(new { message = $"Cleanup complete. Removed {cleanedCount} duplicate sessions." });
        }).RequireAuthorization("AdminOnly");

        // NEW: Purge test data (Hard-delete)
        group.MapPost("/purge-test-data", async (MongoService db) =>
        {
            // Find groups with "test" in name
            var testGroups = await db.Groups.Find(g => g.Name.ToLower().Contains("test")).ToListAsync();
            var testGroupIds = testGroups.Select(g => g.Id).ToList();

            if (testGroupIds.Count == 0)
                return Results.Ok(new { message = "No test groups found." });

            // 1. Delete Attendance Records for these groups' sessions
            var testSessions = await db.Sessions.Find(s => testGroupIds.Contains(s.GroupId)).ToListAsync();
            var testSessionIds = testSessions.Select(s => s.Id).ToList();
            await db.AttendanceRecords.DeleteManyAsync(ar => testSessionIds.Contains(ar.SessionId));

            // 2. Delete Sessions
            await db.Sessions.DeleteManyAsync(s => testGroupIds.Contains(s.GroupId));

            // 3. Delete Students
            await db.Students.DeleteManyAsync(s => testGroupIds.Contains(s.GroupId));

            // 4. Delete Schedules
            await db.GroupSchedules.DeleteManyAsync(gs => testGroupIds.Contains(gs.GroupId));

            // 5. Delete Groups
            await db.Groups.DeleteManyAsync(g => testGroupIds.Contains(g.Id));

            return Results.Ok(new { 
                message = $"Purge complete.", 
                groupsDeleted = testGroupIds.Count,
                sessionsDeleted = testSessionIds.Count
            });
        }).RequireAuthorization("AdminOnly");
    }
}
