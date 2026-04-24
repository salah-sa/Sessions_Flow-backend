using System;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

public enum SupportDepartment
{
    Technical,
    Reports,
    General
}

public enum TicketStatus
{
    Open,
    InProgress,
    Resolved,
    Closed
}

public class SupportTicket
{
    [BsonId]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    [BsonRepresentation(MongoDB.Bson.BsonType.String)]
    public SupportDepartment Department { get; set; } = SupportDepartment.General;
    
    [BsonRepresentation(MongoDB.Bson.BsonType.String)]
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    
    public Guid CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public string CreatedByUserRole { get; set; } = string.Empty;
    
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
