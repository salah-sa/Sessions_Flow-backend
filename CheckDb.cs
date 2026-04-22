using System;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Bson;

class Program {
    static async Task Main() {
        var client = new MongoClient("mongodb+srv://ValorantChampion:2BYnW4RvtkMsgp9@cluster0.odvfzoz.mongodb.net/");
        var db = client.GetDatabase("SessionFlow");
        
        Console.WriteLine("--- Users ---");
        var users = await db.GetCollection<BsonDocument>("Users").Find(new BsonDocument()).ToListAsync();
        foreach (var u in users) {
            Console.WriteLine($"Role: {u.GetValue("Role", "N/A")}, Username: {u.GetValue("Username", "N/A")}, Email: {u.GetValue("Email", "N/A")}, Approved: {u.GetValue("IsApproved", false)}");
        }

        Console.WriteLine("\n--- Pending Student Requests ---");
        var pending = await db.GetCollection<BsonDocument>("PendingStudentRequests").Find(new BsonDocument()).ToListAsync();
        foreach (var p in pending) {
            Console.WriteLine($"Name: {p.GetValue("Name", "N/A")}, Email: {p.GetValue("Email", "N/A")}, Status: {p.GetValue("Status", "N/A")}");
        }
    }
}
