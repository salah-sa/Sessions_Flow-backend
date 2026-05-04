using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SessionFlow.Desktop.Models;

// ═══════════════════════════════════════════════════════════════════════════════
//  DOMAIN CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// <summary>
/// Allowed programming domains across all entertainment & focus space features.
/// NO math, science, general knowledge, history, or language domains permitted.
/// </summary>
public static class ProgrammingDomains
{
    public const string GameDev = "game_dev";
    public const string WebDev = "web_dev";
    public const string AiMl = "ai_ml";
    public const string Flutter = "flutter";
    public const string BackendSystems = "backend_systems";

    public static readonly string[] All = { GameDev, WebDev, AiMl, Flutter, BackendSystems };

    public static bool IsValid(string domain) =>
        All.Contains(domain, StringComparer.OrdinalIgnoreCase);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME 1: DEBUG CHALLENGE 🐛
// ═══════════════════════════════════════════════════════════════════════════════

public class DebugChallenge
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Language { get; set; } = "javascript";
    public string Domain { get; set; } = ProgrammingDomains.WebDev;
    public string Title { get; set; } = string.Empty;

    /// <summary>Code with a deliberate bug.</summary>
    public string BuggyCode { get; set; } = string.Empty;

    /// <summary>Corrected version of the code.</summary>
    public string FixedCode { get; set; } = string.Empty;

    /// <summary>1-based line number where the bug is.</summary>
    public int BugLineNumber { get; set; }

    public string BugExplanation { get; set; } = string.Empty;

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;

    /// <summary>Time limit in seconds: 30/45/60 by difficulty.</summary>
    public int TimeLimitSeconds { get; set; } = 30;
}

public class DebugAttempt
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid ChallengeId { get; set; }
    public int SelectedLine { get; set; }
    public bool Correct { get; set; }
    public int ResponseTimeMs { get; set; }
    public int Score { get; set; }
    public DateTimeOffset AttemptedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME 2: CODE SPEED TYPE ⌨️
// ═══════════════════════════════════════════════════════════════════════════════

public class CodeSnippet
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Language { get; set; } = "javascript";
    public string Domain { get; set; } = ProgrammingDomains.WebDev;
    public string Description { get; set; } = string.Empty;

    /// <summary>The exact code the player must type.</summary>
    public string Code { get; set; } = string.Empty;

    public int CharacterCount { get; set; }

    /// <summary>1 = easy (short), 2 = medium, 3 = hard (complex)</summary>
    public int Difficulty { get; set; } = 1;
}

public class TypingResult
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid SnippetId { get; set; }
    public double Wpm { get; set; }
    public double Accuracy { get; set; }
    public int Score { get; set; }
    public DateTimeOffset CompletedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME 3: ALGORITHM BATTLE ⚔️ (PvP Real-Time)
// ═══════════════════════════════════════════════════════════════════════════════

public class AlgorithmChallenge
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Domain { get; set; } = ProgrammingDomains.BackendSystems;
    public string ProblemStatement { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
    public string Explanation { get; set; } = string.Empty;

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;

    public int TimeLimitSeconds { get; set; } = 20;
}

/// <summary>PvP battle match for Algorithm Battle and Focus Space.</summary>
public class BattleMatch
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ChallengerId { get; set; }
    public Guid? OpponentId { get; set; }

    /// <summary>"waiting", "active", "completed", "expired", "forfeited"</summary>
    public string Status { get; set; } = "waiting";

    public string Domain { get; set; } = ProgrammingDomains.WebDev;
    public List<Guid> QuestionIds { get; set; } = new();
    public List<BattleAnswer> ChallengerAnswers { get; set; } = new();
    public List<BattleAnswer> OpponentAnswers { get; set; } = new();
    public int ChallengerScore { get; set; }
    public int OpponentScore { get; set; }
    public Guid? WinnerId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}

public class BattleAnswer
{
    public Guid QuestionId { get; set; }
    public int SelectedIndex { get; set; } = -1;
    public bool Correct { get; set; }
    public double ResponseTimeMs { get; set; }
}

