using MongoDB.Driver;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class EntertainmentService
{
    private readonly IMongoCollection<Quote> _quotes;
    private readonly IMongoCollection<QuoteStreak> _streaks;
    private readonly IMongoCollection<Riddle> _riddles;
    private readonly IMongoCollection<RiddleAttempt> _attempts;
    private readonly IMongoCollection<RoastLine> _roastLines;

    // Phase 2 collections
    private readonly IMongoCollection<DuelQuestion> _duelQuestions;
    private readonly IMongoCollection<DuelMatch> _duelMatches;
    private readonly IMongoCollection<DuelStats> _duelStats;
    private readonly IMongoCollection<FocusBeast> _focusBeasts;
    private readonly IMongoCollection<MemeTemplate> _memeTemplates;
    private readonly IMongoCollection<CreatedMeme> _createdMemes;

    public EntertainmentService(IMongoDatabase db)
    {
        _quotes    = db.GetCollection<Quote>("entertainment_quotes");
        _streaks   = db.GetCollection<QuoteStreak>("entertainment_quote_streaks");
        _riddles   = db.GetCollection<Riddle>("entertainment_riddles");
        _attempts  = db.GetCollection<RiddleAttempt>("entertainment_riddle_attempts");
        _roastLines = db.GetCollection<RoastLine>("entertainment_roast_lines");

        // Phase 2
        _duelQuestions = db.GetCollection<DuelQuestion>("entertainment_duel_questions");
        _duelMatches   = db.GetCollection<DuelMatch>("entertainment_duel_matches");
        _duelStats     = db.GetCollection<DuelStats>("entertainment_duel_stats");
        _focusBeasts   = db.GetCollection<FocusBeast>("entertainment_focus_beasts");
        _memeTemplates = db.GetCollection<MemeTemplate>("entertainment_meme_templates");
        _createdMemes  = db.GetCollection<CreatedMeme>("entertainment_created_memes");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  QUOTE DOJO
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>Get the deterministic quote of the day based on current UTC date.</summary>
    public async Task<Quote?> GetTodayQuoteAsync()
    {
        var dayIndex = GetDayIndex();
        var quote = await _quotes.Find(q => q.DayIndex == dayIndex).FirstOrDefaultAsync();

        if (quote == null)
        {
            // Fallback: cycle through total quotes
            var totalQuotes = await _quotes.CountDocumentsAsync(FilterDefinition<Quote>.Empty);
            if (totalQuotes == 0) return null;

            var cycledIndex = (int)(dayIndex % totalQuotes);
            quote = await _quotes.Find(_ => true)
                .Skip(cycledIndex)
                .Limit(1)
                .FirstOrDefaultAsync();
        }
        return quote;
    }

    /// <summary>Record that a user viewed today's quote + update streak.</summary>
    public async Task<QuoteStreak> RecordQuoteViewAsync(Guid userId)
    {
        var streak = await _streaks.Find(s => s.UserId == userId).FirstOrDefaultAsync();
        var now = DateTimeOffset.UtcNow;

        if (streak == null)
        {
            streak = new QuoteStreak
            {
                UserId = userId,
                CurrentStreak = 1,
                LongestStreak = 1,
                LastSeenAt = now,
            };
            await _streaks.InsertOneAsync(streak);
            return streak;
        }

        var hoursSinceLast = (now - streak.LastSeenAt).TotalHours;

        if (hoursSinceLast < 20)
        {
            // Already viewed today — no-op
            return streak;
        }
        else if (hoursSinceLast <= 48)
        {
            // Within grace period — extend streak
            streak.CurrentStreak++;
        }
        else
        {
            // Streak broken — reset
            streak.CurrentStreak = 1;
        }

        streak.LongestStreak = Math.Max(streak.LongestStreak, streak.CurrentStreak);
        streak.LastSeenAt = now;

        await _streaks.ReplaceOneAsync(s => s.UserId == userId, streak);
        return streak;
    }

    /// <summary>Toggle like on a quote.</summary>
    public async Task<bool> ToggleQuoteLikeAsync(Guid userId, Guid quoteId)
    {
        var streak = await _streaks.Find(s => s.UserId == userId).FirstOrDefaultAsync();
        if (streak == null) return false;

        bool isLiked;
        if (streak.LikedQuoteIds.Contains(quoteId))
        {
            streak.LikedQuoteIds.Remove(quoteId);
            isLiked = false;
        }
        else
        {
            streak.LikedQuoteIds.Add(quoteId);
            isLiked = true;
        }

        await _streaks.ReplaceOneAsync(s => s.UserId == userId, streak);
        return isLiked;
    }

    /// <summary>Pin a quote to profile.</summary>
    public async Task PinQuoteAsync(Guid userId, Guid quoteId)
    {
        var update = Builders<QuoteStreak>.Update.Set(s => s.PinnedQuoteId, quoteId);
        await _streaks.UpdateOneAsync(s => s.UserId == userId, update);
    }

    /// <summary>Get the user's quote streak info.</summary>
    public async Task<QuoteStreak?> GetQuoteStreakAsync(Guid userId)
    {
        return await _streaks.Find(s => s.UserId == userId).FirstOrDefaultAsync();
    }

    /// <summary>Get all liked quotes for collection page.</summary>
    public async Task<List<Quote>> GetLikedQuotesAsync(Guid userId)
    {
        var streak = await _streaks.Find(s => s.UserId == userId).FirstOrDefaultAsync();
        if (streak == null || streak.LikedQuoteIds.Count == 0) return new();

        return await _quotes.Find(q => streak.LikedQuoteIds.Contains(q.Id)).ToListAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  RIDDLE LABYRINTH
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>Get today's riddle (deterministic by date).</summary>
    public async Task<Riddle?> GetTodayRiddleAsync()
    {
        var dayIndex = GetDayIndex();
        var riddle = await _riddles.Find(r => r.DayIndex == dayIndex).FirstOrDefaultAsync();

        if (riddle == null)
        {
            var total = await _riddles.CountDocumentsAsync(FilterDefinition<Riddle>.Empty);
            if (total == 0) return null;
            var cycled = (int)(dayIndex % total);
            riddle = await _riddles.Find(_ => true).Skip(cycled).Limit(1).FirstOrDefaultAsync();
        }
        return riddle;
    }

    /// <summary>Get user's attempt for today's riddle.</summary>
    public async Task<RiddleAttempt?> GetAttemptAsync(Guid userId, Guid riddleId)
    {
        return await _attempts.Find(a => a.UserId == userId && a.RiddleId == riddleId)
            .FirstOrDefaultAsync();
    }

    /// <summary>Submit an answer for a riddle. Returns (correct, score, attempt).</summary>
    public async Task<(bool correct, int score, RiddleAttempt attempt)> SubmitAnswerAsync(
        Guid userId, Guid riddleId, string answer)
    {
        var riddle = await _riddles.Find(r => r.Id == riddleId).FirstOrDefaultAsync();
        if (riddle == null) throw new InvalidOperationException("Riddle not found.");

        var attempt = await GetAttemptAsync(userId, riddleId);
        if (attempt == null)
        {
            attempt = new RiddleAttempt { UserId = userId, RiddleId = riddleId };
            await _attempts.InsertOneAsync(attempt);
        }

        if (attempt.Solved)
            return (true, attempt.Score, attempt);

        if (attempt.WrongAttempts >= 5)
            throw new InvalidOperationException("Maximum attempts reached for this riddle.");

        // Fuzzy-match answer: case-insensitive, trimmed
        var isCorrect = string.Equals(
            answer.Trim(), riddle.Answer.Trim(), StringComparison.OrdinalIgnoreCase);

        if (isCorrect)
        {
            attempt.Solved = true;
            attempt.SolvedAt = DateTimeOffset.UtcNow;
            attempt.Score = attempt.HintsUsed switch
            {
                0 => 100,
                1 => 75,
                2 => 50,
                _ => 25
            };
        }
        else
        {
            attempt.WrongAttempts++;
        }

        await _attempts.ReplaceOneAsync(a => a.Id == attempt.Id, attempt);
        return (isCorrect, attempt.Score, attempt);
    }

    /// <summary>Reveal a hint for a riddle. Returns hint text or null if none left.</summary>
    public async Task<string?> RevealHintAsync(Guid userId, Guid riddleId)
    {
        var riddle = await _riddles.Find(r => r.Id == riddleId).FirstOrDefaultAsync();
        if (riddle == null) return null;

        var attempt = await GetAttemptAsync(userId, riddleId);
        if (attempt == null)
        {
            attempt = new RiddleAttempt { UserId = userId, RiddleId = riddleId };
            await _attempts.InsertOneAsync(attempt);
        }

        if (attempt.HintsUsed >= riddle.Hints.Count) return null;

        var hint = riddle.Hints[attempt.HintsUsed];
        attempt.HintsUsed++;
        await _attempts.ReplaceOneAsync(a => a.Id == attempt.Id, attempt);
        return hint;
    }

    /// <summary>Weekly leaderboard — top solvers by total score.</summary>
    public async Task<List<LeaderboardEntry>> GetRiddleLeaderboardAsync(int top = 20)
    {
        var weekStart = DateTimeOffset.UtcNow.AddDays(-7);

        var pipeline = _attempts.Aggregate()
            .Match(a => a.Solved && a.SolvedAt >= weekStart)
            .Group(a => a.UserId, g => new LeaderboardEntry
            {
                UserId = g.Key,
                TotalScore = g.Sum(a => a.Score),
                RiddlesSolved = g.Count()
            })
            .SortByDescending(e => e.TotalScore)
            .Limit(top);

        return await pipeline.ToListAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PROCRASTINATION ROASTER
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>Get random roast lines by category.</summary>
    public async Task<List<RoastLine>> GetRoastLinesAsync(string category = "idle", int count = 5)
    {
        // Get all lines for category, then random sample in memory (small collection)
        var lines = await _roastLines.Find(r => r.Category == category).ToListAsync();
        if (lines.Count <= count) return lines;

        var rng = new Random();
        return lines.OrderBy(_ => rng.Next()).Take(count).ToList();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SEED DATA
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>Seed initial entertainment data if collections are empty.</summary>
    public async Task SeedIfEmptyAsync()
    {
        // ── Quotes ──
        if (await _quotes.CountDocumentsAsync(FilterDefinition<Quote>.Empty) == 0)
        {
            var quotes = new List<Quote>
            {
                new() { Text = "The only way to do great work is to love what you do.", Author = "Steve Jobs", Category = "motivation", DayIndex = 0 },
                new() { Text = "Education is the most powerful weapon which you can use to change the world.", Author = "Nelson Mandela", Category = "motivation", DayIndex = 1 },
                new() { Text = "The mind is not a vessel to be filled, but a fire to be kindled.", Author = "Plutarch", Category = "philosophy", DayIndex = 2 },
                new() { Text = "In the middle of difficulty lies opportunity.", Author = "Albert Einstein", Category = "motivation", DayIndex = 3 },
                new() { Text = "Tell me and I forget. Teach me and I remember. Involve me and I learn.", Author = "Benjamin Franklin", Category = "motivation", DayIndex = 4 },
                new() { Text = "The beautiful thing about learning is that nobody can take it away from you.", Author = "B.B. King", Category = "motivation", DayIndex = 5 },
                new() { Text = "It does not matter how slowly you go, as long as you do not stop.", Author = "Confucius", Category = "philosophy", DayIndex = 6 },
                new() { Text = "The expert in anything was once a beginner.", Author = "Helen Hayes", Category = "motivation", DayIndex = 7 },
                new() { Text = "Success is not final, failure is not fatal: it is the courage to continue that counts.", Author = "Winston Churchill", Category = "motivation", DayIndex = 8 },
                new() { Text = "The roots of education are bitter, but the fruit is sweet.", Author = "Aristotle", Category = "philosophy", DayIndex = 9 },
                new() { Text = "Live as if you were to die tomorrow. Learn as if you were to live forever.", Author = "Mahatma Gandhi", Category = "philosophy", DayIndex = 10 },
                new() { Text = "Imagination is more important than knowledge.", Author = "Albert Einstein", Category = "science", DayIndex = 11 },
                new() { Text = "The only limit to our realization of tomorrow is our doubts of today.", Author = "Franklin D. Roosevelt", Category = "motivation", DayIndex = 12 },
                new() { Text = "An investment in knowledge pays the best interest.", Author = "Benjamin Franklin", Category = "motivation", DayIndex = 13 },
                new() { Text = "The secret of getting ahead is getting started.", Author = "Mark Twain", Category = "motivation", DayIndex = 14 },
                new() { Text = "What we know is a drop, what we don't know is an ocean.", Author = "Isaac Newton", Category = "science", DayIndex = 15 },
                new() { Text = "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", Author = "Brian Herbert", Category = "motivation", DayIndex = 16 },
                new() { Text = "Your time is limited, don't waste it living someone else's life.", Author = "Steve Jobs", Category = "motivation", DayIndex = 17 },
                new() { Text = "I have no special talents. I am only passionately curious.", Author = "Albert Einstein", Category = "science", DayIndex = 18 },
                new() { Text = "The more that you read, the more things you will know.", Author = "Dr. Seuss", Category = "motivation", DayIndex = 19 },
                new() { Text = "A person who never made a mistake never tried anything new.", Author = "Albert Einstein", Category = "science", DayIndex = 20 },
                new() { Text = "You don't have to be great to start, but you have to start to be great.", Author = "Zig Ziglar", Category = "motivation", DayIndex = 21 },
                new() { Text = "Learning never exhausts the mind.", Author = "Leonardo da Vinci", Category = "philosophy", DayIndex = 22 },
                new() { Text = "The only person you are destined to become is the person you decide to be.", Author = "Ralph Waldo Emerson", Category = "philosophy", DayIndex = 23 },
                new() { Text = "Don't let what you cannot do interfere with what you can do.", Author = "John Wooden", Category = "motivation", DayIndex = 24 },
                new() { Text = "Genius is one percent inspiration and ninety-nine percent perspiration.", Author = "Thomas Edison", Category = "science", DayIndex = 25 },
                new() { Text = "The only true wisdom is in knowing you know nothing.", Author = "Socrates", Category = "philosophy", DayIndex = 26 },
                new() { Text = "Start where you are. Use what you have. Do what you can.", Author = "Arthur Ashe", Category = "motivation", DayIndex = 27 },
                new() { Text = "In learning you will teach, and in teaching you will learn.", Author = "Phil Collins", Category = "motivation", DayIndex = 28 },
                new() { Text = "If you think education is expensive, try ignorance.", Author = "Jeff Rich", Category = "humor", DayIndex = 29 },
            };
            await _quotes.InsertManyAsync(quotes);
        }

        // ── Riddles ──
        if (await _riddles.CountDocumentsAsync(FilterDefinition<Riddle>.Empty) == 0)
        {
            var riddles = new List<Riddle>
            {
                new() { Text = "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", Answer = "A map", Hints = new() { "You can fold me", "I show directions", "Explorers love me" }, Difficulty = 1, DayIndex = 0 },
                new() { Text = "The more you take, the more you leave behind. What am I?", Answer = "Footsteps", Hints = new() { "Think about walking", "You make them on sand", "They disappear in rain" }, Difficulty = 1, DayIndex = 1 },
                new() { Text = "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?", Answer = "An echo", Hints = new() { "Mountains know me well", "I repeat what you say", "I am a reflection of sound" }, Difficulty = 2, DayIndex = 2 },
                new() { Text = "What has keys but no locks, space but no room, and you can enter but can't go inside?", Answer = "A keyboard", Hints = new() { "You use it every day", "It has letters", "It connects to a computer" }, Difficulty = 1, DayIndex = 3 },
                new() { Text = "I am not alive, but I grow. I don't have lungs, but I need air. What am I?", Answer = "Fire", Hints = new() { "I can be dangerous", "I produce light", "Water is my enemy" }, Difficulty = 1, DayIndex = 4 },
                new() { Text = "What can travel around the world while staying in a corner?", Answer = "A stamp", Hints = new() { "I am small and flat", "I go on envelopes", "You lick me" }, Difficulty = 1, DayIndex = 5 },
                new() { Text = "I have hands but can't clap. What am I?", Answer = "A clock", Hints = new() { "I live on walls", "I have numbers", "I tell you something important" }, Difficulty = 1, DayIndex = 6 },
                new() { Text = "What gets wetter the more it dries?", Answer = "A towel", Hints = new() { "You use me after a shower", "I am made of fabric", "I absorb water" }, Difficulty = 1, DayIndex = 7 },
                new() { Text = "If you have me, you want to share me. If you share me, you no longer have me. What am I?", Answer = "A secret", Hints = new() { "I am invisible", "Friends tell me to each other", "I should be kept safe" }, Difficulty = 2, DayIndex = 8 },
                new() { Text = "What comes once in a minute, twice in a moment, but never in a thousand years?", Answer = "The letter M", Hints = new() { "Look at the words carefully", "It is a letter", "Count the letters in each word" }, Difficulty = 2, DayIndex = 9 },
                new() { Text = "I can be cracked, made, told, and played. What am I?", Answer = "A joke", Hints = new() { "I make people laugh", "Comedians are experts at me", "You are reading one kind right now" }, Difficulty = 1, DayIndex = 10 },
                new() { Text = "What has a head and a tail but no body?", Answer = "A coin", Hints = new() { "I am round and metallic", "I have value", "You can flip me" }, Difficulty = 1, DayIndex = 11 },
                new() { Text = "What 5-letter word becomes shorter when you add two letters to it?", Answer = "Short", Hints = new() { "The answer is in the question", "Think literally about the word", "Add '-er' to it" }, Difficulty = 2, DayIndex = 12 },
                new() { Text = "I am always hungry and will die if not fed, but whatever I touch will soon turn red. What am I?", Answer = "Fire", Hints = new() { "I consume everything", "I am hot", "Firefighters fight me" }, Difficulty = 2, DayIndex = 13 },
            };
            await _riddles.InsertManyAsync(riddles);
        }

        // ── Roast Lines ──
        if (await _roastLines.CountDocumentsAsync(FilterDefinition<RoastLine>.Empty) == 0)
        {
            var lines = new List<RoastLine>
            {
                // Idle roasts (5+ min inactive)
                new() { Text = "Your textbook is crying. I can hear it from here. 📚😢", Category = "idle", MinIdleMinutes = 5 },
                new() { Text = "Are you still there? Your brain cells are filing a missing person report.", Category = "idle", MinIdleMinutes = 5 },
                new() { Text = "Plot twist: The screen is also waiting for you.", Category = "idle", MinIdleMinutes = 5 },
                new() { Text = "Fun fact: Your homework doesn't do itself. I checked.", Category = "idle", MinIdleMinutes = 7 },
                new() { Text = "I've seen glaciers move faster than your progress right now. 🧊", Category = "idle", MinIdleMinutes = 7 },
                new() { Text = "Legend says if you stare at this screen long enough, knowledge will download directly. Spoiler: it won't.", Category = "idle", MinIdleMinutes = 10 },
                new() { Text = "Your future self is writing a strongly worded letter right now.", Category = "idle", MinIdleMinutes = 10 },
                new() { Text = "Even the loading spinner is done. It's your turn now.", Category = "idle", MinIdleMinutes = 5 },
                new() { Text = "At this point, even the Wi-Fi has better focus than you. 📶", Category = "idle", MinIdleMinutes = 8 },
                new() { Text = "Breaking news: Student discovers infinite scrolling does NOT count as studying.", Category = "idle", MinIdleMinutes = 5 },

                // Return roasts (welcome back)
                new() { Text = "Oh, you're back! The textbooks were about to stage an intervention. 📖", Category = "return", MinIdleMinutes = 0 },
                new() { Text = "Welcome back! Your brain just sent a thank you card. 🧠", Category = "return", MinIdleMinutes = 0 },
                new() { Text = "The comeback kid! Your grades are already celebrating. 🎉", Category = "return", MinIdleMinutes = 0 },
                new() { Text = "And the hero returns! Quick, the knowledge is still warm!", Category = "return", MinIdleMinutes = 0 },
                new() { Text = "Nice of you to join us! Let's make this count. 💪", Category = "return", MinIdleMinutes = 0 },

                // Streak roasts (for consistent users)
                new() { Text = "You're on fire! But like, the good kind. Not the homework-burning kind. 🔥", Category = "streak", MinIdleMinutes = 0 },
                new() { Text = "At this rate, even your teacher is going to ask for study tips.", Category = "streak", MinIdleMinutes = 0 },
                new() { Text = "Your consistency is so impressive, even the calendar is taking notes. 📅", Category = "streak", MinIdleMinutes = 0 },
                new() { Text = "You're studying so hard, Google is starting to learn from YOU.", Category = "streak", MinIdleMinutes = 0 },
                new() { Text = "Legends say that students who study this hard unlock a secret level. Keep going. 🎮", Category = "streak", MinIdleMinutes = 0 },
            };
            await _roastLines.InsertManyAsync(lines);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>Deterministic day index based on UTC date (days since epoch).</summary>
    private static int GetDayIndex()
    {
        return (int)(DateTimeOffset.UtcNow.Date - new DateTime(2024, 1, 1)).TotalDays;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  BRAIN DUEL ARENA (Phase 2)
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<DuelMatch> CreateDuelAsync(Guid challengerId, string subject = "general")
    {
        var questions = await _duelQuestions
            .Find(q => q.Subject == subject)
            .ToListAsync();

        var rng = new Random();
        var selectedIds = questions.OrderBy(_ => rng.Next()).Take(5).Select(q => q.Id).ToList();

        var match = new DuelMatch
        {
            ChallengerId = challengerId,
            Subject = subject,
            QuestionIds = selectedIds,
            Status = "waiting"
        };
        await _duelMatches.InsertOneAsync(match);
        return match;
    }

    public async Task<DuelMatch?> JoinDuelAsync(Guid opponentId, Guid? matchId = null)
    {
        DuelMatch? match;
        if (matchId.HasValue)
        {
            match = await _duelMatches.Find(m => m.Id == matchId.Value && m.Status == "waiting").FirstOrDefaultAsync();
        }
        else
        {
            match = await _duelMatches.Find(m => m.Status == "waiting" && m.ChallengerId != opponentId)
                .SortBy(m => m.CreatedAt).FirstOrDefaultAsync();
        }
        if (match == null) return null;

        match.OpponentId = opponentId;
        match.Status = "active";
        await _duelMatches.ReplaceOneAsync(m => m.Id == match.Id, match);
        return match;
    }

    public async Task<List<DuelQuestion>> GetDuelQuestionsAsync(Guid matchId)
    {
        var match = await _duelMatches.Find(m => m.Id == matchId).FirstOrDefaultAsync();
        if (match == null) return new();
        return await _duelQuestions.Find(q => match.QuestionIds.Contains(q.Id)).ToListAsync();
    }

    public async Task<DuelMatch?> SubmitDuelAnswersAsync(Guid userId, Guid matchId, List<DuelAnswer> answers)
    {
        var match = await _duelMatches.Find(m => m.Id == matchId).FirstOrDefaultAsync();
        if (match == null || match.Status != "active") return null;

        var questions = await _duelQuestions.Find(q => match.QuestionIds.Contains(q.Id)).ToListAsync();
        var qMap = questions.ToDictionary(q => q.Id);

        foreach (var a in answers)
            if (qMap.TryGetValue(a.QuestionId, out var q))
                a.Correct = a.SelectedIndex == q.CorrectIndex;

        var score = answers.Count(a => a.Correct) * 20; // 20 pts per correct

        bool isChallenger = match.ChallengerId == userId;
        if (isChallenger) { match.ChallengerAnswers = answers; match.ChallengerScore = score; }
        else { match.OpponentAnswers = answers; match.OpponentScore = score; }

        // Check if both sides answered
        if (match.ChallengerAnswers.Count > 0 && match.OpponentAnswers.Count > 0)
        {
            match.Status = "completed";
            match.CompletedAt = DateTimeOffset.UtcNow;
            match.WinnerId = match.ChallengerScore > match.OpponentScore ? match.ChallengerId
                : match.OpponentScore > match.ChallengerScore ? match.OpponentId : null;

            await UpdateDuelStatsAsync(match);
        }

        await _duelMatches.ReplaceOneAsync(m => m.Id == match.Id, match);
        return match;
    }

    private async Task UpdateDuelStatsAsync(DuelMatch match)
    {
        foreach (var uid in new[] { match.ChallengerId, match.OpponentId!.Value })
        {
            var stats = await _duelStats.Find(s => s.UserId == uid).FirstOrDefaultAsync()
                ?? new DuelStats { UserId = uid };

            stats.TotalDuels++;
            if (match.WinnerId == uid) { stats.Wins++; stats.CurrentWinStreak++; stats.Rating += 25; }
            else if (match.WinnerId == null) { stats.Draws++; stats.CurrentWinStreak = 0; }
            else { stats.Losses++; stats.CurrentWinStreak = 0; stats.Rating = Math.Max(100, stats.Rating - 15); }

            stats.BestWinStreak = Math.Max(stats.BestWinStreak, stats.CurrentWinStreak);

            await _duelStats.ReplaceOneAsync(s => s.UserId == uid, stats,
                new ReplaceOptions { IsUpsert = true });
        }
    }

    public async Task<DuelStats> GetDuelStatsAsync(Guid userId)
    {
        return await _duelStats.Find(s => s.UserId == userId).FirstOrDefaultAsync()
            ?? new DuelStats { UserId = userId };
    }

    public async Task<List<DuelStats>> GetDuelLeaderboardAsync(int top = 20)
    {
        return await _duelStats.Find(_ => true)
            .SortByDescending(s => s.Rating).Limit(top).ToListAsync();
    }

    public async Task<List<DuelMatch>> GetUserDuelHistoryAsync(Guid userId, int limit = 10)
    {
        return await _duelMatches
            .Find(m => (m.ChallengerId == userId || m.OpponentId == userId) && m.Status == "completed")
            .SortByDescending(m => m.CompletedAt).Limit(limit).ToListAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FOCUS BEAST (Phase 2)
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<FocusBeast> GetOrCreateBeastAsync(Guid userId)
    {
        var beast = await _focusBeasts.Find(b => b.UserId == userId).FirstOrDefaultAsync();
        if (beast != null) return beast;

        beast = new FocusBeast { UserId = userId };
        await _focusBeasts.InsertOneAsync(beast);
        return beast;
    }

    public async Task<FocusBeast> FeedBeastAsync(Guid userId, int focusMinutes)
    {
        var beast = await GetOrCreateBeastAsync(userId);
        var xpGain = focusMinutes * 10; // 10 XP per focus minute
        beast.Experience += xpGain;
        beast.TotalFocusMinutes += focusMinutes;
        beast.Health = Math.Min(beast.MaxHealth, beast.Health + focusMinutes / 2);
        beast.LastFedAt = DateTimeOffset.UtcNow;

        // Level up: every 500 XP
        var newLevel = (beast.Experience / 500) + 1;
        if (newLevel > beast.Level)
        {
            beast.Level = newLevel;
            beast.MaxHealth = 100 + (beast.Level - 1) * 20;
        }

        // Stage evolution
        beast.Stage = beast.Level switch
        {
            >= 20 => "legend",
            >= 12 => "warrior",
            >= 6  => "juvenile",
            >= 2  => "hatchling",
            _     => "egg"
        };
        beast.Avatar = beast.Stage switch
        {
            "legend"    => "🐉",
            "warrior"   => "🦁",
            "juvenile"  => "🐺",
            "hatchling" => "🐣",
            _           => "🥚"
        };

        await _focusBeasts.ReplaceOneAsync(b => b.UserId == userId, beast);
        return beast;
    }

    public async Task<FocusBeast> DamageBeastAsync(Guid userId, int idleMinutes)
    {
        var beast = await GetOrCreateBeastAsync(userId);
        var damage = Math.Min(idleMinutes, 10); // Cap damage at 10 per check
        beast.Health = Math.Max(0, beast.Health - damage);
        beast.IdleDamageToday += damage;
        beast.LastIdleCheckAt = DateTimeOffset.UtcNow;

        await _focusBeasts.ReplaceOneAsync(b => b.UserId == userId, beast);
        return beast;
    }

    public async Task<FocusBeast> RenameBeastAsync(Guid userId, string name)
    {
        var beast = await GetOrCreateBeastAsync(userId);
        beast.Name = name.Trim().Length > 0 ? name.Trim()[..Math.Min(name.Trim().Length, 20)] : beast.Name;
        await _focusBeasts.ReplaceOneAsync(b => b.UserId == userId, beast);
        return beast;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  MEME FORGE (Phase 2)
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<List<MemeTemplate>> GetMemeTemplatesAsync(string? category = null)
    {
        var filter = category != null
            ? Builders<MemeTemplate>.Filter.Eq(t => t.Category, category) & Builders<MemeTemplate>.Filter.Eq(t => t.Active, true)
            : Builders<MemeTemplate>.Filter.Eq(t => t.Active, true);
        return await _memeTemplates.Find(filter).ToListAsync();
    }

    public async Task<CreatedMeme> CreateMemeAsync(Guid authorId, Guid templateId, string topText, string bottomText)
    {
        var template = await _memeTemplates.Find(t => t.Id == templateId).FirstOrDefaultAsync();
        if (template == null) throw new InvalidOperationException("Template not found.");

        var rendered = template.Format
            .Replace("{top}", topText.Trim())
            .Replace("{bottom}", bottomText.Trim());

        var meme = new CreatedMeme
        {
            AuthorId = authorId,
            TemplateId = templateId,
            TopText = topText.Trim(),
            BottomText = bottomText.Trim(),
            RenderedText = rendered,
        };
        await _createdMemes.InsertOneAsync(meme);
        return meme;
    }

    public async Task<(int upvotes, int downvotes, string userVote)> VoteMemeAsync(Guid userId, Guid memeId, string voteType)
    {
        var meme = await _createdMemes.Find(m => m.Id == memeId).FirstOrDefaultAsync();
        if (meme == null) throw new InvalidOperationException("Meme not found.");
        if (meme.AuthorId == userId) throw new InvalidOperationException("Cannot vote on your own meme.");

        // Remove existing votes
        if (meme.UpvotedBy.Contains(userId)) { meme.UpvotedBy.Remove(userId); meme.Upvotes--; }
        if (meme.DownvotedBy.Contains(userId)) { meme.DownvotedBy.Remove(userId); meme.Downvotes--; }

        string userVote = "none";
        if (voteType == "up") { meme.UpvotedBy.Add(userId); meme.Upvotes++; userVote = "up"; }
        else if (voteType == "down") { meme.DownvotedBy.Add(userId); meme.Downvotes++; userVote = "down"; }

        await _createdMemes.ReplaceOneAsync(m => m.Id == memeId, meme);
        return (meme.Upvotes, meme.Downvotes, userVote);
    }

    public async Task<List<CreatedMeme>> GetMemeGalleryAsync(string sort = "hot", int page = 0, int pageSize = 20)
    {
        var filter = Builders<CreatedMeme>.Filter.Eq(m => m.Flagged, false);
        var query = _createdMemes.Find(filter);

        query = sort switch
        {
            "new" => query.SortByDescending(m => m.CreatedAt),
            "top" => query.SortByDescending(m => m.Upvotes),
            _ => query.SortByDescending(m => m.Upvotes - m.Downvotes) // "hot"
        };

        return await query.Skip(page * pageSize).Limit(pageSize).ToListAsync();
    }

    public async Task<List<CreatedMeme>> GetUserMemesAsync(Guid userId)
    {
        return await _createdMemes.Find(m => m.AuthorId == userId)
            .SortByDescending(m => m.CreatedAt).Limit(50).ToListAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PHASE 2 SEED DATA
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task SeedPhase2IfEmptyAsync()
    {
        // ── Duel Questions ──
        if (await _duelQuestions.CountDocumentsAsync(FilterDefinition<DuelQuestion>.Empty) == 0)
        {
            var questions = new List<DuelQuestion>
            {
                new() { Text = "What is 15 × 12?", Options = new() { "160", "170", "180", "190" }, CorrectIndex = 2, Subject = "math", Difficulty = 1 },
                new() { Text = "What planet is known as the Red Planet?", Options = new() { "Venus", "Mars", "Jupiter", "Saturn" }, CorrectIndex = 1, Subject = "science", Difficulty = 1 },
                new() { Text = "What is the chemical symbol for Gold?", Options = new() { "Go", "Gd", "Au", "Ag" }, CorrectIndex = 2, Subject = "science", Difficulty = 1 },
                new() { Text = "In which year did World War II end?", Options = new() { "1943", "1944", "1945", "1946" }, CorrectIndex = 2, Subject = "history", Difficulty = 1 },
                new() { Text = "What is the largest ocean on Earth?", Options = new() { "Atlantic", "Indian", "Arctic", "Pacific" }, CorrectIndex = 3, Subject = "science", Difficulty = 1 },
                new() { Text = "What is the square root of 144?", Options = new() { "10", "11", "12", "14" }, CorrectIndex = 2, Subject = "math", Difficulty = 1 },
                new() { Text = "Who wrote 'Romeo and Juliet'?", Options = new() { "Dickens", "Shakespeare", "Austen", "Twain" }, CorrectIndex = 1, Subject = "language", Difficulty = 1 },
                new() { Text = "What gas do plants absorb from the atmosphere?", Options = new() { "Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen" }, CorrectIndex = 2, Subject = "science", Difficulty = 1 },
                new() { Text = "What is 2^10?", Options = new() { "512", "1024", "2048", "256" }, CorrectIndex = 1, Subject = "math", Difficulty = 2 },
                new() { Text = "Who painted the Mona Lisa?", Options = new() { "Picasso", "Da Vinci", "Van Gogh", "Monet" }, CorrectIndex = 1, Subject = "general", Difficulty = 1 },
                new() { Text = "What is the speed of light approximately?", Options = new() { "300,000 km/s", "150,000 km/s", "500,000 km/s", "100,000 km/s" }, CorrectIndex = 0, Subject = "science", Difficulty = 2 },
                new() { Text = "What is the capital of Australia?", Options = new() { "Sydney", "Melbourne", "Canberra", "Perth" }, CorrectIndex = 2, Subject = "general", Difficulty = 2 },
                new() { Text = "What is the derivative of x²?", Options = new() { "x", "2x", "x²", "2" }, CorrectIndex = 1, Subject = "math", Difficulty = 2 },
                new() { Text = "Which element has atomic number 1?", Options = new() { "Helium", "Hydrogen", "Lithium", "Carbon" }, CorrectIndex = 1, Subject = "science", Difficulty = 1 },
                new() { Text = "What language has the most native speakers?", Options = new() { "English", "Hindi", "Spanish", "Mandarin" }, CorrectIndex = 3, Subject = "language", Difficulty = 2 },
            };
            await _duelQuestions.InsertManyAsync(questions);
        }

        // ── Meme Templates ──
        if (await _memeTemplates.CountDocumentsAsync(FilterDefinition<MemeTemplate>.Empty) == 0)
        {
            var templates = new List<MemeTemplate>
            {
                new() { Name = "The Struggle", Emoji = "😩", Format = "When {top} but then {bottom}", Category = "study" },
                new() { Name = "Plot Twist", Emoji = "😱", Format = "{top}... Plot twist: {bottom}", Category = "exam" },
                new() { Name = "Teacher Mode", Emoji = "👨‍🏫", Format = "Teacher: {top}\nMe: {bottom}", Category = "teacher" },
                new() { Name = "Brain vs Me", Emoji = "🧠", Format = "My brain: {top}\nAlso my brain: {bottom}", Category = "study" },
                new() { Name = "Homework Life", Emoji = "📚", Format = "Homework be like: {top}\nReality: {bottom}", Category = "homework" },
                new() { Name = "Two Buttons", Emoji = "🔴", Format = "Option A: {top}\nOption B: {bottom}\nMe: *sweats*", Category = "exam" },
                new() { Name = "That Moment", Emoji = "💀", Format = "That moment when {top} and you realize {bottom}", Category = "general" },
                new() { Name = "Expectation", Emoji = "🎭", Format = "Expectation: {top}\nReality: {bottom}", Category = "general" },
            };
            await _memeTemplates.InsertManyAsync(templates);
        }
    }
}

/// <summary>DTO for riddle leaderboard.</summary>
public class LeaderboardEntry
{
    public Guid UserId { get; set; }
    public int TotalScore { get; set; }
    public int RiddlesSolved { get; set; }
    public string? DisplayName { get; set; }
}
