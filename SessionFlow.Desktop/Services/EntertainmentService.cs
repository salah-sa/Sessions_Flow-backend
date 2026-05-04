using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class EntertainmentService
{
    private readonly IMongoCollection<DebugChallenge> _debugChallenges;
    private readonly IMongoCollection<CodeSnippet> _codeSnippets;
    private readonly IMongoCollection<AlgorithmChallenge> _algorithmChallenges;
    private readonly IMongoCollection<StackChallenge> _stackChallenges;
    private readonly IMongoCollection<BugHunterChallenge> _bugHunterChallenges;
    private readonly IMongoCollection<ApiChallenge> _apiChallenges;
    private readonly IMongoCollection<GameLeaderboardEntry> _leaderboard;
    private readonly IMongoCollection<BattleMatch> _battleMatches;

    public EntertainmentService(IMongoDatabase db)
    {
        _debugChallenges = db.GetCollection<DebugChallenge>("debug_challenges");
        _codeSnippets = db.GetCollection<CodeSnippet>("code_snippets");
        _algorithmChallenges = db.GetCollection<AlgorithmChallenge>("algorithm_challenges");
        _stackChallenges = db.GetCollection<StackChallenge>("stack_challenges");
        _bugHunterChallenges = db.GetCollection<BugHunterChallenge>("bug_hunter_challenges");
        _apiChallenges = db.GetCollection<ApiChallenge>("api_challenges");
        _leaderboard = db.GetCollection<GameLeaderboardEntry>("game_leaderboard");
        _battleMatches = db.GetCollection<BattleMatch>("battle_matches");
    }

    // ── Debug Challenge ──────────────────────────────────────────
    public async Task<List<DebugChallenge>> GetDebugChallengesAsync(string? domain, int? difficulty)
    {
        var fb = Builders<DebugChallenge>.Filter;
        var f = fb.Empty;
        if (!string.IsNullOrEmpty(domain)) f &= fb.Eq(x => x.Domain, domain);
        if (difficulty.HasValue) f &= fb.Eq(x => x.Difficulty, difficulty.Value);
        return await _debugChallenges.Find(f).Limit(10).ToListAsync();
    }

    public async Task<DebugChallenge?> GetDebugChallengeByIdAsync(Guid id) =>
        await _debugChallenges.Find(x => x.Id == id).FirstOrDefaultAsync();

    public async Task<DebugChallenge?> GetRandomDebugChallengeAsync(string? domain)
    {
        var f = string.IsNullOrEmpty(domain) ? Builders<DebugChallenge>.Filter.Empty
            : Builders<DebugChallenge>.Filter.Eq(x => x.Domain, domain);
        var c = await _debugChallenges.CountDocumentsAsync(f);
        return c == 0 ? null : await _debugChallenges.Find(f).Skip(Random.Shared.Next((int)c)).Limit(1).FirstOrDefaultAsync();
    }

    // ── Code Speed Type ──────────────────────────────────────────
    public async Task<List<CodeSnippet>> GetCodeSnippetsAsync(string? language)
    {
        var f = string.IsNullOrEmpty(language) ? Builders<CodeSnippet>.Filter.Empty
            : Builders<CodeSnippet>.Filter.Eq(x => x.Language, language);
        return await _codeSnippets.Find(f).Limit(10).ToListAsync();
    }

    public async Task<CodeSnippet?> GetRandomCodeSnippetAsync(string? language)
    {
        var f = string.IsNullOrEmpty(language) ? Builders<CodeSnippet>.Filter.Empty
            : Builders<CodeSnippet>.Filter.Eq(x => x.Language, language);
        var c = await _codeSnippets.CountDocumentsAsync(f);
        return c == 0 ? null : await _codeSnippets.Find(f).Skip(Random.Shared.Next((int)c)).Limit(1).FirstOrDefaultAsync();
    }

    // ── Algorithm Battle ─────────────────────────────────────────
    public async Task<List<AlgorithmChallenge>> GetAlgorithmChallengesAsync(string? domain)
    {
        var f = string.IsNullOrEmpty(domain) ? Builders<AlgorithmChallenge>.Filter.Empty
            : Builders<AlgorithmChallenge>.Filter.Eq(x => x.Domain, domain);
        return await _algorithmChallenges.Find(f).Limit(10).ToListAsync();
    }

    public async Task<AlgorithmChallenge?> GetRandomAlgorithmChallengeAsync(string? domain)
    {
        var f = string.IsNullOrEmpty(domain) ? Builders<AlgorithmChallenge>.Filter.Empty
            : Builders<AlgorithmChallenge>.Filter.Eq(x => x.Domain, domain);
        var c = await _algorithmChallenges.CountDocumentsAsync(f);
        return c == 0 ? null : await _algorithmChallenges.Find(f).Skip(Random.Shared.Next((int)c)).Limit(1).FirstOrDefaultAsync();
    }

    // ── Memory Stack ─────────────────────────────────────────────
    public async Task<List<StackChallenge>> GetStackChallengesAsync(string? domain)
    {
        var f = string.IsNullOrEmpty(domain) ? Builders<StackChallenge>.Filter.Empty
            : Builders<StackChallenge>.Filter.Eq(x => x.Domain, domain);
        return await _stackChallenges.Find(f).Limit(20).ToListAsync();
    }

    // ── Bug Hunter ───────────────────────────────────────────────
    public async Task<List<BugHunterChallenge>> GetBugHunterChallengesAsync(string? domain)
    {
        var f = string.IsNullOrEmpty(domain) ? Builders<BugHunterChallenge>.Filter.Empty
            : Builders<BugHunterChallenge>.Filter.Eq(x => x.Domain, domain);
        return await _bugHunterChallenges.Find(f).Limit(10).ToListAsync();
    }

    public async Task<BugHunterChallenge?> GetRandomBugHunterAsync(string? domain)
    {
        var f = string.IsNullOrEmpty(domain) ? Builders<BugHunterChallenge>.Filter.Empty
            : Builders<BugHunterChallenge>.Filter.Eq(x => x.Domain, domain);
        var c = await _bugHunterChallenges.CountDocumentsAsync(f);
        return c == 0 ? null : await _bugHunterChallenges.Find(f).Skip(Random.Shared.Next((int)c)).Limit(1).FirstOrDefaultAsync();
    }

    // ── API Race ─────────────────────────────────────────────────
    public async Task<List<ApiChallenge>> GetApiChallengesAsync(int? difficulty)
    {
        var f = difficulty.HasValue ? Builders<ApiChallenge>.Filter.Eq(x => x.Difficulty, difficulty.Value)
            : Builders<ApiChallenge>.Filter.Empty;
        return await _apiChallenges.Find(f).Limit(10).ToListAsync();
    }

    public async Task<ApiChallenge?> GetRandomApiChallengeAsync()
    {
        var c = await _apiChallenges.CountDocumentsAsync(_ => true);
        return c == 0 ? null : await _apiChallenges.Find(_ => true).Skip(Random.Shared.Next((int)c)).Limit(1).FirstOrDefaultAsync();
    }

    // ── Leaderboard ──────────────────────────────────────────────
    public async Task<GameLeaderboardEntry?> GetPlayerScoreAsync(Guid userId) =>
        await _leaderboard.Find(x => x.UserId == userId).FirstOrDefaultAsync();

    public async Task RecordScoreAsync(Guid userId, string gameType, int points)
    {
        var filter = Builders<GameLeaderboardEntry>.Filter.And(
            Builders<GameLeaderboardEntry>.Filter.Eq(x => x.UserId, userId),
            Builders<GameLeaderboardEntry>.Filter.Eq(x => x.GameType, gameType));
        var exists = await _leaderboard.Find(filter).AnyAsync();
        if (!exists)
            await _leaderboard.InsertOneAsync(new GameLeaderboardEntry { UserId = userId, GameType = gameType });
        var update = Builders<GameLeaderboardEntry>.Update
            .Inc(x => x.TotalScore, points)
            .Inc(x => x.GamesPlayed, 1)
            .Set(x => x.LastPlayedAt, DateTimeOffset.UtcNow);
        await _leaderboard.UpdateOneAsync(filter, update);
    }

    public async Task<List<GameLeaderboardEntry>> GetLeaderboardAsync(int limit = 20) =>
        await _leaderboard.Find(_ => true).SortByDescending(x => x.TotalScore).Limit(limit).ToListAsync();

    // ── Battle (PvP) ─────────────────────────────────────────────
    public async Task<BattleMatch> CreateBattleAsync(Guid challengerId, string domain)
    {
        var m = new BattleMatch { ChallengerId = challengerId, Domain = domain, Status = "waiting" };
        await _battleMatches.InsertOneAsync(m);
        return m;
    }

    public async Task<BattleMatch?> JoinBattleAsync(Guid matchId, Guid opponentId)
    {
        var upd = Builders<BattleMatch>.Update
            .Set(x => x.OpponentId, opponentId)
            .Set(x => x.Status, "active");
        return await _battleMatches.FindOneAndUpdateAsync(
            x => x.Id == matchId && x.Status == "waiting", upd,
            new FindOneAndUpdateOptions<BattleMatch> { ReturnDocument = ReturnDocument.After });
    }

    public async Task<BattleMatch?> CompleteBattleAsync(Guid matchId, Guid winnerId, int cs, int os)
    {
        var upd = Builders<BattleMatch>.Update
            .Set(x => x.WinnerId, winnerId).Set(x => x.Status, "completed")
            .Set(x => x.ChallengerScore, cs).Set(x => x.OpponentScore, os)
            .Set(x => x.CompletedAt, DateTimeOffset.UtcNow);
        return await _battleMatches.FindOneAndUpdateAsync(x => x.Id == matchId, upd,
            new FindOneAndUpdateOptions<BattleMatch> { ReturnDocument = ReturnDocument.After });
    }

    public async Task<BattleMatch?> GetBattleAsync(Guid id) =>
        await _battleMatches.Find(x => x.Id == id).FirstOrDefaultAsync();

    public async Task<List<BattleMatch>> GetUserBattleHistoryAsync(Guid userId, int limit = 20)
    {
        var f = Builders<BattleMatch>.Filter.Or(
            Builders<BattleMatch>.Filter.Eq(x => x.ChallengerId, userId),
            Builders<BattleMatch>.Filter.Eq(x => x.OpponentId, userId));
        return await _battleMatches.Find(f).SortByDescending(x => x.CreatedAt).Limit(limit).ToListAsync();
    }

    public async Task<BattleMatch?> FindOpenBattleAsync(string domain, Guid excludeUser)
    {
        var f = Builders<BattleMatch>.Filter.And(
            Builders<BattleMatch>.Filter.Eq(x => x.Domain, domain),
            Builders<BattleMatch>.Filter.Eq(x => x.Status, "waiting"),
            Builders<BattleMatch>.Filter.Ne(x => x.ChallengerId, excludeUser));
        return await _battleMatches.Find(f).SortBy(x => x.CreatedAt).FirstOrDefaultAsync();
    }

    // ── Seeding ──────────────────────────────────────────────────
    public async Task SeedIfEmptyAsync()
    {
        if (await _debugChallenges.CountDocumentsAsync(_ => true) > 0) return;
        await SeedDebugAsync();
        await SeedCodeSnippetsAsync();
        await SeedAlgorithmAsync();
        await SeedStackAsync();
        await SeedBugHunterAsync();
        await SeedApiAsync();
    }

    public Task SeedPhase2IfEmptyAsync() => Task.CompletedTask;

    private async Task SeedDebugAsync()
    {
        await _debugChallenges.InsertManyAsync(new[]
        {
            new DebugChallenge { Language="javascript", Domain=ProgrammingDomains.WebDev, Title="Off-by-one loop", Difficulty=1,
                BuggyCode="for(let i=0;i<=arr.length;i++){console.log(arr[i]);}",
                FixedCode="for(let i=0;i<arr.length;i++){console.log(arr[i]);}",
                BugLineNumber=1, BugExplanation="<= causes out-of-bounds" },
            new DebugChallenge { Language="python", Domain=ProgrammingDomains.AiMl, Title="Missing return", Difficulty=1,
                BuggyCode="def predict(m,d):\n  r=m.predict(d)\n  print(r)",
                FixedCode="def predict(m,d):\n  r=m.predict(d)\n  return r",
                BugLineNumber=3, BugExplanation="print instead of return" },
            new DebugChallenge { Language="dart", Domain=ProgrammingDomains.Flutter, Title="setState after dispose", Difficulty=2,
                BuggyCode="Future.delayed(Duration(seconds:2),(){\n  setState((){loading=false;});\n});",
                FixedCode="Future.delayed(Duration(seconds:2),(){\n  if(mounted) setState((){loading=false;});\n});",
                BugLineNumber=2, BugExplanation="Check mounted before setState" },
            new DebugChallenge { Language="csharp", Domain=ProgrammingDomains.BackendSystems, Title="Async deadlock", Difficulty=3,
                BuggyCode="var r = GetDataAsync().Result;",
                FixedCode="var r = await GetDataAsync();",
                BugLineNumber=1, BugExplanation=".Result causes deadlock" },
            new DebugChallenge { Language="csharp", Domain=ProgrammingDomains.GameDev, Title="Null ref in Update", Difficulty=2,
                BuggyCode="void Update(){\n  player.transform.position+=vel;\n}",
                FixedCode="void Update(){\n  if(player!=null) player.transform.position+=vel;\n}",
                BugLineNumber=2, BugExplanation="player may be destroyed" },
        });
    }

    private async Task SeedCodeSnippetsAsync()
    {
        await _codeSnippets.InsertManyAsync(new[]
        {
            new CodeSnippet { Language="javascript", Domain=ProgrammingDomains.WebDev, Difficulty=1, CharacterCount=85,
                Code="const fetchData=async(url)=>{const res=await fetch(url);return res.json();};" },
            new CodeSnippet { Language="python", Domain=ProgrammingDomains.AiMl, Difficulty=1, CharacterCount=72,
                Code="def train(model,X,y,epochs=10):\n  for e in range(epochs):\n    model.fit(X,y)" },
            new CodeSnippet { Language="dart", Domain=ProgrammingDomains.Flutter, Difficulty=2, CharacterCount=95,
                Code="Widget build(BuildContext c){return Scaffold(appBar:AppBar(title:Text('Home')));}" },
            new CodeSnippet { Language="csharp", Domain=ProgrammingDomains.BackendSystems, Difficulty=2, CharacterCount=90,
                Code="app.MapGet(\"/api/items\",async(MyService svc)=>Results.Ok(await svc.GetAllAsync()));" },
        });
    }

    private async Task SeedAlgorithmAsync()
    {
        await _algorithmChallenges.InsertManyAsync(new[]
        {
            new AlgorithmChallenge { Domain=ProgrammingDomains.WebDev, Difficulty=1, TimeLimitSeconds=15,
                ProblemStatement="Time complexity of array.push() in JS?",
                Options=new(){"O(1)","O(n)","O(log n)","O(n²)"}, CorrectIndex=0,
                Explanation="push() is amortized O(1)" },
            new AlgorithmChallenge { Domain=ProgrammingDomains.AiMl, Difficulty=2, TimeLimitSeconds=20,
                ProblemStatement="Which activation causes vanishing gradient?",
                Options=new(){"ReLU","Sigmoid","Leaky ReLU","GELU"}, CorrectIndex=1,
                Explanation="Sigmoid squashes to 0-1" },
            new AlgorithmChallenge { Domain=ProgrammingDomains.BackendSystems, Difficulty=2, TimeLimitSeconds=15,
                ProblemStatement="What does ACID stand for?",
                Options=new(){"Atomicity,Consistency,Isolation,Durability","Async,Cache,Index,Data","Atomic,Concurrent,Isolated,Durable","Access,Control,Identity,Data"}, CorrectIndex=0 },
            new AlgorithmChallenge { Domain=ProgrammingDomains.Flutter, Difficulty=1, TimeLimitSeconds=10,
                ProblemStatement="Widget for scrollable lists in Flutter?",
                Options=new(){"Column","ListView","Row","Stack"}, CorrectIndex=1 },
            new AlgorithmChallenge { Domain=ProgrammingDomains.GameDev, Difficulty=3, TimeLimitSeconds=20,
                ProblemStatement="Purpose of spatial hash grid?",
                Options=new(){"Rendering","Collision detection","Audio","Save state"}, CorrectIndex=1 },
        });
    }

    private async Task SeedStackAsync()
    {
        await _stackChallenges.InsertManyAsync(new[]
        {
            new StackChallenge { Domain=ProgrammingDomains.WebDev, Difficulty=1,
                Code="let x=5;\nfunction add(a){return a+x;}\nconsole.log(add(3));",
                Steps=new(){new StackStep{StepNumber=1,Question="What is x?",CorrectAnswer="5",Options=new(){"5","3","8","undefined"}},
                            new StackStep{StepNumber=2,Question="What does add(3) return?",CorrectAnswer="8",Options=new(){"3","5","8","undefined"}}} },
            new StackChallenge { Domain=ProgrammingDomains.AiMl, Difficulty=2,
                Code="data=[1,2,3]\nresult=sum(data)/len(data)\nprint(result)",
                Steps=new(){new StackStep{StepNumber=1,Question="What is sum(data)?",CorrectAnswer="6",Options=new(){"3","6","2","1"}},
                            new StackStep{StepNumber=2,Question="What is result?",CorrectAnswer="2.0",Options=new(){"2.0","3","6","1.5"}}} },
        });
    }

    private async Task SeedBugHunterAsync()
    {
        await _bugHunterChallenges.InsertManyAsync(new[]
        {
            new BugHunterChallenge { Domain=ProgrammingDomains.WebDev, Title="XSS vulnerability", Difficulty=2,
                Code="document.innerHTML=userInput;\nfetch('/api?q='+userInput);",
                Bugs=new(){new BugLocation{LineNumber=1,BugType="xss",Explanation="Unsanitized DOM injection"},
                           new BugLocation{LineNumber=2,BugType="xss",Explanation="Unescaped query param"},
                           new BugLocation{LineNumber=2,BugType="injection",Explanation="URL injection risk"}} },
            new BugHunterChallenge { Domain=ProgrammingDomains.BackendSystems, Title="SQL Injection", Difficulty=3,
                Code="var q=$\"SELECT * FROM users WHERE name='{name}'\";\nvar r=db.Execute(q);",
                Bugs=new(){new BugLocation{LineNumber=1,BugType="sql-injection",Explanation="String interpolation in SQL"},
                           new BugLocation{LineNumber=1,BugType="wrong-operator",Explanation="No parameterized query"},
                           new BugLocation{LineNumber=2,BugType="null-ref",Explanation="No null check on result"}} },
        });
    }

    private async Task SeedApiAsync()
    {
        await _apiChallenges.InsertManyAsync(new[]
        {
            new ApiChallenge { Domain=ProgrammingDomains.WebDev, Difficulty=1,
                TaskDescription="Create GET /api/hello returning {message:'Hello'}",
                CorrectMethod="GET", CorrectPath="/api/hello", ExpectedStatusCode=200 },
            new ApiChallenge { Domain=ProgrammingDomains.BackendSystems, Difficulty=2,
                TaskDescription="Create POST /api/users validating email and name",
                CorrectMethod="POST", CorrectPath="/api/users", CorrectBody="{\"email\":\"string\",\"name\":\"string\"}", ExpectedStatusCode=201 },
        });
    }
}
