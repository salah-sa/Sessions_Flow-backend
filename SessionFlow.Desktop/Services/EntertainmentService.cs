using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class EntertainmentService
{
    private readonly IMongoCollection<DebugChallenge> _debugChallenges;
    private readonly IMongoCollection<CodeSpeedSnippet> _codeSpeedSnippets;
    private readonly IMongoCollection<AlgorithmBattleQuestion> _algorithmQuestions;
    private readonly IMongoCollection<MemoryStackCard> _memoryCards;
    private readonly IMongoCollection<BugHunterScenario> _bugHunterScenarios;
    private readonly IMongoCollection<ApiRaceChallenge> _apiRaceChallenges;
    private readonly IMongoCollection<PlayerScore> _playerScores;
    private readonly IMongoCollection<BattleMatch> _battleMatches;

    public EntertainmentService(IMongoDatabase db)
    {
        _debugChallenges = db.GetCollection<DebugChallenge>("debug_challenges");
        _codeSpeedSnippets = db.GetCollection<CodeSpeedSnippet>("code_speed_snippets");
        _algorithmQuestions = db.GetCollection<AlgorithmBattleQuestion>("algorithm_battle_questions");
        _memoryCards = db.GetCollection<MemoryStackCard>("memory_stack_cards");
        _bugHunterScenarios = db.GetCollection<BugHunterScenario>("bug_hunter_scenarios");
        _apiRaceChallenges = db.GetCollection<ApiRaceChallenge>("api_race_challenges");
        _playerScores = db.GetCollection<PlayerScore>("player_scores");
        _battleMatches = db.GetCollection<BattleMatch>("battle_matches");
    }

    // ══════════════════════════════════════════════════════════════
    //  DEBUG CHALLENGE
    // ══════════════════════════════════════════════════════════════

    public async Task<List<DebugChallenge>> GetDebugChallengesAsync(string? domain = null, string? difficulty = null)
    {
        var fb = Builders<DebugChallenge>.Filter;
        var filter = fb.Empty;
        if (!string.IsNullOrEmpty(domain)) filter &= fb.Eq(x => x.Domain, domain);
        if (!string.IsNullOrEmpty(difficulty)) filter &= fb.Eq(x => x.Difficulty, difficulty);
        return await _debugChallenges.Find(filter).Limit(10).ToListAsync();
    }

    public async Task<DebugChallenge?> GetDebugChallengeByIdAsync(Guid id) =>
        await _debugChallenges.Find(x => x.Id == id).FirstOrDefaultAsync();

    public async Task<DebugChallenge?> GetRandomDebugChallengeAsync(string? domain = null)
    {
        var fb = Builders<DebugChallenge>.Filter;
        var filter = !string.IsNullOrEmpty(domain) ? fb.Eq(x => x.Domain, domain) : fb.Empty;
        var count = await _debugChallenges.CountDocumentsAsync(filter);
        if (count == 0) return null;
        var skip = new Random().Next((int)count);
        return await _debugChallenges.Find(filter).Skip(skip).Limit(1).FirstOrDefaultAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  CODE SPEED TYPE
    // ══════════════════════════════════════════════════════════════

    public async Task<List<CodeSpeedSnippet>> GetCodeSpeedSnippetsAsync(string? language = null)
    {
        var filter = !string.IsNullOrEmpty(language)
            ? Builders<CodeSpeedSnippet>.Filter.Eq(x => x.Language, language)
            : Builders<CodeSpeedSnippet>.Filter.Empty;
        return await _codeSpeedSnippets.Find(filter).Limit(10).ToListAsync();
    }

    public async Task<CodeSpeedSnippet?> GetRandomCodeSpeedSnippetAsync(string? language = null)
    {
        var filter = !string.IsNullOrEmpty(language)
            ? Builders<CodeSpeedSnippet>.Filter.Eq(x => x.Language, language)
            : Builders<CodeSpeedSnippet>.Filter.Empty;
        var count = await _codeSpeedSnippets.CountDocumentsAsync(filter);
        if (count == 0) return null;
        return await _codeSpeedSnippets.Find(filter).Skip(new Random().Next((int)count)).Limit(1).FirstOrDefaultAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  ALGORITHM BATTLE
    // ══════════════════════════════════════════════════════════════

    public async Task<List<AlgorithmBattleQuestion>> GetAlgorithmQuestionsAsync(string? domain = null)
    {
        var filter = !string.IsNullOrEmpty(domain)
            ? Builders<AlgorithmBattleQuestion>.Filter.Eq(x => x.Domain, domain)
            : Builders<AlgorithmBattleQuestion>.Filter.Empty;
        return await _algorithmQuestions.Find(filter).Limit(10).ToListAsync();
    }

    public async Task<AlgorithmBattleQuestion?> GetRandomAlgorithmQuestionAsync(string? domain = null)
    {
        var filter = !string.IsNullOrEmpty(domain)
            ? Builders<AlgorithmBattleQuestion>.Filter.Eq(x => x.Domain, domain)
            : Builders<AlgorithmBattleQuestion>.Filter.Empty;
        var count = await _algorithmQuestions.CountDocumentsAsync(filter);
        if (count == 0) return null;
        return await _algorithmQuestions.Find(filter).Skip(new Random().Next((int)count)).Limit(1).FirstOrDefaultAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  MEMORY STACK
    // ══════════════════════════════════════════════════════════════

    public async Task<List<MemoryStackCard>> GetMemoryCardsAsync(string? domain = null)
    {
        var filter = !string.IsNullOrEmpty(domain)
            ? Builders<MemoryStackCard>.Filter.Eq(x => x.Domain, domain)
            : Builders<MemoryStackCard>.Filter.Empty;
        return await _memoryCards.Find(filter).Limit(20).ToListAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  BUG HUNTER
    // ══════════════════════════════════════════════════════════════

    public async Task<List<BugHunterScenario>> GetBugHunterScenariosAsync(string? domain = null)
    {
        var filter = !string.IsNullOrEmpty(domain)
            ? Builders<BugHunterScenario>.Filter.Eq(x => x.Domain, domain)
            : Builders<BugHunterScenario>.Filter.Empty;
        return await _bugHunterScenarios.Find(filter).Limit(10).ToListAsync();
    }

    public async Task<BugHunterScenario?> GetRandomBugHunterAsync(string? domain = null)
    {
        var filter = !string.IsNullOrEmpty(domain)
            ? Builders<BugHunterScenario>.Filter.Eq(x => x.Domain, domain)
            : Builders<BugHunterScenario>.Filter.Empty;
        var count = await _bugHunterScenarios.CountDocumentsAsync(filter);
        if (count == 0) return null;
        return await _bugHunterScenarios.Find(filter).Skip(new Random().Next((int)count)).Limit(1).FirstOrDefaultAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  API RACE
    // ══════════════════════════════════════════════════════════════

    public async Task<List<ApiRaceChallenge>> GetApiRaceChallengesAsync(string? difficulty = null)
    {
        var filter = !string.IsNullOrEmpty(difficulty)
            ? Builders<ApiRaceChallenge>.Filter.Eq(x => x.Difficulty, difficulty)
            : Builders<ApiRaceChallenge>.Filter.Empty;
        return await _apiRaceChallenges.Find(filter).Limit(10).ToListAsync();
    }

    public async Task<ApiRaceChallenge?> GetRandomApiRaceAsync()
    {
        var count = await _apiRaceChallenges.CountDocumentsAsync(Builders<ApiRaceChallenge>.Filter.Empty);
        if (count == 0) return null;
        return await _apiRaceChallenges.Find(_ => true).Skip(new Random().Next((int)count)).Limit(1).FirstOrDefaultAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  PLAYER SCORES & LEADERBOARD
    // ══════════════════════════════════════════════════════════════

    public async Task<PlayerScore?> GetPlayerScoreAsync(Guid userId)
    {
        return await _playerScores.Find(x => x.UserId == userId).FirstOrDefaultAsync();
    }

    public async Task RecordScoreAsync(Guid userId, string gameType, int points)
    {
        var existing = await _playerScores.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        if (existing == null)
        {
            existing = new PlayerScore { UserId = userId };
            await _playerScores.InsertOneAsync(existing);
        }

        var update = Builders<PlayerScore>.Update
            .Inc(x => x.TotalPoints, points)
            .Inc(x => x.GamesPlayed, 1)
            .Set(x => x.LastPlayedAt, DateTimeOffset.UtcNow);

        switch (gameType)
        {
            case "debug_challenge": update = update.Inc(x => x.DebugChallengesCompleted, 1); break;
            case "code_speed": update = update.Inc(x => x.CodeSpeedRoundsPlayed, 1); break;
            case "algorithm_battle": update = update.Inc(x => x.AlgorithmBattlesWon, 1); break;
            case "memory_stack": update = update.Inc(x => x.MemoryStackHighScore, points); break;
            case "bug_hunter": update = update.Inc(x => x.BugHunterCompleted, 1); break;
            case "api_race": update = update.Inc(x => x.ApiRacesCompleted, 1); break;
        }

        await _playerScores.UpdateOneAsync(x => x.UserId == userId, update);
    }

    public async Task<List<PlayerScore>> GetLeaderboardAsync(int limit = 20)
    {
        return await _playerScores.Find(_ => true)
            .SortByDescending(x => x.TotalPoints)
            .Limit(limit)
            .ToListAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  BATTLE MATCHES (PvP)
    // ══════════════════════════════════════════════════════════════

    public async Task<BattleMatch> CreateBattleAsync(Guid creatorId, string domain)
    {
        var match = new BattleMatch
        {
            CreatorId = creatorId,
            Domain = domain,
            Status = "waiting"
        };
        await _battleMatches.InsertOneAsync(match);
        return match;
    }

    public async Task<BattleMatch?> JoinBattleAsync(Guid matchId, Guid opponentId)
    {
        var update = Builders<BattleMatch>.Update
            .Set(x => x.OpponentId, opponentId)
            .Set(x => x.Status, "active")
            .Set(x => x.StartedAt, DateTimeOffset.UtcNow);
        return await _battleMatches.FindOneAndUpdateAsync(
            x => x.Id == matchId && x.Status == "waiting",
            update,
            new FindOneAndUpdateOptions<BattleMatch> { ReturnDocument = ReturnDocument.After });
    }

    public async Task<BattleMatch?> CompleteBattleAsync(Guid matchId, Guid winnerId, int winnerScore, int loserScore)
    {
        var update = Builders<BattleMatch>.Update
            .Set(x => x.WinnerId, winnerId)
            .Set(x => x.Status, "completed")
            .Set(x => x.WinnerScore, winnerScore)
            .Set(x => x.LoserScore, loserScore)
            .Set(x => x.CompletedAt, DateTimeOffset.UtcNow);
        return await _battleMatches.FindOneAndUpdateAsync(
            x => x.Id == matchId,
            update,
            new FindOneAndUpdateOptions<BattleMatch> { ReturnDocument = ReturnDocument.After });
    }

    public async Task<BattleMatch?> GetBattleAsync(Guid matchId) =>
        await _battleMatches.Find(x => x.Id == matchId).FirstOrDefaultAsync();

    public async Task<List<BattleMatch>> GetUserBattleHistoryAsync(Guid userId, int limit = 20)
    {
        var filter = Builders<BattleMatch>.Filter.Or(
            Builders<BattleMatch>.Filter.Eq(x => x.CreatorId, userId),
            Builders<BattleMatch>.Filter.Eq(x => x.OpponentId, userId));
        return await _battleMatches.Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<BattleMatch?> FindOpenBattleAsync(string domain, Guid excludeUserId)
    {
        var filter = Builders<BattleMatch>.Filter.And(
            Builders<BattleMatch>.Filter.Eq(x => x.Domain, domain),
            Builders<BattleMatch>.Filter.Eq(x => x.Status, "waiting"),
            Builders<BattleMatch>.Filter.Ne(x => x.CreatorId, excludeUserId));
        return await _battleMatches.Find(filter).SortBy(x => x.CreatedAt).FirstOrDefaultAsync();
    }

    // ══════════════════════════════════════════════════════════════
    //  SEEDING (Idempotent)
    // ══════════════════════════════════════════════════════════════

    public async Task SeedIfEmptyAsync()
    {
        if (await _debugChallenges.CountDocumentsAsync(_ => true) > 0) return;
        await SeedDebugChallengesAsync();
        await SeedCodeSpeedSnippetsAsync();
        await SeedAlgorithmQuestionsAsync();
        await SeedMemoryCardsAsync();
        await SeedBugHunterScenariosAsync();
        await SeedApiRaceChallengesAsync();
    }

    /// <summary>Kept for backward compat — no-op now.</summary>
    public Task SeedPhase2IfEmptyAsync() => Task.CompletedTask;

    private async Task SeedDebugChallengesAsync()
    {
        var items = new List<DebugChallenge>
        {
            new() { Language="javascript", Domain=ProgrammingDomains.WebDev, Title="Off-by-one in loop", Difficulty="easy",
                BuggyCode="for(let i=0; i<=arr.length; i++) { console.log(arr[i]); }",
                FixedCode="for(let i=0; i<arr.length; i++) { console.log(arr[i]); }",
                BugLineNumber=1, Explanation="Using <= causes index out of bounds." },
            new() { Language="python", Domain=ProgrammingDomains.AiMl, Title="Missing return in function", Difficulty="easy",
                BuggyCode="def predict(model, data):\n    result = model.predict(data)\n    print(result)",
                FixedCode="def predict(model, data):\n    result = model.predict(data)\n    return result",
                BugLineNumber=3, Explanation="Function prints instead of returning the prediction." },
            new() { Language="dart", Domain=ProgrammingDomains.Flutter, Title="setState after dispose", Difficulty="medium",
                BuggyCode="Future.delayed(Duration(seconds:2), () {\n  setState(() { loading=false; });\n});",
                FixedCode="Future.delayed(Duration(seconds:2), () {\n  if(mounted) setState(() { loading=false; });\n});",
                BugLineNumber=2, Explanation="Must check mounted before setState." },
            new() { Language="csharp", Domain=ProgrammingDomains.BackendSystems, Title="Async deadlock", Difficulty="hard",
                BuggyCode="var result = GetDataAsync().Result;",
                FixedCode="var result = await GetDataAsync();",
                BugLineNumber=1, Explanation=".Result causes deadlock; use await instead." },
            new() { Language="csharp", Domain=ProgrammingDomains.GameDev, Title="Null reference in Update", Difficulty="medium",
                BuggyCode="void Update() {\n  player.transform.position += velocity;\n}",
                FixedCode="void Update() {\n  if(player != null) player.transform.position += velocity;\n}",
                BugLineNumber=2, Explanation="player may be destroyed; null check needed." },
        };
        await _debugChallenges.InsertManyAsync(items);
    }

    private async Task SeedCodeSpeedSnippetsAsync()
    {
        var items = new List<CodeSpeedSnippet>
        {
            new() { Language="javascript", Domain=ProgrammingDomains.WebDev, CharacterCount=85,
                Code="const fetchData = async (url) => {\n  const res = await fetch(url);\n  return res.json();\n};" },
            new() { Language="python", Domain=ProgrammingDomains.AiMl, CharacterCount=72,
                Code="def train(model, X, y, epochs=10):\n    for e in range(epochs):\n        model.fit(X, y)" },
            new() { Language="dart", Domain=ProgrammingDomains.Flutter, CharacterCount=95,
                Code="Widget build(BuildContext context) {\n  return Scaffold(\n    appBar: AppBar(title: Text('Home')),\n  );\n}" },
            new() { Language="csharp", Domain=ProgrammingDomains.BackendSystems, CharacterCount=90,
                Code="app.MapGet(\"/api/items\", async (MyService svc) =>\n{\n    return Results.Ok(await svc.GetAllAsync());\n});" },
        };
        await _codeSpeedSnippets.InsertManyAsync(items);
    }

    private async Task SeedAlgorithmQuestionsAsync()
    {
        var items = new List<AlgorithmBattleQuestion>
        {
            new() { Domain=ProgrammingDomains.WebDev, Difficulty="easy",
                Question="What is the time complexity of array.push() in JavaScript?",
                Options=new(){"O(1)","O(n)","O(log n)","O(n²)"}, CorrectIndex=0, TimeLimitSeconds=15,
                Explanation="push() is amortized O(1)." },
            new() { Domain=ProgrammingDomains.AiMl, Difficulty="medium",
                Question="Which activation function can cause the vanishing gradient problem?",
                Options=new(){"ReLU","Sigmoid","Leaky ReLU","GELU"}, CorrectIndex=1, TimeLimitSeconds=20,
                Explanation="Sigmoid squashes to 0-1, causing vanishing gradients in deep nets." },
            new() { Domain=ProgrammingDomains.BackendSystems, Difficulty="medium",
                Question="What does ACID stand for in databases?",
                Options=new(){"Atomicity, Consistency, Isolation, Durability","Async, Cache, Index, Data","Atomic, Concurrent, Isolated, Durable","Access, Control, Identity, Data"}, CorrectIndex=0, TimeLimitSeconds=15 },
            new() { Domain=ProgrammingDomains.Flutter, Difficulty="easy",
                Question="Which widget is used for scrollable lists in Flutter?",
                Options=new(){"Column","ListView","Row","Stack"}, CorrectIndex=1, TimeLimitSeconds=10 },
            new() { Domain=ProgrammingDomains.GameDev, Difficulty="hard",
                Question="What is the purpose of a spatial hash grid in game dev?",
                Options=new(){"Rendering","Collision detection optimization","Audio processing","Save game state"}, CorrectIndex=1, TimeLimitSeconds=20 },
        };
        await _algorithmQuestions.InsertManyAsync(items);
    }

    private async Task SeedMemoryCardsAsync()
    {
        var items = new List<MemoryStackCard>
        {
            new() { Domain=ProgrammingDomains.WebDev, Term="REST", Definition="Representational State Transfer — architectural style for APIs" },
            new() { Domain=ProgrammingDomains.WebDev, Term="CORS", Definition="Cross-Origin Resource Sharing — browser security mechanism" },
            new() { Domain=ProgrammingDomains.AiMl, Term="Epoch", Definition="One complete pass through the entire training dataset" },
            new() { Domain=ProgrammingDomains.AiMl, Term="Overfitting", Definition="Model memorizes training data instead of generalizing" },
            new() { Domain=ProgrammingDomains.Flutter, Term="Widget", Definition="Basic building block of Flutter UI — everything is a widget" },
            new() { Domain=ProgrammingDomains.Flutter, Term="BuildContext", Definition="Handle to the location of a widget in the widget tree" },
            new() { Domain=ProgrammingDomains.BackendSystems, Term="Middleware", Definition="Software that sits between the OS and applications in a pipeline" },
            new() { Domain=ProgrammingDomains.GameDev, Term="Delta Time", Definition="Time elapsed since last frame — ensures frame-rate independent movement" },
        };
        await _memoryCards.InsertManyAsync(items);
    }

    private async Task SeedBugHunterScenariosAsync()
    {
        var items = new List<BugHunterScenario>
        {
            new() { Domain=ProgrammingDomains.WebDev, Title="XSS in user input", Difficulty="medium",
                CodeWithBugs="document.innerHTML = userInput;",
                BugDescriptions=new(){"Unsanitized user input injected into DOM"},
                BugCount=1, HintText="Think about what happens if userInput contains <script> tags." },
            new() { Domain=ProgrammingDomains.BackendSystems, Title="SQL Injection", Difficulty="hard",
                CodeWithBugs="var query = $\"SELECT * FROM users WHERE name='{name}'\";",
                BugDescriptions=new(){"String interpolation allows SQL injection"},
                BugCount=1, HintText="Use parameterized queries instead." },
        };
        await _bugHunterScenarios.InsertManyAsync(items);
    }

    private async Task SeedApiRaceChallengesAsync()
    {
        var items = new List<ApiRaceChallenge>
        {
            new() { Title="Build a GET endpoint", Difficulty="easy",
                Description="Create a GET /api/hello that returns { message: 'Hello World' }",
                ExpectedMethod="GET", ExpectedPath="/api/hello",
                ExpectedResponseSchema="{\"message\":\"string\"}", TimeLimitSeconds=60 },
            new() { Title="POST with validation", Difficulty="medium",
                Description="Create POST /api/users that validates email and name fields",
                ExpectedMethod="POST", ExpectedPath="/api/users",
                ExpectedResponseSchema="{\"id\":\"string\",\"email\":\"string\",\"name\":\"string\"}", TimeLimitSeconds=120 },
        };
        await _apiRaceChallenges.InsertManyAsync(items);
    }
}
