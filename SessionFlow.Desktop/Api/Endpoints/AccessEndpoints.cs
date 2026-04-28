using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;
using System.Security.Claims;
using SessionFlow.Desktop.Services.MultiTenancy;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class AccessEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/access").RequireAuthorization();

        // GET /api/access/requests
        group.MapGet("/requests", async (MongoService db, ITenantProvider tenantProvider) =>
        {
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            // Find requests where the user is either the owner (needs to approve) or the requester (checking status)
            var requests = await db.ResourceAccessRequests
                .Find(r => r.OwnerId == tenantId || r.RequesterId == tenantId)
                .SortByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(requests);
        });

        // POST /api/access/request
        group.MapPost("/request", async (MongoService db, ITenantProvider tenantProvider, AccessRequestDto req) =>
        {
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            // Validate resource owner
            Guid ownerId = Guid.Empty;
            if (req.ResourceType == "Group")
            {
                var target = await db.Groups.Find(g => g.Id == req.ResourceId).FirstOrDefaultAsync();
                if (target == null) return Results.NotFound("Group not found");
                ownerId = target.EngineerId;
            }
            // Add other resources as needed

            if (ownerId == tenantId) return Results.BadRequest("You already own this resource.");

            var request = new ResourceAccessRequest
            {
                RequesterId = tenantId.Value,
                OwnerId = ownerId,
                ResourceId = req.ResourceId,
                ResourceType = req.ResourceType
            };

            await db.ResourceAccessRequests.InsertOneAsync(request);
            return Results.Ok(request);
        });

        // POST /api/access/approve/{requestId}
        group.MapPost("/approve/{requestId:guid}", async (MongoService db, ITenantProvider tenantProvider, Guid requestId) =>
        {
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            var request = await db.ResourceAccessRequests.Find(r => r.Id == requestId).FirstOrDefaultAsync();
            if (request == null) return Results.NotFound();

            if (request.OwnerId != tenantId) return Results.Forbid();
            if (request.Status != RequestStatus.Pending) return Results.BadRequest("Request already processed.");

            // Create Grant
            var grant = new AccessGrant
            {
                EngineerId = request.RequesterId,
                ResourceId = request.ResourceId,
                ResourceType = request.ResourceType,
                Permissions = "ReadWrite"
            };

            await db.AccessGrants.InsertOneAsync(grant);

            var update = Builders<ResourceAccessRequest>.Update
                .Set(r => r.Status, RequestStatus.Approved)
                .Set(r => r.UpdatedAt, DateTimeOffset.UtcNow);

            await db.ResourceAccessRequests.UpdateOneAsync(r => r.Id == requestId, update);

            return Results.Ok();
        });

        // POST /api/access/reject/{requestId}
        group.MapPost("/reject/{requestId:guid}", async (MongoService db, ITenantProvider tenantProvider, Guid requestId) =>
        {
            var tenantId = tenantProvider.GetCurrentTenantId();
            if (tenantId == null) return Results.Unauthorized();

            var request = await db.ResourceAccessRequests.Find(r => r.Id == requestId).FirstOrDefaultAsync();
            if (request == null) return Results.NotFound();

            if (request.OwnerId != tenantId) return Results.Forbid();
            if (request.Status != RequestStatus.Pending) return Results.BadRequest("Request already processed.");

            var update = Builders<ResourceAccessRequest>.Update
                .Set(r => r.Status, RequestStatus.Rejected)
                .Set(r => r.UpdatedAt, DateTimeOffset.UtcNow);

            await db.ResourceAccessRequests.UpdateOneAsync(r => r.Id == requestId, update);

            return Results.Ok();
        });
    }

    public record AccessRequestDto(Guid ResourceId, string ResourceType);
}
