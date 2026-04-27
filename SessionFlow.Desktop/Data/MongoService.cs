using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using SessionFlow.Desktop.Models;
using System.Threading.Tasks;

namespace SessionFlow.Desktop.Data;

public class MongoService
{
    private readonly IMongoDatabase _database;

    private readonly SessionFlow.Desktop.Services.ITenantAccessor _tenantAccessor;
    public MongoService(IConfiguration configuration, SessionFlow.Desktop.Services.ITenantAccessor tenantAccessor)
    {
        var connectionString = configuration["Database:ConnectionString"];
        var databaseName = configuration["Database:DatabaseName"] ?? "SessionFlow";

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Critical Error: Database ConnectionString is null or empty. Please check appsettings.json.");
        }

        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);
        _tenantAccessor = tenantAccessor;
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

        // Phase 10: TTL Index — Auto-archive audit logs older than 365 days
        await AuditLogs.Indexes.CreateOneAsync(new CreateIndexModel<AuditLog>(
            Builders<AuditLog>.IndexKeys.Ascending(al => al.Timestamp),
            new CreateIndexOptions { ExpireAfter = TimeSpan.FromDays(365) }));

        // Phase 11: Compound indexes for soft-delete queries
        await Groups.Indexes.CreateOneAsync(new CreateIndexModel<Group>(
            Builders<Group>.IndexKeys.Ascending(g => g.IsDeleted).Ascending(g => g.EngineerId)));

        await Students.Indexes.CreateOneAsync(new CreateIndexModel<Student>(
            Builders<Student>.IndexKeys.Ascending(s => s.IsDeleted).Ascending(s => s.GroupId)));

        // Phase 12: Batch seed — check all keys at once, insert only missing
        var itemsToSeed = new List<(string Key, string Value)>
        {
            (BusinessConstants.Settings.PriceLevel1, "100"),
            (BusinessConstants.Settings.PriceLevel2, "100"),
            (BusinessConstants.Settings.PriceLevel3, "100"),
            (BusinessConstants.Settings.PriceLevel4, "150"),
            (BusinessConstants.Settings.LengthLevel1, "8"),
            (BusinessConstants.Settings.LengthLevel2, "12"),
            (BusinessConstants.Settings.LengthLevel3, "16"),
            (BusinessConstants.Settings.LengthLevel4, "16"),
            // Subscription Pricing (admin-editable, read by Plans page)
            (BusinessConstants.Settings.SubPriceProMonthly, "30"),
            (BusinessConstants.Settings.SubPriceProAnnual, "300"),
            (BusinessConstants.Settings.SubPriceUltraMonthly, "50"),
            (BusinessConstants.Settings.SubPriceUltraAnnual, "500"),
            (BusinessConstants.Settings.SubDescriptionFree, "Perfect for getting started and exploring SessionFlow."),
            (BusinessConstants.Settings.SubDescriptionPro, "For professional engineers who need power and scale."),
            (BusinessConstants.Settings.SubDescriptionUltra, "The ultimate experience with unlimited potential."),
            (BusinessConstants.Settings.SubFeaturesFreePlan, "[\"Up to 2 Active Groups\",\"12 Daily Messages\",\"Standard Chat Access\",\"Community Support\"]"),
            (BusinessConstants.Settings.SubFeaturesProPlan, "[\"Unlimited Active Groups\",\"30 Daily Messages\",\"Premium Badges & Themes\",\"Priority Email Support\",\"Data Export (CSV/PDF)\"]"),
            (BusinessConstants.Settings.SubFeaturesUltraPlan, "[\"Everything in Pro\",\"Unlimited Messages\",\"Admin Portal Access\",\"Custom Feature Development\",\"Dedicated Account Manager\"]")
        };

        var allKeys = itemsToSeed.Select(i => i.Key).ToList();
        var existingKeys = await Settings
            .Find(s => allKeys.Contains(s.Key))
            .Project(s => s.Key)
            .ToListAsync();
        var existingSet = existingKeys.ToHashSet();

        var missingSettings = itemsToSeed
            .Where(i => !existingSet.Contains(i.Key))
            .Select(i => new Setting { Key = i.Key, Value = i.Value, UpdatedAt = DateTimeOffset.UtcNow })
            .ToList();

        if (missingSettings.Count > 0)
        {
            await Settings.InsertManyAsync(missingSettings);
        }

        // PasswordResetTokens: Email lookup + TTL
        await PasswordResetTokens.Indexes.CreateOneAsync(new CreateIndexModel<PasswordResetToken>(
            Builders<PasswordResetToken>.IndexKeys.Ascending(t => t.Email).Ascending(t => t.IsUsed)));

        // TTL Index: Auto-delete expired tokens
        await PasswordResetTokens.Indexes.CreateOneAsync(new CreateIndexModel<PasswordResetToken>(
            Builders<PasswordResetToken>.IndexKeys.Ascending(t => t.ExpiresAt),
            new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }));

        // PREMIUM SYSTEM INDEXES
        // Subscriptions: Unique User
        await Subscriptions.Indexes.CreateOneAsync(new CreateIndexModel<Subscription>(
            Builders<Subscription>.IndexKeys.Ascending(s => s.UserId),
            new CreateIndexOptions { Unique = true }));

        // PaymentTransactions: Unique Paymob ID (Sparse to allow nulls for pending wallet/fawry)
        await PaymentTransactions.Indexes.CreateOneAsync(new CreateIndexModel<PaymentTransaction>(
            Builders<PaymentTransaction>.IndexKeys.Ascending(t => t.PaymobTransactionId),
            new CreateIndexOptions { Unique = true, Sparse = true }));
        
        await PaymentTransactions.Indexes.CreateOneAsync(new CreateIndexModel<PaymentTransaction>(
            Builders<PaymentTransaction>.IndexKeys.Ascending(t => t.UserId)));

        // Invoices: Unique Number
        await Invoices.Indexes.CreateOneAsync(new CreateIndexModel<Invoice>(
            Builders<Invoice>.IndexKeys.Ascending(i => i.InvoiceNumber),
            new CreateIndexOptions { Unique = true }));

        await Invoices.Indexes.CreateOneAsync(new CreateIndexModel<Invoice>(
            Builders<Invoice>.IndexKeys.Ascending(i => i.UserId)));
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("Users");
    public TenantRepository<Group> Groups => new TenantRepository<Group>(_database, "Groups", _tenantAccessor);
    public TenantRepository<GroupSchedule> GroupSchedules => new TenantRepository<GroupSchedule>(_database, "GroupSchedules", _tenantAccessor);
    public TenantRepository<Student> Students => new TenantRepository<Student>(_database, "Students", _tenantAccessor);
    public TenantRepository<Session> Sessions => new TenantRepository<Session>(_database, "Sessions", _tenantAccessor);
    public IMongoCollection<AttendanceRecord> AttendanceRecords => _database.GetCollection<AttendanceRecord>("AttendanceRecords");
    public IMongoCollection<ChatMessage> ChatMessages => _database.GetCollection<ChatMessage>("ChatMessages");
    public TenantRepository<TimetableEntry> TimetableEntries => new TenantRepository<TimetableEntry>(_database, "TimetableEntries", _tenantAccessor);
    public IMongoCollection<Setting> Settings => _database.GetCollection<Setting>("Settings");
    public IMongoCollection<EngineerCode> EngineerCodes => _database.GetCollection<EngineerCode>("EngineerCodes");
    public IMongoCollection<PendingEngineer> PendingEngineers => _database.GetCollection<PendingEngineer>("PendingEngineers");
    public TenantRepository<PendingStudentRequest> PendingStudentRequests => new TenantRepository<PendingStudentRequest>(_database, "PendingStudentRequests", _tenantAccessor);
    public IMongoCollection<Station> Stations => _database.GetCollection<Station>("Stations");
    public IMongoCollection<Notification> Notifications => _database.GetCollection<Notification>("Notifications");
    public IMongoCollection<AuditLog> AuditLogs => _database.GetCollection<AuditLog>("AuditLogs");
    public IMongoCollection<PasswordResetToken> PasswordResetTokens => _database.GetCollection<PasswordResetToken>("PasswordResetTokens");
    
    // Premium System Collections
    public IMongoCollection<Subscription> Subscriptions => _database.GetCollection<Subscription>("Subscriptions");
    public IMongoCollection<PaymentTransaction> PaymentTransactions => _database.GetCollection<PaymentTransaction>("PaymentTransactions");
    public IMongoCollection<Invoice> Invoices => _database.GetCollection<Invoice>("Invoices");
    public IMongoCollection<SupportTicket> SupportTickets => _database.GetCollection<SupportTicket>("SupportTickets");
    public IMongoCollection<SystemBroadcast> SystemBroadcasts => _database.GetCollection<SystemBroadcast>("SystemBroadcasts");
    public IMongoCollection<EmailChangeToken> EmailChangeTokens => _database.GetCollection<EmailChangeToken>("EmailChangeTokens");

    public IMongoDatabase Database => _database;
    public IMongoClient Client => _database.Client;
    public TenantRepository<T> GetTenantRepository<T>(string collectionName) where T : class, SessionFlow.Desktop.Models.ITenantEntity => new TenantRepository<T>(_database, collectionName, _tenantAccessor);
}