public class BattleStats
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public int TotalBattles { get; set; }
    public int CurrentWinStreak { get; set; }
    public int BestWinStreak { get; set; }
    public int Rating { get; set; } = 1000;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME 4: MEMORY STACK 🧠
// ═══════════════════════════════════════════════════════════════════════════════

public class StackChallenge
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Language { get; set; } = "javascript";
    public string Domain { get; set; } = ProgrammingDomains.WebDev;

    /// <summary>Code that the player must mentally execute.</summary>
    public string Code { get; set; } = string.Empty;

    public List<StackStep> Steps { get; set; } = new();

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;
}

public class StackStep
{
    public int StepNumber { get; set; }
    public string Question { get; set; } = string.Empty;
    public string CorrectAnswer { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
}

public class StackAttempt
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid ChallengeId { get; set; }
    public int CorrectSteps { get; set; }
    public int TotalSteps { get; set; }
    public int Score { get; set; }
    public int ComboMax { get; set; }
    public DateTimeOffset CompletedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME 5: BUG HUNTER 🔍
// ═══════════════════════════════════════════════════════════════════════════════

public class BugHunterChallenge
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Language { get; set; } = "javascript";
    public string Domain { get; set; } = ProgrammingDomains.WebDev;
    public string Title { get; set; } = string.Empty;

    /// <summary>Code block with hidden bugs (20–40 lines).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Exactly 3 bugs per challenge.</summary>
    public List<BugLocation> Bugs { get; set; } = new();

    public int TimeLimitSeconds { get; set; } = 90;

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;
}

public class BugLocation
{
    public int LineNumber { get; set; }

    /// <summary>"off-by-one", "null-ref", "race-condition", "wrong-operator", etc.</summary>
    public string BugType { get; set; } = string.Empty;

    public string Explanation { get; set; } = string.Empty;
}

public class BugHunterAttempt
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid ChallengeId { get; set; }
    public List<int> FlaggedLines { get; set; } = new();
    public int CorrectFlags { get; set; }
    public int WrongFlags { get; set; }
    public int Score { get; set; }
    public int TimeSpentMs { get; set; }
    public DateTimeOffset CompletedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME 6: API RACE 🏎️
// ═══════════════════════════════════════════════════════════════════════════════

public class ApiChallenge
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Domain { get; set; } = ProgrammingDomains.WebDev;
    public string TaskDescription { get; set; } = string.Empty;
    public string CorrectMethod { get; set; } = "GET";
    public string CorrectPath { get; set; } = string.Empty;

    /// <summary>Expected request body template (JSON string or empty).</summary>
    public string CorrectBody { get; set; } = string.Empty;

    public int ExpectedStatusCode { get; set; } = 200;

    /// <summary>1 = easy, 2 = medium, 3 = hard</summary>
    public int Difficulty { get; set; } = 1;
}

public class ApiRaceAttempt
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid ChallengeId { get; set; }
    public string SubmittedMethod { get; set; } = string.Empty;
    public string SubmittedPath { get; set; } = string.Empty;
    public string SubmittedBody { get; set; } = string.Empty;
    public bool MethodCorrect { get; set; }
    public bool PathCorrect { get; set; }
    public bool BodyCorrect { get; set; }
    public int Score { get; set; }
    public int TimeSpentMs { get; set; }
    public DateTimeOffset CompletedAt { get; set; } = DateTimeOffset.UtcNow;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UNIFIED GAME LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════

public class GameLeaderboardEntry
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    /// <summary>"debug_challenge", "code_speed_type", "algorithm_battle", "memory_stack", "bug_hunter", "api_race"</summary>
    public string GameType { get; set; } = string.Empty;

    public int TotalScore { get; set; }
    public int GamesPlayed { get; set; }
    public int BestScore { get; set; }
    public double AverageScore { get; set; }
    public DateTimeOffset LastPlayedAt { get; set; } = DateTimeOffset.UtcNow;
}
