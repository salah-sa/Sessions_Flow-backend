using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

// ─── Quote of the Day ────────────────────────────────────────────────────────

public class Quote
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Text { get; set; } = string.Empty;
    public string Author { get; set; } = "Unknown";

    /// <summary>Category: "motivation", "humor", "philosophy", "science"</summary>
    public string Category { get; set; } = "motivation";

    public int DayIndex { get; set; } // 0-based index for deterministic daily selection
}

public class QuoteStreak
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public int CurrentStreak { get; set; } = 0;
    public int LongestStreak { get; set; } = 0;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.MinValue;
    public List<Guid> LikedQuoteIds { get; set; } = new();
    public Guid? PinnedQuoteId { get; set; }
}

// ─── Riddle Labyrinth ────────────────────────────────────────────────────────

public class Riddle
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Text { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;

    /// <summary>Three progressive hints, revealed one at a time.</summary>
    public List<string> Hints { get; set; } = new();

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;

    public int DayIndex { get; set; } // deterministic daily selection
}

public class RiddleAttempt
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid RiddleId { get; set; }
    public bool Solved { get; set; } = false;
    public int HintsUsed { get; set; } = 0;
    public int WrongAttempts { get; set; } = 0;

    /// <summary>Score: 100 (no hints) → 75 → 50 → 25</summary>
    public int Score { get; set; } = 0;

    public DateTimeOffset SolvedAt { get; set; } = DateTimeOffset.MinValue;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ─── Roaster Lines ───────────────────────────────────────────────────────────

public class RoastLine
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Text { get; set; } = string.Empty;

    /// <summary>"idle", "return", "streak"</summary>
    public string Category { get; set; } = "idle";

    /// <summary>Minimum idle minutes before this line can trigger.</summary>
    public int MinIdleMinutes { get; set; } = 5;
}

// ─── Brain Duel Arena (Phase 2) ─────────────────────────────────────────────

public class DuelQuestion
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Text { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new(); // 4 choices
    public int CorrectIndex { get; set; } // 0-based index of correct answer

    /// <summary>"math", "science", "language", "general", "history"</summary>
    public string Subject { get; set; } = "general";

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;

    /// <summary>Time limit in seconds per question.</summary>
    public int TimeLimitSeconds { get; set; } = 15;
}

public class DuelMatch
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ChallengerId { get; set; }
    public Guid? OpponentId { get; set; }   // null = waiting for opponent

    /// <summary>"waiting", "active", "completed", "expired"</summary>
    public string Status { get; set; } = "waiting";

    public string Subject { get; set; } = "general";
    public List<Guid> QuestionIds { get; set; } = new(); // 5 questions per duel
    public List<DuelAnswer> ChallengerAnswers { get; set; } = new();
    public List<DuelAnswer> OpponentAnswers { get; set; } = new();
    public int ChallengerScore { get; set; } = 0;
    public int OpponentScore { get; set; } = 0;
    public Guid? WinnerId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}

public class DuelAnswer
{
    public Guid QuestionId { get; set; }
    public int SelectedIndex { get; set; } = -1; // -1 = unanswered / timed out
    public bool Correct { get; set; } = false;
    public double ResponseTimeMs { get; set; } = 0;
}

public class DuelStats
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public int Wins { get; set; } = 0;
    public int Losses { get; set; } = 0;
    public int Draws { get; set; } = 0;
    public int TotalDuels { get; set; } = 0;
    public int CurrentWinStreak { get; set; } = 0;
    public int BestWinStreak { get; set; } = 0;
    public int Rating { get; set; } = 1000; // ELO-style rating
}

// ─── Focus Beast (Phase 2) ──────────────────────────────────────────────────

public class FocusBeast
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public string Name { get; set; } = "Sparky";

    /// <summary>"egg", "hatchling", "juvenile", "warrior", "legend"</summary>
    public string Stage { get; set; } = "egg";

    public int Experience { get; set; } = 0;
    public int Level { get; set; } = 1;
    public int Health { get; set; } = 100;      // Decreases during idle periods
    public int MaxHealth { get; set; } = 100;

    /// <summary>Emoji or icon identifier for the beast.</summary>
    public string Avatar { get; set; } = "🥚";

    /// <summary>Total focused minutes contributing to growth.</summary>
    public int TotalFocusMinutes { get; set; } = 0;

    /// <summary>Minutes idle that damaged health today.</summary>
    public int IdleDamageToday { get; set; } = 0;

    public DateTimeOffset LastFedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastIdleCheckAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ─── Meme Forge (Phase 2) ───────────────────────────────────────────────────

public class MemeTemplate
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    /// <summary>Emoji representation of the template for UI.</summary>
    public string Emoji { get; set; } = "😂";

    /// <summary>Format string: "When {top} but {bottom}"</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>"study", "exam", "homework", "teacher", "general"</summary>
    public string Category { get; set; } = "general";

    public bool Active { get; set; } = true;
}

public class CreatedMeme
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuthorId { get; set; }
    public Guid TemplateId { get; set; }
    public string TopText { get; set; } = string.Empty;
    public string BottomText { get; set; } = string.Empty;

    /// <summary>The final rendered text combining template + user input.</summary>
    public string RenderedText { get; set; } = string.Empty;

    public int Upvotes { get; set; } = 0;
    public int Downvotes { get; set; } = 0;
    public List<Guid> UpvotedBy { get; set; } = new();
    public List<Guid> DownvotedBy { get; set; } = new();

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Flagged for moderation?</summary>
    public bool Flagged { get; set; } = false;
}
