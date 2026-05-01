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
        Serilog.Log.Information("[Mongo] Initialized MongoService for database: {DatabaseName}", databaseName);
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

        // Sessions: Group + Date (Unique — prevents duplicate session creation under concurrent maintenance)
        await Sessions.Indexes.CreateOneAsync(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys.Ascending(s => s.GroupId).Ascending(s => s.ScheduledAt),
            new CreateIndexOptions { Unique = true }));
            
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

        await Sessions.Indexes.CreateOneAsync(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys.Ascending(s => s.EngineerId)));

        // Attendance: Session + Student (Unique)
        await AttendanceRecords.Indexes.CreateOneAsync(new CreateIndexModel<AttendanceRecord>(
            Builders<AttendanceRecord>.IndexKeys.Ascending(ar => ar.SessionId).Ascending(ar => ar.StudentId),
            new CreateIndexOptions { Unique = true }));

        // Pagination/Detail Index: Attendance by Student
        await AttendanceRecords.Indexes.CreateOneAsync(new CreateIndexModel<AttendanceRecord>(
            Builders<AttendanceRecord>.IndexKeys.Ascending(ar => ar.StudentId)));

        await AttendanceRecords.Indexes.CreateOneAsync(new CreateIndexModel<AttendanceRecord>(
            Builders<AttendanceRecord>.IndexKeys.Ascending(ar => ar.EngineerId)));

        // Pagination Index: Groups Name (Search/Sort)
        await Groups.Indexes.CreateOneAsync(new CreateIndexModel<Group>(
            Builders<Group>.IndexKeys.Ascending(g => g.Name)));

        // Pagination Index: Students Name (Search/Sort)
        await Students.Indexes.CreateOneAsync(new CreateIndexModel<Student>(
            Builders<Student>.IndexKeys.Ascending(s => s.Name)));

        await Students.Indexes.CreateOneAsync(new CreateIndexModel<Student>(
            Builders<Student>.IndexKeys.Ascending(s => s.EngineerId)));

        // Chat: Group + Date
        await ChatMessages.Indexes.CreateOneAsync(new CreateIndexModel<ChatMessage>(
            Builders<ChatMessage>.IndexKeys.Ascending(cm => cm.GroupId).Descending(cm => cm.SentAt)));

        await ChatMessages.Indexes.CreateOneAsync(new CreateIndexModel<ChatMessage>(
            Builders<ChatMessage>.IndexKeys.Ascending(cm => cm.EngineerId)));

        // Phase 9: TTL Index — Auto-delete chat messages older than 90 days
        await ChatMessages.Indexes.CreateOneAsync(new CreateIndexModel<ChatMessage>(
            Builders<ChatMessage>.IndexKeys.Ascending(cm => cm.SentAt),
            new CreateIndexOptions { ExpireAfter = TimeSpan.FromDays(90) }));

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
            (BusinessConstants.Settings.SubPriceProMonthly, "50"),
            (BusinessConstants.Settings.SubPriceProAnnual, "528"),
            (BusinessConstants.Settings.SubPriceUltraMonthly, "100"),
            (BusinessConstants.Settings.SubPriceUltraAnnual, "1056"),
            (BusinessConstants.Settings.SubPriceEnterpriseMonthly, "130"),
            (BusinessConstants.Settings.SubPriceEnterpriseAnnual, "1380"),
            (BusinessConstants.Settings.SubDescriptionFree, "Perfect for getting started and exploring SessionFlow."),
            (BusinessConstants.Settings.SubDescriptionPro, "For professional engineers who need power and scale."),
            (BusinessConstants.Settings.SubDescriptionUltra, "Maximum power for high-volume educators."),
            (BusinessConstants.Settings.SubDescriptionEnterprise, "White-glove service for large educational institutions."),
            (BusinessConstants.Settings.SubFeaturesFreePlan, "[\"Up to 10 Groups\",\"15 Daily Messages\",\"1 Daily Image\",\"Basic Attendance\",\"Community Support\"]"),
            (BusinessConstants.Settings.SubFeaturesProPlan, "[\"15 Groups\",\"Unlimited Messages\",\"4 Daily Images\",\"Voice Calls\",\"Priority Support\",\"Data Export\"]"),
            (BusinessConstants.Settings.SubFeaturesUltraPlan, "[\"100 Groups\",\"12 Daily Images\",\"5 Daily Videos\",\"10 Daily Files\",\"AI Summaries\",\"Advanced Analytics\"]"),
            (BusinessConstants.Settings.SubFeaturesEnterprisePlan, "[\"Unlimited Groups\",\"Admin Portal Access\",\"Custom Features\",\"Dedicated Account Manager\",\"White-labeled Reports\"]")
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

        // Wallet System Indexes
        await Wallets.Indexes.CreateOneAsync(new CreateIndexModel<Wallet>(
            Builders<Wallet>.IndexKeys.Ascending(w => w.PhoneNumber),
            new CreateIndexOptions { Unique = true }));

        await Wallets.Indexes.CreateOneAsync(new CreateIndexModel<Wallet>(
            Builders<Wallet>.IndexKeys.Ascending(w => w.UserId),
            new CreateIndexOptions { Unique = true }));

        await Wallets.Indexes.CreateOneAsync(new CreateIndexModel<Wallet>(
            Builders<Wallet>.IndexKeys.Ascending(w => w.IsActive)));

        await Transactions.Indexes.CreateOneAsync(new CreateIndexModel<Transaction>(
            Builders<Transaction>.IndexKeys.Ascending(t => t.ReferenceCode),
            new CreateIndexOptions { Unique = true }));

        await Transactions.Indexes.CreateOneAsync(new CreateIndexModel<Transaction>(
            Builders<Transaction>.IndexKeys.Ascending(t => t.FromWalletId).Descending(t => t.CreatedAt)));

        await Transactions.Indexes.CreateOneAsync(new CreateIndexModel<Transaction>(
            Builders<Transaction>.IndexKeys.Ascending(t => t.ToWalletId).Descending(t => t.CreatedAt)));

        await Transactions.Indexes.CreateOneAsync(new CreateIndexModel<Transaction>(
            Builders<Transaction>.IndexKeys.Descending(t => t.CreatedAt)));

        // Deposit Requests
        await DepositRequests.Indexes.CreateOneAsync(new CreateIndexModel<DepositRequest>(
            Builders<DepositRequest>.IndexKeys.Ascending(d => d.UserId).Descending(d => d.CreatedAt)));

        await DepositRequests.Indexes.CreateOneAsync(new CreateIndexModel<DepositRequest>(
            Builders<DepositRequest>.IndexKeys.Ascending(d => d.Status).Descending(d => d.CreatedAt)));
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
    public IMongoCollection<PendingStudentRequest> PendingStudentRequests => _database.GetCollection<PendingStudentRequest>("PendingStudentRequests");
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

    public IMongoCollection<ResourceAccessRequest> ResourceAccessRequests => _database.GetCollection<ResourceAccessRequest>("ResourceAccessRequests");
    public IMongoCollection<AccessGrant> AccessGrants => _database.GetCollection<AccessGrant>("AccessGrants");

    // Wallet System
    public IMongoCollection<Wallet> Wallets => _database.GetCollection<Wallet>("Wallets");
    public IMongoCollection<Transaction> Transactions => _database.GetCollection<Transaction>("Transactions");
    public IMongoCollection<DepositRequest> DepositRequests => _database.GetCollection<DepositRequest>("DepositRequests");

    public IMongoDatabase Database => _database;
    public IMongoClient Client => _database.Client;
}

