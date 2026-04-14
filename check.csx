using System;
using MongoDB.Driver;
using MongoDB.Bson;

var client = new MongoClient("mongodb://localhost:27017");
var db = client.GetDatabase("SessionFlow");
var users = db.GetCollection<BsonDocument>("Users").Find(new BsonDocument()).ToList();
foreach(var u in users) {
    Console.WriteLine($"ID: {u["_id"]}, Name: {(u.Contains("Name")?u["Name"]:"")}, Username: {(u.Contains("Username")?u["Username"]:"")}, Email: {(u.Contains("Email")?u["Email"]:"")}, Role: {u["Role"]}, IsApproved: {u["IsApproved"]}");
}
