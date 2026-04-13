using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using SessionFlow.Desktop.Models;
using System.Threading.Tasks;

namespace SessionFlow.Desktop.Data;

public class MongoService
{
    private readonly IMongoDatabase _database;

    public MongoService(IConfiguration configuration)
    {
        var connectionString = configuration["Database:ConnectionString"];
        var databaseName = configuration["Database:DatabaseName"] ?? "SessionFlow";

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Critical Error: Database ConnectionString is null or empty. Please check appsettings.json.");
        }

        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);
    }

    public async Task InitializeAsync()
    {
        // Users: Unique Email
        await Users.Indexes.CreateOneAsync(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true }));

        // Unique Username index
        await Users.Indexes.CreateOneAsync(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Username),
            new CreateIndexOptions { Unique = true, Sparse = true }));

        // Unique StudentId index (sparse because non-students don't have it)
        await Users.Indexes.CreateOneAsync(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.StudentId),
            new CreateIndexOptions { Unique = true, Sparse = true }));

        // Sessions: Group + Date
        await Sessions.Indexes.CreateOneAsync(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys.Ascending(s => s.GroupId).Ascending(s => s.ScheduledAt)));
            
        // Performance Index: Sessions by Date (Dashboard/Upcoming queries)
        await Sessions.Indexes.CreateOneAsync(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys.Ascending(s => s.ScheduledAt)));
            
        // Performance Index: Sessions by Engineer + Date (Timetable queries)
        await Sessions.Indexes.CreateOneAsync(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys.Ascending(s => s.EngineerId).Ascending(s => s.ScheduledAt)));

        // Pagination Index: Sessions IsDeleted + Status + ScheduledAt
        await Sessions.Indexes.CreateOneAsync(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys
                .Ascending(s => s.IsDeleted)
                .Ascending(s => s.Status)
                .Descending(s => s.ScheduledAt)));

        // Attendance: Session + Student (Unique)
        await AttendanceRecords.Indexes.CreateOneAsync(new CreateIndexModel<AttendanceRecord>(
            Builders<AttendanceRecord>.IndexKeys.Ascending(ar => ar.SessionId).Ascending(ar => ar.StudentId),
            new CreateIndexOptions { Unique = true }));

        // Pagination/Detail Index: Attendance by Student
        await AttendanceRecords.Indexes.CreateOneAsync(new CreateIndexModel<AttendanceRecord>(
            Builders<AttendanceRecord>.IndexKeys.Ascending(ar => ar.StudentId)));

        // Pagination Index: Groups Name (Search/Sort)
        await Groups.Indexes.CreateOneAsync(new CreateIndexModel<Group>(
            Builders<Group>.IndexKeys.Ascending(g => g.Name)));

        // Pagination Index: Students Name (Search/Sort)
        await Students.Indexes.CreateOneAsync(new CreateIndexModel<Student>(
            Builders<Student>.IndexKeys.Ascending(s => s.Name)));

        // Chat: Group + Date
        await ChatMessages.Indexes.CreateOneAsync(new CreateIndexModel<ChatMessage>(
            Builders<ChatMessage>.IndexKeys.Ascending(cm => cm.GroupId).Descending(cm => cm.SentAt)));

        // Notifications: User + Date
        await Notifications.Indexes.CreateOneAsync(new CreateIndexModel<Notification>(
            Builders<Notification>.IndexKeys.Ascending(n => n.UserId).Descending(n => n.CreatedAt)));

        // AuditLogs: Date
        await AuditLogs.Indexes.CreateOneAsync(new CreateIndexModel<AuditLog>(
            Builders<AuditLog>.IndexKeys.Descending(al => al.Timestamp)));

        // Seed Default Pricing & Curriculum Settings
        var itemsToSeed = new List<(string Key, string Value)>
        {
            (BusinessConstants.Settings.PriceLevel1, "100"),
            (BusinessConstants.Settings.PriceLevel2, "100"),
            (BusinessConstants.Settings.PriceLevel3, "100"),
            (BusinessConstants.Settings.PriceLevel4, "150"),
            (BusinessConstants.Settings.LengthLevel1, "8"),
            (BusinessConstants.Settings.LengthLevel2, "12"),
            (BusinessConstants.Settings.LengthLevel3, "16"),
            (BusinessConstants.Settings.LengthLevel4, "16")
        };

        foreach (var item in itemsToSeed)
        {
            var exists = await Settings.Find(s => s.Key == item.Key).AnyAsync();
            if (!exists)
            {
                await Settings.InsertOneAsync(new Setting { 
                    Key = item.Key, 
                    Value = item.Value, 
                    UpdatedAt = DateTimeOffset.UtcNow 
                });
            }
        }
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("Users");
    public IMongoCollection<Group> Groups => _database.GetCollection<Group>("Groups");
    public IMongoCollection<GroupSchedule> GroupSchedules => _database.GetCollection<GroupSchedule>("GroupSchedules");
    public IMongoCollection<Student> Students => _database.GetCollection<Student>("Students");
    public IMongoCollection<Session> Sessions => _database.GetCollection<Session>("Sessions");
    public IMongoCollection<AttendanceRecord> AttendanceRecords => _database.GetCollection<AttendanceRecord>("AttendanceRecords");
    public IMongoCollection<ChatMessage> ChatMessages => _database.GetCollection<ChatMessage>("ChatMessages");
    public IMongoCollection<TimetableEntry> TimetableEntries => _database.GetCollection<TimetableEntry>("TimetableEntries");
    public IMongoCollection<Setting> Settings => _database.GetCollection<Setting>("Settings");
    public IMongoCollection<EngineerCode> EngineerCodes => _database.GetCollection<EngineerCode>("EngineerCodes");
    public IMongoCollection<PendingEngineer> PendingEngineers => _database.GetCollection<PendingEngineer>("PendingEngineers");
    public IMongoCollection<Station> Stations => _database.GetCollection<Station>("Stations");
    public IMongoCollection<Notification> Notifications => _database.GetCollection<Notification>("Notifications");
    public IMongoCollection<AuditLog> AuditLogs => _database.GetCollection<AuditLog>("AuditLogs");

    public IMongoDatabase Database => _database;
}
