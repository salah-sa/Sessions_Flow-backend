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
    private bool _isSystemContext = false;

    public TenantContextService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? CurrentEngineerId
    {
        get
        {
            if (_isSystemContext) return null;
            
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;

            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(idStr, out var id))
            {
                return id;
            }
            return null;
        }
    }

    public string? CurrentRole
    {
        get
        {
            if (_isSystemContext) return "System";
            return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
        }
    }

    public void SetSystemContext()
    {
        _isSystemContext = true;
    }
}
