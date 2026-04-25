using System;
using MongoDB.Driver;
using MongoDB.Bson;

var client = new MongoClient("mongodb+srv://ValorantChampion:2BYnW4RvtkMsgp9@cluster0.odvfzoz.mongodb.net/");
var db = client.GetDatabase("SessionFlow");

// Get ALL sessions, most recent first, limit 20
Console.WriteLine("=== LAST 20 SESSIONS (Any date, sorted by ScheduledAt desc) ===");
var allSessions = db.GetCollection<BsonDocument>("Sessions")
    .Find(new BsonDocument())
    .Sort(Builders<BsonDocument>.Sort.Descending("ScheduledAt"))
    .Limit(20)
    .ToList();
Console.WriteLine($"Found {allSessions.Count} sessions total");
foreach (var s in allSessions) {
    var scheduledAt = s["ScheduledAt"];
    Console.WriteLine($"  GroupId={s["GroupId"]}, ScheduledAt={scheduledAt.ToJson()}, Status={s["Status"]}, Num={s["SessionNumber"]}");
}

// Check the ScheduledAt type more carefully with raw BSON
Console.WriteLine();
Console.WriteLine("=== RAW BSON for first 3 sessions ===");
var rawSessions = db.GetCollection<BsonDocument>("Sessions")
    .Find(new BsonDocument())
    .Sort(Builders<BsonDocument>.Sort.Descending("ScheduledAt"))
    .Limit(3)
    .ToList();
foreach (var s in rawSessions) {
    Console.WriteLine(s.ToJson());
    Console.WriteLine("---");
}

// Check total session count
var totalCount = db.GetCollection<BsonDocument>("Sessions").CountDocuments(new BsonDocument());
Console.WriteLine($"\nTotal sessions in DB: {totalCount}");

// Check if sessions exist for Saturday (DayOfWeek=6)
// Today April 25, 2026 is Saturday
Console.WriteLine();
Console.WriteLine("=== SESSIONS with GroupIds that have Saturday (DayOfWeek=6) schedules ===");
var saturdayGroupIds = db.GetCollection<BsonDocument>("GroupSchedules")
    .Find(Builders<BsonDocument>.Filter.Eq("DayOfWeek", 6))
    .ToList()
    .Select(s => s["GroupId"].AsString)
    .ToList();
Console.WriteLine($"Saturday groups: {string.Join(", ", saturdayGroupIds)}");

foreach (var gid in saturdayGroupIds) {
    var groupSessions = db.GetCollection<BsonDocument>("Sessions")
        .Find(Builders<BsonDocument>.Filter.Eq("GroupId", gid))
        .Sort(Builders<BsonDocument>.Sort.Descending("ScheduledAt"))
        .Limit(3)
        .ToList();
    Console.WriteLine($"  Group {gid}: {groupSessions.Count} recent sessions");
    foreach (var gs in groupSessions) {
        Console.WriteLine($"    ScheduledAt={gs["ScheduledAt"].ToJson()}, Status={gs["Status"]}, Num={gs["SessionNumber"]}");
    }
}
