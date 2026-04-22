using System;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Bson;

class Program {
    static async Task Main() {
        var client = new MongoClient("mongodb+srv://ValorantChampion:2BYnW4RvtkMsgp9@cluster0.odvfzoz.mongodb.net/");
        var db = client.GetDatabase("SessionFlow");
        
        Console.WriteLine("--- Settings ---");
        var settings = await db.GetCollection<BsonDocument>("Settings").Find(new BsonDocument()).ToListAsync();
        foreach (var s in settings) {
            Console.WriteLine($"Key: {s.GetValue("Key", "N/A")}, Value: {s.GetValue("Value", "N/A")}");
        }
    }
}
