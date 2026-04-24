using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace SessionFlow.Desktop.Models
{
    public class SystemBroadcast
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Version { get; set; }
        public List<string> Notes { get; set; } = new List<string>();

        [BsonRepresentation(BsonType.String)]
        public Guid BroadcastedBy { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
