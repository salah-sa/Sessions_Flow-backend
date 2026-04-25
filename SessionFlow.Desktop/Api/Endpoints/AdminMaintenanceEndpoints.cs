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
        });
    }
}
