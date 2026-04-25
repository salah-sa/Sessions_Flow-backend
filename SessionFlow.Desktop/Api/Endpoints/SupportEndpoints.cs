using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Api.Helpers;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class SupportEndpoints
{
    public static void Map(WebApplication app)
    {
        var support = app.MapGroup("/api/support").RequireAuthorization();

        // POST /api/support/tickets - Submit a new ticket (Any authenticated user)
        support.MapPost("/tickets", async (CreateTicketRequest req, MongoService db, HttpContext ctx) =>
        {
            try
            {
                var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = ctx.User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown User";
                var userRole = ctx.User.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown Role";

                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Description))
                    return Results.BadRequest(new { error = "Title and Description are required." });

                if (!Enum.TryParse<SupportDepartment>(req.Department, true, out var department))
                    department = SupportDepartment.General;

                var ticket = new SupportTicket
                {
                    Title = req.Title.Trim(),
                    Description = req.Description.Trim(),
                    Department = department,
                    Status = TicketStatus.Open,
                    CreatedByUserId = userId,
                    CreatedByUserName = userName,
                    CreatedByUserRole = userRole,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                await db.SupportTickets.InsertOneAsync(ticket);
                return Results.Created($"/api/support/tickets/{ticket.Id}", ticket);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "Failed to create ticket.", detail = ex.Message }, statusCode: 500);
            }
        });

        // GET /api/support/tickets - List tickets (Admin sees all, Users see their own)
        support.MapGet("/tickets", async (MongoService db, HttpContext ctx, int? page, int? pageSize, string? department, string? status) =>
        {
            var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;

            if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

            var builder = Builders<SupportTicket>.Filter;
            var filter = builder.Empty;

            if (role != "Admin")
            {
                // Non-admins can only see their own tickets
                filter &= builder.Eq(t => t.CreatedByUserId, userId);
            }

            if (!string.IsNullOrEmpty(department) && Enum.TryParse<SupportDepartment>(department, true, out var dep))
                filter &= builder.Eq(t => t.Department, dep);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<TicketStatus>(status, true, out var st))
                filter &= builder.Eq(t => t.Status, st);

            var (skip, take) = PaginationHelper.Normalize(page, pageSize);
            var totalCount = await db.SupportTickets.CountDocumentsAsync(filter);
            var tickets = await db.SupportTickets.Find(filter)
                .SortByDescending(t => t.CreatedAt)
                .Skip(skip)
                .Limit(take)
                .ToListAsync();

            return Results.Ok(PaginationHelper.Envelope(tickets, totalCount, page ?? 1, take));
        });

        // PUT /api/support/tickets/{id}/status - Update ticket status (Admin only)
        support.MapPut("/tickets/{id:guid}/status", async (Guid id, UpdateTicketStatusRequest req, MongoService db, HttpContext ctx) =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Admin") return Results.Forbid();

            if (!Enum.TryParse<TicketStatus>(req.Status, true, out var status))
                return Results.BadRequest(new { error = "Invalid status." });

            var update = Builders<SupportTicket>.Update
                .Set(t => t.Status, status)
                .Set(t => t.UpdatedAt, DateTimeOffset.UtcNow);

            var result = await db.SupportTickets.UpdateOneAsync(t => t.Id == id, update);
            if (result.MatchedCount == 0) return Results.NotFound(new { error = "Ticket not found." });

            return Results.Ok(new { message = "Status updated successfully." });
        });
    }

    public record CreateTicketRequest(string Title, string Description, string Department);
    public record UpdateTicketStatusRequest(string Status);
}
