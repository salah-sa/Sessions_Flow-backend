using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace SessionFlow.Desktop.Services;

public interface ITenantAccessor
{
    Guid? CurrentEngineerId { get; }
    string? CurrentRole { get; }
    
    /// <summary>
    /// Forces the context to act as a system user (bypasses tenant filters).
    /// </summary>
    void SetSystemContext();
}

public class TenantContextService : ITenantAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AsyncLocal<bool> _isSystemContext = new AsyncLocal<bool>();

    public TenantContextService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? CurrentEngineerId
    {
        get
        {
            if (_isSystemContext.Value || _httpContextAccessor.HttpContext == null) return null;
            
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;

            // Prioritize the explicit engineer_id claim (cached in JWT)
            var engineerIdClaim = user.FindFirst("engineer_id")?.Value;
            if (Guid.TryParse(engineerIdClaim, out var engId))
            {
                if (engId == Guid.Empty) return null; // Fail-fast on uninitialized tenant context
                return engId;
            }

            // Fallback to NameIdentifier for Engineers/Admins who are their own tenant
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(idStr, out var id))
            {
                if (id == Guid.Empty) return null;
                return id;
            }
            return null;
        }
    }

    public string? CurrentRole
    {
        get
        {
            if (_isSystemContext.Value || _httpContextAccessor.HttpContext == null) return "System";
            return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
        }
    }

    public void SetSystemContext()
    {
        // Absolute Guard: System context must NEVER be set mid-request.
        // It is intended only for background services or startup migrations.
        if (_httpContextAccessor.HttpContext != null)
        {
            throw new InvalidOperationException("CRITICAL SECURITY VIOLATION: Attempted to elevate to System context within an active HTTP request boundary.");
        }
        _isSystemContext.Value = true;
    }
}
