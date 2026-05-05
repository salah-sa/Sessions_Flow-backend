using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AuditEndpoints
{
    public static void Map(WebApplication app)
    {
        // Require Admin policy for audit logs
        var group = app.MapGroup("/api/v1/admin/audit-logs").RequireAuthorization("AdminOnly");

        group.MapGet("/", async (AuditService service) =>
        {
            var logs = await service.GetRecentLogsAsync();
            return Results.Ok(logs);
        });
    }
}
