using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using SessionFlow.Desktop.Models;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Services.EventBus;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class ProgrammingGameEndpoints
{
    public record DebugSubmitRequest(Guid ChallengeId, int SelectedLine, int ResponseTimeMs);
    public record TypingSubmitRequest(Guid SnippetId, double Wpm, double Accuracy);
    public record BattleCreateRequest(string Domain);
    public record BattleJoinRequest(Guid? MatchId);
    public record BattleSubmitRequest(List<BattleAnswerDto> Answers);
    public record BattleAnswerDto(Guid QuestionId, int SelectedIndex, double ResponseTimeMs);
    public record StackSubmitRequest(Guid ChallengeId, List<string> Answers);
    public record BugHunterSubmitRequest(Guid ChallengeId, List<int> FlaggedLines, int TimeSpentMs);
    public record ApiRaceSubmitRequest(Guid ChallengeId, string Method, string Path, string Body, int TimeSpentMs);

    public static void Map(WebApplication app)
    {
        var api = app.MapGroup("/api/games").RequireAuthorization();

        // ── DEBUG CHALLENGE ──────────────────────────────────────────────
        api.MapGet("/debug/random", async (string? domain, int? difficulty, ProgrammingGameService svc) =>
        {
            var challenge = await svc.GetRandomDebugChallengeAsync(domain, difficulty);
            if (challenge == null) return Results.NotFound(new { error = "No challenges available." });
            return Results.Ok(new
            {
                challenge.Id, challenge.Language, challenge.Domain, challenge.Title,
                challenge.BuggyCode, challenge.Difficulty, challenge.TimeLimitSeconds
            });
        });

        api.MapPost("/debug/submit", async (DebugSubmitRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var attempt = await svc.SubmitDebugAttemptAsync(userId, req.ChallengeId, req.SelectedLine, req.ResponseTimeMs);
            await eventBus.PublishAsync(Events.GameChallengeCompleted, EventTargetType.All, "",
                new { gameType = "debug_challenge", userId = userId.ToString(), attempt.Score });
            return Results.Ok(attempt);
        });

        // ── CODE SPEED TYPE ──────────────────────────────────────────────
        api.MapGet("/typing/random", async (string? domain, int? difficulty, ProgrammingGameService svc) =>
        {
            var snippet = await svc.GetRandomSnippetAsync(domain, difficulty);
            if (snippet == null) return Results.NotFound(new { error = "No snippets available." });
            return Results.Ok(new { snippet.Id, snippet.Language, snippet.Domain, snippet.Description, snippet.Code, snippet.Difficulty, snippet.CharacterCount });
        });

        api.MapPost("/typing/submit", async (TypingSubmitRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await svc.SubmitTypingResultAsync(userId, req.SnippetId, req.Wpm, req.Accuracy);
            await eventBus.PublishAsync(Events.GameChallengeCompleted, EventTargetType.All, "",
                new { gameType = "code_speed_type", userId = userId.ToString(), result.Score });
            return Results.Ok(result);
        });

        // ── ALGORITHM BATTLE (PvP) ───────────────────────────────────────
        api.MapPost("/battle/create", async (BattleCreateRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var match = await svc.CreateBattleAsync(userId, req.Domain);
            await eventBus.PublishAsync(Events.BattleCreated, EventTargetType.All, "",
                new { matchId = match.Id.ToString(), match.Domain, match.Status });
            return Results.Ok(new { match.Id, match.Status, match.Domain, questionCount = match.QuestionIds.Count });
        });

        api.MapPost("/battle/join", async (BattleJoinRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var match = await svc.JoinBattleAsync(userId, req.MatchId);
            if (match == null) return Results.NotFound(new { error = "No open battle found." });
            await eventBus.PublishAsync(Events.BattleStarted, EventTargetType.Group,
                $"battle_{match.Id}", new { matchId = match.Id.ToString(), match.Status });
            return Results.Ok(new { match.Id, match.Status, match.Domain });
        });

        api.MapGet("/battle/{id}/questions", async (Guid id, ProgrammingGameService svc) =>
        {
            var questions = await svc.GetBattleQuestionsAsync(id);
            return Results.Ok(questions.Select(q => new { q.Id, q.ProblemStatement, q.Options, q.TimeLimitSeconds, q.Difficulty }));
        });

        api.MapPost("/battle/{id}/submit", async (Guid id, BattleSubmitRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var answers = req.Answers.Select(a => new BattleAnswer
            {
                QuestionId = a.QuestionId, SelectedIndex = a.SelectedIndex, ResponseTimeMs = a.ResponseTimeMs
            }).ToList();

            var match = await svc.SubmitBattleAnswersAsync(userId, id, answers);
            if (match == null) return Results.BadRequest(new { error = "Invalid battle." });

            var isChallenger = match.ChallengerId == userId;
            if (match.Status == "completed")
            {
                await eventBus.PublishAsync(Events.BattleCompleted, EventTargetType.All, "",
                    new { matchId = id.ToString(), match.ChallengerScore, match.OpponentScore, winnerId = match.WinnerId?.ToString() });
            }
            else
            {
                await eventBus.PublishAsync(Events.BattleAnswerSubmitted, EventTargetType.Group,
                    $"battle_{id}", new { matchId = id.ToString(), userId = userId.ToString() });
            }

            return Results.Ok(new
            {
                match.Status,
                yourScore = isChallenger ? match.ChallengerScore : match.OpponentScore,
                opponentScore = isChallenger ? match.OpponentScore : match.ChallengerScore,
                match.WinnerId, isWinner = match.WinnerId == userId
            });
        });

        api.MapGet("/battle/stats", async (ProgrammingGameService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            return Results.Ok(await svc.GetBattleStatsAsync(userId));
        });

        api.MapGet("/battle/leaderboard", async (ProgrammingGameService svc) =>
        {
            return Results.Ok(await svc.GetBattleLeaderboardAsync());
        });

        // ── MEMORY STACK ─────────────────────────────────────────────────
        api.MapGet("/stack/random", async (string? domain, int? difficulty, ProgrammingGameService svc) =>
        {
            var challenge = await svc.GetRandomStackChallengeAsync(domain, difficulty);
            if (challenge == null) return Results.NotFound(new { error = "No stack challenges available." });
            return Results.Ok(new { challenge.Id, challenge.Language, challenge.Domain, challenge.Code, challenge.Steps, challenge.Difficulty });
        });

        api.MapPost("/stack/submit", async (StackSubmitRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var attempt = await svc.SubmitStackAttemptAsync(userId, req.ChallengeId, req.Answers);
            await eventBus.PublishAsync(Events.GameChallengeCompleted, EventTargetType.All, "",
                new { gameType = "memory_stack", userId = userId.ToString(), attempt.Score });
            return Results.Ok(attempt);
        });

        // ── BUG HUNTER ───────────────────────────────────────────────────
        api.MapGet("/bughunter/random", async (string? domain, int? difficulty, ProgrammingGameService svc) =>
        {
            var challenge = await svc.GetRandomBugHunterAsync(domain, difficulty);
            if (challenge == null) return Results.NotFound(new { error = "No bug hunter challenges available." });
            // Don't send bug locations to client!
            return Results.Ok(new { challenge.Id, challenge.Language, challenge.Domain, challenge.Title, challenge.Code, challenge.TimeLimitSeconds, challenge.Difficulty });
        });

        api.MapPost("/bughunter/submit", async (BugHunterSubmitRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var attempt = await svc.SubmitBugHunterAsync(userId, req.ChallengeId, req.FlaggedLines, req.TimeSpentMs);
            await eventBus.PublishAsync(Events.GameChallengeCompleted, EventTargetType.All, "",
                new { gameType = "bug_hunter", userId = userId.ToString(), attempt.Score });
            return Results.Ok(attempt);
        });

        // ── API RACE ─────────────────────────────────────────────────────
        api.MapGet("/apirace/random", async (string? domain, int? difficulty, ProgrammingGameService svc) =>
        {
            var challenge = await svc.GetRandomApiChallengeAsync(domain, difficulty);
            if (challenge == null) return Results.NotFound(new { error = "No API challenges available." });
            return Results.Ok(new { challenge.Id, challenge.Domain, challenge.TaskDescription, challenge.Difficulty, challenge.ExpectedStatusCode });
        });

        api.MapPost("/apirace/submit", async (ApiRaceSubmitRequest req, ProgrammingGameService svc,
            IEventBus eventBus, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var attempt = await svc.SubmitApiRaceAsync(userId, req.ChallengeId, req.Method, req.Path, req.Body, req.TimeSpentMs);
            await eventBus.PublishAsync(Events.GameChallengeCompleted, EventTargetType.All, "",
                new { gameType = "api_race", userId = userId.ToString(), attempt.Score });
            return Results.Ok(attempt);
        });

        // ── LEADERBOARDS ─────────────────────────────────────────────────
        api.MapGet("/leaderboard/{gameType}", async (string gameType, ProgrammingGameService svc) =>
        {
            return Results.Ok(await svc.GetLeaderboardAsync(gameType));
        });

        api.MapGet("/mystats", async (ProgrammingGameService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            return Results.Ok(await svc.GetUserStatsAsync(userId));
        });

        // ── DOMAINS ──────────────────────────────────────────────────────
        api.MapGet("/domains", () => Results.Ok(ProgrammingDomains.All));
    }
}
