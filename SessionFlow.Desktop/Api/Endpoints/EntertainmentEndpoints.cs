using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using SessionFlow.Desktop.Services;
using System.Security.Claims;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class EntertainmentEndpoints
{
    public static void Map(WebApplication app)
    {
        var ent = app.MapGroup("/api/entertainment")
            .RequireAuthorization();

        // ═══════════════════════════════════════════════════════════════════════
        //  QUOTE DOJO
        // ═══════════════════════════════════════════════════════════════════════

        // GET /api/entertainment/quotes/today
        ent.MapGet("/quotes/today", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var quote = await svc.GetTodayQuoteAsync();
            if (quote == null)
                return Results.Ok(new { quote = (object?)null, streak = (object?)null });

            var streak = await svc.RecordQuoteViewAsync(userId);
            return Results.Ok(new
            {
                quote = new { quote.Id, quote.Text, quote.Author, quote.Category },
                streak = new { streak.CurrentStreak, streak.LongestStreak, streak.LikedQuoteIds, streak.PinnedQuoteId }
            });
        });

        // GET /api/entertainment/quotes/streak
        ent.MapGet("/quotes/streak", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var streak = await svc.GetQuoteStreakAsync(userId);
            return Results.Ok(streak ?? new SessionFlow.Desktop.Models.QuoteStreak { UserId = userId });
        });

        // POST /api/entertainment/quotes/{id}/like
        ent.MapPost("/quotes/{id}/like", async (Guid id, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var isLiked = await svc.ToggleQuoteLikeAsync(userId, id);
            return Results.Ok(new { liked = isLiked });
        });

        // POST /api/entertainment/quotes/{id}/pin
        ent.MapPost("/quotes/{id}/pin", async (Guid id, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await svc.PinQuoteAsync(userId, id);
            return Results.Ok(new { pinned = true });
        });

        // GET /api/entertainment/quotes/collection
        ent.MapGet("/quotes/collection", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var quotes = await svc.GetLikedQuotesAsync(userId);
            return Results.Ok(quotes.Select(q => new { q.Id, q.Text, q.Author, q.Category }));
        });

        // ═══════════════════════════════════════════════════════════════════════
        //  RIDDLE LABYRINTH
        // ═══════════════════════════════════════════════════════════════════════

        // GET /api/entertainment/riddles/today
        ent.MapGet("/riddles/today", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var riddle = await svc.GetTodayRiddleAsync();
            if (riddle == null)
                return Results.Ok(new { riddle = (object?)null, attempt = (object?)null });

            var attempt = await svc.GetAttemptAsync(userId, riddle.Id);

            return Results.Ok(new
            {
                riddle = new { riddle.Id, riddle.Text, riddle.Difficulty, HintCount = riddle.Hints.Count },
                attempt = attempt == null ? null : new
                {
                    attempt.Solved,
                    attempt.HintsUsed,
                    attempt.WrongAttempts,
                    attempt.Score
                }
            });
        });

        // POST /api/entertainment/riddles/{id}/answer
        ent.MapPost("/riddles/{id}/answer", async (Guid id, AnswerRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (string.IsNullOrWhiteSpace(req.Answer))
                return Results.BadRequest(new { error = "Answer cannot be empty." });

            try
            {
                var (correct, score, attempt) = await svc.SubmitAnswerAsync(userId, id, req.Answer);
                return Results.Ok(new
                {
                    correct,
                    score,
                    attempt = new { attempt.Solved, attempt.HintsUsed, attempt.WrongAttempts, attempt.Score }
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/entertainment/riddles/{id}/hint
        ent.MapPost("/riddles/{id}/hint", async (Guid id, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var hint = await svc.RevealHintAsync(userId, id);
            return hint != null
                ? Results.Ok(new { hint })
                : Results.Ok(new { hint = (string?)null, message = "No more hints available." });
        });

        // GET /api/entertainment/riddles/leaderboard
        ent.MapGet("/riddles/leaderboard", async (EntertainmentService svc) =>
        {
            var entries = await svc.GetRiddleLeaderboardAsync();
            return Results.Ok(entries);
        });

        // ═══════════════════════════════════════════════════════════════════════
        //  PROCRASTINATION ROASTER
        // ═══════════════════════════════════════════════════════════════════════

        // GET /api/entertainment/roaster/lines?category=idle
        ent.MapGet("/roaster/lines", async (string? category, EntertainmentService svc) =>
        {
            var lines = await svc.GetRoastLinesAsync(category ?? "idle");
            return Results.Ok(lines.Select(l => new { l.Id, l.Text, l.Category, l.MinIdleMinutes }));
        });

        // ═══════════════════════════════════════════════════════════════════════
        //  BRAIN DUEL ARENA (Phase 2)
        // ═══════════════════════════════════════════════════════════════════════

        // POST /api/entertainment/duel/create
        ent.MapPost("/duel/create", async (CreateDuelRequest? req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var match = await svc.CreateDuelAsync(userId, req?.Subject ?? "general");
            return Results.Ok(new { match.Id, match.Status, match.Subject, questionCount = match.QuestionIds.Count });
        });

        // POST /api/entertainment/duel/join
        ent.MapPost("/duel/join", async (JoinDuelRequest? req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var match = await svc.JoinDuelAsync(userId, req?.MatchId);
            if (match == null) return Results.NotFound(new { error = "No open duel found." });
            return Results.Ok(new { match.Id, match.Status, match.Subject });
        });

        // GET /api/entertainment/duel/{id}/questions
        ent.MapGet("/duel/{id}/questions", async (Guid id, EntertainmentService svc) =>
        {
            var questions = await svc.GetDuelQuestionsAsync(id);
            return Results.Ok(questions.Select(q => new { q.Id, q.Text, q.Options, q.TimeLimitSeconds, q.Difficulty }));
        });

        // POST /api/entertainment/duel/{id}/submit
        ent.MapPost("/duel/{id}/submit", async (Guid id, SubmitDuelRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var answers = req.Answers.Select(a => new SessionFlow.Desktop.Models.DuelAnswer
            {
                QuestionId = a.QuestionId,
                SelectedIndex = a.SelectedIndex,
                ResponseTimeMs = a.ResponseTimeMs
            }).ToList();

            var match = await svc.SubmitDuelAnswersAsync(userId, id, answers);
            if (match == null) return Results.BadRequest(new { error = "Invalid match." });

            var isChallenger = match.ChallengerId == userId;
            return Results.Ok(new
            {
                match.Status,
                yourScore = isChallenger ? match.ChallengerScore : match.OpponentScore,
                opponentScore = isChallenger ? match.OpponentScore : match.ChallengerScore,
                match.WinnerId,
                isWinner = match.WinnerId == userId
            });
        });

        // GET /api/entertainment/duel/stats
        ent.MapGet("/duel/stats", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var stats = await svc.GetDuelStatsAsync(userId);
            return Results.Ok(stats);
        });

        // GET /api/entertainment/duel/leaderboard
        ent.MapGet("/duel/leaderboard", async (EntertainmentService svc) =>
        {
            var entries = await svc.GetDuelLeaderboardAsync();
            return Results.Ok(entries);
        });

        // GET /api/entertainment/duel/history
        ent.MapGet("/duel/history", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var matches = await svc.GetUserDuelHistoryAsync(userId);
            return Results.Ok(matches.Select(m => new
            {
                m.Id, m.Subject, m.ChallengerScore, m.OpponentScore, m.WinnerId, m.CompletedAt,
                isWinner = m.WinnerId == userId,
                isChallenger = m.ChallengerId == userId
            }));
        });

        // ═══════════════════════════════════════════════════════════════════════
        //  FOCUS BEAST (Phase 2)
        // ═══════════════════════════════════════════════════════════════════════

        // GET /api/entertainment/beast
        ent.MapGet("/beast", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var beast = await svc.GetOrCreateBeastAsync(userId);
            return Results.Ok(beast);
        });

        // POST /api/entertainment/beast/feed
        ent.MapPost("/beast/feed", async (FeedBeastRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var beast = await svc.FeedBeastAsync(userId, req.FocusMinutes);
            return Results.Ok(beast);
        });

        // POST /api/entertainment/beast/damage
        ent.MapPost("/beast/damage", async (DamageBeastRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var beast = await svc.DamageBeastAsync(userId, req.IdleMinutes);
            return Results.Ok(beast);
        });

        // POST /api/entertainment/beast/rename
        ent.MapPost("/beast/rename", async (RenameBeastRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var beast = await svc.RenameBeastAsync(userId, req.Name);
            return Results.Ok(beast);
        });

        // ═══════════════════════════════════════════════════════════════════════
        //  MEME FORGE (Phase 2)
        // ═══════════════════════════════════════════════════════════════════════

        // GET /api/entertainment/memes/templates
        ent.MapGet("/memes/templates", async (string? category, EntertainmentService svc) =>
        {
            var templates = await svc.GetMemeTemplatesAsync(category);
            return Results.Ok(templates.Select(t => new { t.Id, t.Name, t.Emoji, t.Format, t.Category }));
        });

        // POST /api/entertainment/memes/create
        ent.MapPost("/memes/create", async (CreateMemeRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            try
            {
                var meme = await svc.CreateMemeAsync(userId, req.TemplateId, req.TopText, req.BottomText);
                return Results.Ok(new { meme.Id, meme.RenderedText, meme.CreatedAt });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/entertainment/memes/{id}/vote
        ent.MapPost("/memes/{id}/vote", async (Guid id, VoteMemeRequest req, EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            try
            {
                var (upvotes, downvotes, userVote) = await svc.VoteMemeAsync(userId, id, req.VoteType);
                return Results.Ok(new { upvotes, downvotes, userVote });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // GET /api/entertainment/memes/gallery?sort=hot&page=0
        ent.MapGet("/memes/gallery", async (string? sort, int? page, EntertainmentService svc) =>
        {
            var memes = await svc.GetMemeGalleryAsync(sort ?? "hot", page ?? 0);
            return Results.Ok(memes.Select(m => new
            {
                m.Id, m.AuthorId, m.RenderedText, m.Upvotes, m.Downvotes, m.CreatedAt,
                templateId = m.TemplateId
            }));
        });

        // GET /api/entertainment/memes/mine
        ent.MapGet("/memes/mine", async (EntertainmentService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var memes = await svc.GetUserMemesAsync(userId);
            return Results.Ok(memes.Select(m => new { m.Id, m.RenderedText, m.Upvotes, m.Downvotes, m.CreatedAt }));
        });

        // ═══════════════════════════════════════════════════════════════════════
        //  SEED (Admin only — one-time)
        // ═══════════════════════════════════════════════════════════════════════

        app.MapPost("/api/entertainment/seed", async (EntertainmentService svc) =>
        {
            await svc.SeedIfEmptyAsync();
            await svc.SeedPhase2IfEmptyAsync();
            return Results.Ok(new { message = "Entertainment data seeded (Phase 1 + 2)." });
        }).RequireAuthorization("AdminOnly");
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────
public record AnswerRequest(string Answer);
public record CreateDuelRequest(string? Subject);
public record JoinDuelRequest(Guid? MatchId);
public record SubmitDuelRequest(List<DuelAnswerDto> Answers);
public record DuelAnswerDto(Guid QuestionId, int SelectedIndex, double ResponseTimeMs);
public record FeedBeastRequest(int FocusMinutes);
public record DamageBeastRequest(int IdleMinutes);
public record RenameBeastRequest(string Name);
public record CreateMemeRequest(Guid TemplateId, string TopText, string BottomText);
public record VoteMemeRequest(string VoteType);

