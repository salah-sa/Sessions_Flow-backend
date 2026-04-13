using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum AuditSeverity
{
    Information,
    Warning,
    Error,
    Critical
}

public class AuditRecord
{
    [BsonId]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    
    public string Operation { get; set; } = string.Empty;
    
    public string Message { get; set; } = string.Empty;
    
    public AuditSeverity Severity { get; set; } = AuditSeverity.Information;
    
    public string? Metadata { get; set; }
    
    public string? EngineerId { get; set; }
}
