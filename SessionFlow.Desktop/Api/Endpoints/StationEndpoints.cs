using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class StationEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/stations").RequireAuthorization("AdminOnly");

        // GET /api/stations — list all stations
        group.MapGet("/", async (MongoService db) =>
        {
            var stations = await db.Stations
                .Find(_ => true)
                .SortBy(s => s.Name)
                .ToListAsync();
            
            return Results.Ok(stations);
        });

        // GET /api/stations/{id} — station detail
        group.MapGet("/{id:guid}", async (Guid id, MongoService db) =>
        {
            var station = await db.Stations.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (station == null)
                return Results.NotFound(new { error = "Station not found." });

            return Results.Ok(station);
        });

        // POST /api/stations — create station
        group.MapPost("/", async (CreateStationRequest req, MongoService db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Station name is required." });

            var station = new Station
            {
                Name = req.Name.Trim(),
                Location = req.Location?.Trim() ?? string.Empty,
                Capacity = req.Capacity <= 0 ? 4 : req.Capacity,
                IsActive = true
            };

            await db.Stations.InsertOneAsync(station);
            return Results.Created($"/api/stations/{station.Id}", station);
        });

        // PUT /api/stations/{id} — update station
        group.MapPut("/{id:guid}", async (Guid id, UpdateStationRequest req, MongoService db) =>
        {
            var station = await db.Stations.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (station == null)
                return Results.NotFound(new { error = "Station not found." });

            var update = Builders<Station>.Update
                .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow);

            if (!string.IsNullOrWhiteSpace(req.Name))
                update = update.Set(s => s.Name, req.Name.Trim());

            if (req.Location != null)
                update = update.Set(s => s.Location, req.Location.Trim());

            if (req.Capacity.HasValue)
                update = update.Set(s => s.Capacity, req.Capacity.Value);

            if (req.IsActive.HasValue)
                update = update.Set(s => s.IsActive, req.IsActive.Value);

            await db.Stations.UpdateOneAsync(s => s.Id == id, update);
            
            var updatedStation = await db.Stations.Find(s => s.Id == id).FirstOrDefaultAsync();
            return Results.Ok(updatedStation);
        });

        // DELETE /api/stations/{id} — delete station
        group.MapDelete("/{id:guid}", async (Guid id, MongoService db) =>
        {
            var result = await db.Stations.DeleteOneAsync(s => s.Id == id);
            if (result.DeletedCount == 0)
                return Results.NotFound(new { error = "Station not found." });

            return Results.Ok(new { message = "Station deleted successfully." });
        });
    }

    public record CreateStationRequest(string Name, string? Location, int Capacity);
    public record UpdateStationRequest(string? Name, string? Location, int? Capacity, bool? IsActive);
}
