using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class EntertainmentEndpoints
{
    public static void Map(WebApplication app)
    {
        var ent = app.MapGroup("/api/entertainment")
            .RequireAuthorization();

        // ── Debug Challenge ──────────────────────────────────────────
        ent.MapGet("/debug/random", async (string? domain, EntertainmentService svc) =>
            Results.Ok(await svc.GetRandomDebugChallengeAsync(domain)));

        ent.MapGet("/debug/list", async (string? domain, string? difficulty, EntertainmentService svc) =>
            Results.Ok(await svc.GetDebugChallengesAsync(domain, difficulty)));

        ent.MapGet("/debug/{id}", async (Guid id, EntertainmentService svc) =>
        {
            var c = await svc.GetDebugChallengeByIdAsync(id);
            return c is null ? Results.NotFound() : Results.Ok(c);
        });

        // ── Code Speed Type ──────────────────────────────────────────
        ent.MapGet("/codespeed/random", async (string? language, EntertainmentService svc) =>
            Results.Ok(await svc.GetRandomCodeSpeedSnippetAsync(language)));

        ent.MapGet("/codespeed/list", async (string? language, EntertainmentService svc) =>
            Results.Ok(await svc.GetCodeSpeedSnippetsAsync(language)));

        // ── Algorithm Battle ─────────────────────────────────────────
        ent.MapGet("/algorithm/random", async (string? domain, EntertainmentService svc) =>
            Results.Ok(await svc.GetRandomAlgorithmQuestionAsync(domain)));

        ent.MapGet("/algorithm/list", async (string? domain, EntertainmentService svc) =>
            Results.Ok(await svc.GetAlgorithmQuestionsAsync(domain)));

        // ── Memory Stack ─────────────────────────────────────────────
        ent.MapGet("/memory/cards", async (string? domain, EntertainmentService svc) =>
            Results.Ok(await svc.GetMemoryCardsAsync(domain)));

        // ── Bug Hunter ───────────────────────────────────────────────
        ent.MapGet("/bughunter/random", async (string? domain, EntertainmentService svc) =>
            Results.Ok(await svc.GetRandomBugHunterAsync(domain)));

        ent.MapGet("/bughunter/list", async (string? domain, EntertainmentService svc) =>
            Results.Ok(await svc.GetBugHunterScenariosAsync(domain)));

        // ── API Race ─────────────────────────────────────────────────
        ent.MapGet("/apirace/random", async (EntertainmentService svc) =>
            Results.Ok(await svc.GetRandomApiRaceAsync()));

        ent.MapGet("/apirace/list", async (string? difficulty, EntertainmentService svc) =>
            Results.Ok(await svc.GetApiRaceChallengesAsync(difficulty)));

        // ── Scores & Leaderboard ─────────────────────────────────────
        ent.MapGet("/scores/me", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var uid = Guid.Parse(user.FindFirstValue("uid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            return Results.Ok(await svc.GetPlayerScoreAsync(uid));
        });

        ent.MapPost("/scores/record", async (RecordScoreRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var uid = Guid.Parse(user.FindFirstValue("uid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            await svc.RecordScoreAsync(uid, req.GameType, req.Points);
            return Results.Ok(new { success = true });
        });

        ent.MapGet("/leaderboard", async (int? limit, EntertainmentService svc) =>
            Results.Ok(await svc.GetLeaderboardAsync(limit ?? 20)));

        // ── Battle (PvP) ─────────────────────────────────────────────
        ent.MapPost("/battle/create", async (CreateBattleRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var uid = Guid.Parse(user.FindFirstValue("uid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            if (!ProgrammingDomains.IsValid(req.Domain))
                return Results.BadRequest(new { error = "Invalid domain" });
            var match = await svc.CreateBattleAsync(uid, req.Domain);
            return Results.Ok(match);
        });

        ent.MapPost("/battle/join", async (JoinBattleRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var uid = Guid.Parse(user.FindFirstValue("uid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            var match = await svc.JoinBattleAsync(req.MatchId, uid);
            return match is null ? Results.NotFound(new { error = "Battle not found or already started" }) : Results.Ok(match);
        });

        ent.MapPost("/battle/find", async (FindBattleRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var uid = Guid.Parse(user.FindFirstValue("uid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            var match = await svc.FindOpenBattleAsync(req.Domain, uid);
            return match is null ? Results.Ok(new { found = false }) : Results.Ok(new { found = true, match });
        });

        ent.MapGet("/battle/{id}", async (Guid id, EntertainmentService svc) =>
        {
            var match = await svc.GetBattleAsync(id);
            return match is null ? Results.NotFound() : Results.Ok(match);
        });

        ent.MapGet("/battle/history", async (int? limit, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var uid = Guid.Parse(user.FindFirstValue("uid") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "");
            return Results.Ok(await svc.GetUserBattleHistoryAsync(uid, limit ?? 20));
        });

        // ── Seed (Admin) ─────────────────────────────────────────────
        app.MapPost("/api/entertainment/seed", async (EntertainmentService svc) =>
        {
            await svc.SeedIfEmptyAsync();
            return Results.Ok(new { seeded = true });
        }).RequireAuthorization("AdminOnly");
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────
public record RecordScoreRequest(string GameType, int Points);
public record CreateBattleRequest(string Domain);
public record JoinBattleRequest(Guid MatchId);
public record FindBattleRequest(string Domain);
