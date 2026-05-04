using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class ProgrammingGameService
{
    private readonly IMongoCollection<DebugChallenge> _debugChallenges;
    private readonly IMongoCollection<DebugAttempt> _debugAttempts;
    private readonly IMongoCollection<CodeSnippet> _codeSnippets;
    private readonly IMongoCollection<TypingResult> _typingResults;
    private readonly IMongoCollection<AlgorithmChallenge> _algoChallenges;
    private readonly IMongoCollection<BattleMatch> _battleMatches;
    private readonly IMongoCollection<BattleStats> _battleStats;
    private readonly IMongoCollection<StackChallenge> _stackChallenges;
    private readonly IMongoCollection<StackAttempt> _stackAttempts;
    private readonly IMongoCollection<BugHunterChallenge> _bugHunterChallenges;
    private readonly IMongoCollection<BugHunterAttempt> _bugHunterAttempts;
    private readonly IMongoCollection<ApiChallenge> _apiChallenges;
    private readonly IMongoCollection<ApiRaceAttempt> _apiRaceAttempts;
    private readonly IMongoCollection<GameLeaderboardEntry> _leaderboard;

    public ProgrammingGameService(IMongoDatabase db)
    {
        _debugChallenges = db.GetCollection<DebugChallenge>("prog_debug_challenges");
        _debugAttempts = db.GetCollection<DebugAttempt>("prog_debug_attempts");
        _codeSnippets = db.GetCollection<CodeSnippet>("prog_code_snippets");
        _typingResults = db.GetCollection<TypingResult>("prog_typing_results");
        _algoChallenges = db.GetCollection<AlgorithmChallenge>("prog_algo_challenges");
        _battleMatches = db.GetCollection<BattleMatch>("prog_battle_matches");
        _battleStats = db.GetCollection<BattleStats>("prog_battle_stats");
        _stackChallenges = db.GetCollection<StackChallenge>("prog_stack_challenges");
        _stackAttempts = db.GetCollection<StackAttempt>("prog_stack_attempts");
        _bugHunterChallenges = db.GetCollection<BugHunterChallenge>("prog_bug_hunter_challenges");
        _bugHunterAttempts = db.GetCollection<BugHunterAttempt>("prog_bug_hunter_attempts");
        _apiChallenges = db.GetCollection<ApiChallenge>("prog_api_challenges");
        _apiRaceAttempts = db.GetCollection<ApiRaceAttempt>("prog_api_race_attempts");
        _leaderboard = db.GetCollection<GameLeaderboardEntry>("prog_leaderboard");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  DEBUG CHALLENGE
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<DebugChallenge?> GetRandomDebugChallengeAsync(string? domain, int? difficulty)
    {
        var fb = Builders<DebugChallenge>.Filter;
        var filter = fb.Empty;
        if (domain != null) filter &= fb.Eq(c => c.Domain, domain);
        if (difficulty.HasValue) filter &= fb.Eq(c => c.Difficulty, difficulty.Value);

        var count = await _debugChallenges.CountDocumentsAsync(filter);
        if (count == 0) return null;
        var skip = new Random().Next((int)count);
        return await _debugChallenges.Find(filter).Skip(skip).Limit(1).FirstOrDefaultAsync();
    }

    public async Task<DebugAttempt> SubmitDebugAttemptAsync(Guid userId, Guid challengeId, int selectedLine, int responseTimeMs)
    {
        var challenge = await _debugChallenges.Find(c => c.Id == challengeId).FirstOrDefaultAsync();
        if (challenge == null) throw new InvalidOperationException("Challenge not found.");

        var correct = selectedLine == challenge.BugLineNumber;
        var timeRatio = Math.Max(0, (double)(challenge.TimeLimitSeconds * 1000 - responseTimeMs) / (challenge.TimeLimitSeconds * 1000));
        var score = correct ? (int)(100 * timeRatio * challenge.Difficulty) : 0;

        var attempt = new DebugAttempt
        {
            UserId = userId, ChallengeId = challengeId, SelectedLine = selectedLine,
            Correct = correct, ResponseTimeMs = responseTimeMs, Score = score
        };
        await _debugAttempts.InsertOneAsync(attempt);
        await UpdateLeaderboardAsync(userId, "debug_challenge", score);
        return attempt;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CODE SPEED TYPE
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<CodeSnippet?> GetRandomSnippetAsync(string? domain, int? difficulty)
    {
        var fb = Builders<CodeSnippet>.Filter;
        var filter = fb.Empty;
        if (domain != null) filter &= fb.Eq(c => c.Domain, domain);
        if (difficulty.HasValue) filter &= fb.Eq(c => c.Difficulty, difficulty.Value);

        var count = await _codeSnippets.CountDocumentsAsync(filter);
        if (count == 0) return null;
        var skip = new Random().Next((int)count);
        return await _codeSnippets.Find(filter).Skip(skip).Limit(1).FirstOrDefaultAsync();
    }

    public async Task<TypingResult> SubmitTypingResultAsync(Guid userId, Guid snippetId, double wpm, double accuracy)
    {
        var snippet = await _codeSnippets.Find(s => s.Id == snippetId).FirstOrDefaultAsync();
        if (snippet == null) throw new InvalidOperationException("Snippet not found.");

        var score = (int)(wpm * (accuracy / 100.0) * snippet.Difficulty);
        var result = new TypingResult
        {
            UserId = userId, SnippetId = snippetId, Wpm = wpm, Accuracy = accuracy, Score = score
        };
        await _typingResults.InsertOneAsync(result);
        await UpdateLeaderboardAsync(userId, "code_speed_type", score);
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ALGORITHM BATTLE (PvP)
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<BattleMatch> CreateBattleAsync(Guid challengerId, string domain)
    {
        if (!ProgrammingDomains.IsValid(domain)) domain = ProgrammingDomains.WebDev;

        var questions = await _algoChallenges.Find(q => q.Domain == domain).ToListAsync();
        var rng = new Random();
        var selectedIds = questions.OrderBy(_ => rng.Next()).Take(5).Select(q => q.Id).ToList();

        var match = new BattleMatch
        {
            ChallengerId = challengerId, Domain = domain,
            QuestionIds = selectedIds, Status = "waiting"
        };
        await _battleMatches.InsertOneAsync(match);
        return match;
    }

    public async Task<BattleMatch?> JoinBattleAsync(Guid opponentId, Guid? matchId = null)
    {
        BattleMatch? match;
        if (matchId.HasValue)
            match = await _battleMatches.Find(m => m.Id == matchId.Value && m.Status == "waiting").FirstOrDefaultAsync();
        else
            match = await _battleMatches.Find(m => m.Status == "waiting" && m.ChallengerId != opponentId)
                .SortBy(m => m.CreatedAt).FirstOrDefaultAsync();

        if (match == null) return null;
        match.OpponentId = opponentId;
        match.Status = "active";
        await _battleMatches.ReplaceOneAsync(m => m.Id == match.Id, match);
        return match;
    }

    public async Task<List<AlgorithmChallenge>> GetBattleQuestionsAsync(Guid matchId)
    {
        var match = await _battleMatches.Find(m => m.Id == matchId).FirstOrDefaultAsync();
        if (match == null) return new();
        return await _algoChallenges.Find(q => match.QuestionIds.Contains(q.Id)).ToListAsync();
    }

    public async Task<BattleMatch?> SubmitBattleAnswersAsync(Guid userId, Guid matchId, List<BattleAnswer> answers)
    {
        var match = await _battleMatches.Find(m => m.Id == matchId).FirstOrDefaultAsync();
        if (match == null || match.Status != "active") return null;

        var questions = await _algoChallenges.Find(q => match.QuestionIds.Contains(q.Id)).ToListAsync();
        var qMap = questions.ToDictionary(q => q.Id);

        foreach (var a in answers)
            if (qMap.TryGetValue(a.QuestionId, out var q))
                a.Correct = a.SelectedIndex == q.CorrectIndex;

        var score = answers.Count(a => a.Correct) * 20;
        bool isChallenger = match.ChallengerId == userId;
        if (isChallenger) { match.ChallengerAnswers = answers; match.ChallengerScore = score; }
        else { match.OpponentAnswers = answers; match.OpponentScore = score; }

        if (match.ChallengerAnswers.Count > 0 && match.OpponentAnswers.Count > 0)
        {
            match.Status = "completed";
            match.CompletedAt = DateTimeOffset.UtcNow;
            match.WinnerId = match.ChallengerScore > match.OpponentScore ? match.ChallengerId
                : match.OpponentScore > match.ChallengerScore ? match.OpponentId : null;
            await UpdateBattleStatsAsync(match);
        }

        await _battleMatches.ReplaceOneAsync(m => m.Id == match.Id, match);
        return match;
    }

    private async Task UpdateBattleStatsAsync(BattleMatch match)
    {
        foreach (var uid in new[] { match.ChallengerId, match.OpponentId!.Value })
        {
            var stats = await _battleStats.Find(s => s.UserId == uid).FirstOrDefaultAsync()
                ?? new BattleStats { UserId = uid };

            stats.TotalBattles++;
            if (match.WinnerId == uid) { stats.Wins++; stats.CurrentWinStreak++; stats.Rating += 25; }
            else if (match.WinnerId == null) { stats.Draws++; stats.CurrentWinStreak = 0; }
            else { stats.Losses++; stats.CurrentWinStreak = 0; stats.Rating = Math.Max(100, stats.Rating - 15); }

            stats.BestWinStreak = Math.Max(stats.BestWinStreak, stats.CurrentWinStreak);
            await _battleStats.ReplaceOneAsync(s => s.UserId == uid, stats, new ReplaceOptions { IsUpsert = true });
        }
    }

    public async Task<BattleStats> GetBattleStatsAsync(Guid userId)
    {
        return await _battleStats.Find(s => s.UserId == userId).FirstOrDefaultAsync()
            ?? new BattleStats { UserId = userId };
    }

    public async Task<List<BattleStats>> GetBattleLeaderboardAsync(int top = 20)
    {
        return await _battleStats.Find(_ => true).SortByDescending(s => s.Rating).Limit(top).ToListAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  MEMORY STACK
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<StackChallenge?> GetRandomStackChallengeAsync(string? domain, int? difficulty)
    {
        var fb = Builders<StackChallenge>.Filter;
        var filter = fb.Empty;
        if (domain != null) filter &= fb.Eq(c => c.Domain, domain);
        if (difficulty.HasValue) filter &= fb.Eq(c => c.Difficulty, difficulty.Value);

        var count = await _stackChallenges.CountDocumentsAsync(filter);
        if (count == 0) return null;
        var skip = new Random().Next((int)count);
        return await _stackChallenges.Find(filter).Skip(skip).Limit(1).FirstOrDefaultAsync();
    }

    public async Task<StackAttempt> SubmitStackAttemptAsync(Guid userId, Guid challengeId, List<string> answers)
    {
        var challenge = await _stackChallenges.Find(c => c.Id == challengeId).FirstOrDefaultAsync();
        if (challenge == null) throw new InvalidOperationException("Challenge not found.");

        int correct = 0, combo = 0, maxCombo = 0;
        for (int i = 0; i < Math.Min(answers.Count, challenge.Steps.Count); i++)
        {
            if (string.Equals(answers[i], challenge.Steps[i].CorrectAnswer, StringComparison.OrdinalIgnoreCase))
            { correct++; combo++; maxCombo = Math.Max(maxCombo, combo); }
            else combo = 0;
        }
        var score = correct * 25 * challenge.Difficulty + maxCombo * 10;

        var attempt = new StackAttempt
        {
            UserId = userId, ChallengeId = challengeId,
            CorrectSteps = correct, TotalSteps = challenge.Steps.Count,
            Score = score, ComboMax = maxCombo
        };
        await _stackAttempts.InsertOneAsync(attempt);
        await UpdateLeaderboardAsync(userId, "memory_stack", score);
        return attempt;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  BUG HUNTER
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<BugHunterChallenge?> GetRandomBugHunterAsync(string? domain, int? difficulty)
    {
        var fb = Builders<BugHunterChallenge>.Filter;
        var filter = fb.Empty;
        if (domain != null) filter &= fb.Eq(c => c.Domain, domain);
        if (difficulty.HasValue) filter &= fb.Eq(c => c.Difficulty, difficulty.Value);

        var count = await _bugHunterChallenges.CountDocumentsAsync(filter);
        if (count == 0) return null;
        var skip = new Random().Next((int)count);
        return await _bugHunterChallenges.Find(filter).Skip(skip).Limit(1).FirstOrDefaultAsync();
    }

    public async Task<BugHunterAttempt> SubmitBugHunterAsync(Guid userId, Guid challengeId, List<int> flaggedLines, int timeSpentMs)
    {
        var challenge = await _bugHunterChallenges.Find(c => c.Id == challengeId).FirstOrDefaultAsync();
        if (challenge == null) throw new InvalidOperationException("Challenge not found.");

        var bugLines = challenge.Bugs.Select(b => b.LineNumber).ToHashSet();
        var correctFlags = flaggedLines.Count(l => bugLines.Contains(l));
        var wrongFlags = flaggedLines.Count(l => !bugLines.Contains(l));
        var score = Math.Max(0, correctFlags * 100 * challenge.Difficulty - wrongFlags * 50);

        var attempt = new BugHunterAttempt
        {
            UserId = userId, ChallengeId = challengeId, FlaggedLines = flaggedLines,
            CorrectFlags = correctFlags, WrongFlags = wrongFlags,
            Score = score, TimeSpentMs = timeSpentMs
        };
        await _bugHunterAttempts.InsertOneAsync(attempt);
        await UpdateLeaderboardAsync(userId, "bug_hunter", score);
        return attempt;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  API RACE
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<ApiChallenge?> GetRandomApiChallengeAsync(string? domain, int? difficulty)
    {
        var fb = Builders<ApiChallenge>.Filter;
        var filter = fb.Empty;
        if (domain != null) filter &= fb.Eq(c => c.Domain, domain);
        if (difficulty.HasValue) filter &= fb.Eq(c => c.Difficulty, difficulty.Value);

        var count = await _apiChallenges.CountDocumentsAsync(filter);
        if (count == 0) return null;
        var skip = new Random().Next((int)count);
        return await _apiChallenges.Find(filter).Skip(skip).Limit(1).FirstOrDefaultAsync();
    }

    public async Task<ApiRaceAttempt> SubmitApiRaceAsync(Guid userId, Guid challengeId,
        string method, string path, string body, int timeSpentMs)
    {
        var challenge = await _apiChallenges.Find(c => c.Id == challengeId).FirstOrDefaultAsync();
        if (challenge == null) throw new InvalidOperationException("Challenge not found.");

        var methodCorrect = string.Equals(method.Trim(), challenge.CorrectMethod, StringComparison.OrdinalIgnoreCase);
        var pathCorrect = string.Equals(path.Trim(), challenge.CorrectPath.Trim(), StringComparison.OrdinalIgnoreCase);
        var bodyCorrect = string.IsNullOrEmpty(challenge.CorrectBody) || NormalizeJson(body) == NormalizeJson(challenge.CorrectBody);

        var parts = (methodCorrect ? 1 : 0) + (pathCorrect ? 1 : 0) + (bodyCorrect ? 1 : 0);
        var score = parts * 33 * challenge.Difficulty;

        var attempt = new ApiRaceAttempt
        {
            UserId = userId, ChallengeId = challengeId,
            SubmittedMethod = method, SubmittedPath = path, SubmittedBody = body,
            MethodCorrect = methodCorrect, PathCorrect = pathCorrect, BodyCorrect = bodyCorrect,
            Score = score, TimeSpentMs = timeSpentMs
        };
        await _apiRaceAttempts.InsertOneAsync(attempt);
        await UpdateLeaderboardAsync(userId, "api_race", score);
        return attempt;
    }

    private static string NormalizeJson(string json) =>
        System.Text.RegularExpressions.Regex.Replace(json.Trim(), @"\s+", "");

    // ═══════════════════════════════════════════════════════════════════════════
    //  LEADERBOARD
    // ═══════════════════════════════════════════════════════════════════════════

    private async Task UpdateLeaderboardAsync(Guid userId, string gameType, int score)
    {
        var entry = await _leaderboard.Find(e => e.UserId == userId && e.GameType == gameType).FirstOrDefaultAsync();
        if (entry == null)
        {
            entry = new GameLeaderboardEntry { UserId = userId, GameType = gameType };
        }
        entry.TotalScore += score;
        entry.GamesPlayed++;
        entry.BestScore = Math.Max(entry.BestScore, score);
        entry.AverageScore = (double)entry.TotalScore / entry.GamesPlayed;
        entry.LastPlayedAt = DateTimeOffset.UtcNow;

        await _leaderboard.ReplaceOneAsync(
            e => e.UserId == userId && e.GameType == gameType, entry,
            new ReplaceOptions { IsUpsert = true });
    }

    public async Task<List<GameLeaderboardEntry>> GetLeaderboardAsync(string gameType, int top = 20)
    {
        return await _leaderboard.Find(e => e.GameType == gameType)
            .SortByDescending(e => e.TotalScore).Limit(top).ToListAsync();
    }

    public async Task<List<GameLeaderboardEntry>> GetUserStatsAsync(Guid userId)
    {
        return await _leaderboard.Find(e => e.UserId == userId).ToListAsync();
    }
}
