using System;
using System.IO;
using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace FetchHtml
{
    public class Setting
    {
        [BsonId]
        public Guid Id { get; set; }
        public string Key { get; set; } = "";
        public string Value { get; set; } = "";
    }

    class Program
    {
        static void Main(string[] args)
        {
            var db = new MongoClient("mongodb+srv://salahcsedu:7JOfuHw1o9yGkHq2@cluster0.k5oou.mongodb.net/").GetDatabase("SessionFlow");
            var coll = db.GetCollection<Setting>("Settings");
            var res = coll.Find(s => s.Key == "3c_last_panel_html").FirstOrDefault();
            if (res != null) {
                File.WriteAllText("D:\\Work\\assets outer\\test\\doc_from_db.html", res.Value);
                Console.WriteLine("Saved to D:\\Work\\assets outer\\test\\doc_from_db.html");
            } else {
                Console.WriteLine("Not found in DB.");
            }
        }
    }
}
