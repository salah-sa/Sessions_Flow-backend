using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
namespace SessionFlow.Desktop.Services.MultiTenancy;

public interface ITenantProvider
{
    Guid? GetCurrentTenantId();
    bool IsAdmin();
    bool IsSystem(); // For background jobs

    // Returns a filter that checks if the document belongs to the current tenant OR is shared with the tenant
    Task<FilterDefinition<T>> GetTenantFilterAsync<T>(MongoService db, string engineerIdField = "EngineerId");
}

public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? GetCurrentTenantId()
    {
        var ctx = _httpContextAccessor.HttpContext;
        if (ctx == null) return null; // System/Background Context

        var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdStr, out var userId))
        {
            return userId; // EngineerId is essentially UserId
        }
        return null;
    }

    public bool IsAdmin()
    {
        var ctx = _httpContextAccessor.HttpContext;
        if (ctx == null) return false;
        return ctx.User.FindFirst(ClaimTypes.Role)?.Value == "Admin";
    }

    public bool IsSystem()
    {
        return _httpContextAccessor.HttpContext == null;
    }

    public async Task<FilterDefinition<T>> GetTenantFilterAsync<T>(MongoService db, string engineerIdField = "EngineerId")
    {
        var builder = Builders<T>.Filter;
        
        if (IsSystem())
        {
            return builder.Empty; // Full access ONLY for system-level background jobs
        }

        var tenantId = GetCurrentTenantId();
        if (tenantId == null)
        {
            // Fallback (shouldn't happen for valid users, but safety first)
            return builder.Eq(engineerIdField, Guid.Empty);
        }

        // Get shared resources
        var sharedGrants = await db.AccessGrants
            .Find(g => g.EngineerId == tenantId.Value)
            .ToListAsync();

        var sharedResourceIds = sharedGrants.Select(g => g.ResourceId).ToList();

        var ownerFilter = builder.Eq(engineerIdField, tenantId.Value);

        if (sharedResourceIds.Count > 0)
        {
            var idFilter = builder.In("_id", sharedResourceIds); // Assumes T has an Id mapped to _id
            return builder.Or(ownerFilter, idFilter);
        }

        return ownerFilter;
    }
}
