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

        // ── Version update fields (existing) ──────────────────────────────
        public string Version { get; set; } = "1.0.0";
        public List<string> Notes { get; set; } = new List<string>();

        // ── Custom admin message fields (new) ─────────────────────────────

        /// <summary>True = custom message blast; False = version update.</summary>
        public bool IsCustomMessage { get; set; } = false;

        /// <summary>Admin-authored subject line (max 5000 chars).</summary>
        [BsonIgnoreIfNull]
        public string? CustomSubject { get; set; }

        /// <summary>Admin-authored message body (max 2000 chars, sanitized).</summary>
        [BsonIgnoreIfNull]
        public string? CustomMessage { get; set; }

        /// <summary>"InApp", "Email", or "Both"</summary>
        public string Channel { get; set; } = "InApp";

        /// <summary>How many users received this broadcast.</summary>
        public int RecipientCount { get; set; } = 0;

        /// <summary>Whether the background email send has completed.</summary>
        public bool EmailSendCompleted { get; set; } = false;

        /// <summary>Number of emails successfully delivered.</summary>
        public int EmailSentCount { get; set; } = 0;

        /// <summary>Number of emails that failed to deliver.</summary>
        public int EmailFailedCount { get; set; } = 0;

        /// <summary>Batch-level error message if the entire send loop crashed.</summary>
        [BsonIgnoreIfNull]
        public string? EmailError { get; set; }

        [BsonIgnoreIfNull]
        public DateTimeOffset? EmailSentAt { get; set; }

        // ── Common ────────────────────────────────────────────────────────
        [BsonRepresentation(BsonType.String)]
        public Guid BroadcastedBy { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
