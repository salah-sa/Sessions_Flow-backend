using System;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Bson;

class Program {
    static async Task Main() {
        var client = new MongoClient("mongodb+srv://ValorantChampion:2BYnW4RvtkMsgp9@cluster0.odvfzoz.mongodb.net/");
        var db = client.GetDatabase("SessionFlow");
        var settingsCol = db.GetCollection<BsonDocument>("Settings");
        
        var filter = Builders<BsonDocument>.Filter.Eq("Key", "admin_email_app_password");
        var update = Builders<BsonDocument>.Update.Set("Value", "shkp mvzk wsei qzed");
        
        var result = await settingsCol.UpdateOneAsync(filter, update);
        Console.WriteLine($"Modified: {result.ModifiedCount}");
    }
}
