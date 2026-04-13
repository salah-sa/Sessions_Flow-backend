using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using MongoDB.Driver;

namespace SessionFlow.Desktop.Api;

public class MongoHealthCheck : IHealthCheck
{
    private readonly string _connectionString;
    private readonly string _databaseName;

    public MongoHealthCheck(IConfiguration configuration)
    {
        _connectionString = configuration["Database:ConnectionString"] ?? "";
        _databaseName = configuration["Database:DatabaseName"] ?? "SessionFlow";
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var client = new MongoClient(_connectionString);
            var database = client.GetDatabase(_databaseName);
            
            // Ping the database
            await database.RunCommandAsync<MongoDB.Bson.BsonDocument>(new MongoDB.Bson.BsonDocument("ping", 1), cancellationToken: cancellationToken);
            
            return HealthCheckResult.Healthy("MongoDB connection is active.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MongoDB connection failed.", ex);
        }
    }
}
