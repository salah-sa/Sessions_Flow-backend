import { fetchWithAuth } from "./client";

// ═══════════════════════════════════════════════════════════════════════════════
//  QUOTE DOJO
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuoteData {
  id: string;
  text: string;
  author: string;
  category: string;
}

export interface QuoteStreakData {
  currentStreak: number;
  longestStreak: number;
  likedQuoteIds: string[];
  pinnedQuoteId: string | null;
}

export interface TodayQuoteResponse {
  quote: QuoteData | null;
  streak: QuoteStreakData | null;
}

export const quoteApi = {
  getToday: () =>
    fetchWithAuth<TodayQuoteResponse>("/entertainment/quotes/today"),

  getStreak: () =>
    fetchWithAuth<QuoteStreakData>("/entertainment/quotes/streak"),

  toggleLike: (quoteId: string) =>
    fetchWithAuth<{ liked: boolean }>(`/entertainment/quotes/${quoteId}/like`, { method: "POST" }),

  pinQuote: (quoteId: string) =>
    fetchWithAuth<{ pinned: boolean }>(`/entertainment/quotes/${quoteId}/pin`, { method: "POST" }),

  getCollection: () =>
    fetchWithAuth<QuoteData[]>("/entertainment/quotes/collection"),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RIDDLE LABYRINTH
// ═══════════════════════════════════════════════════════════════════════════════

export interface RiddleData {
  id: string;
  text: string;
  difficulty: number;
  hintCount: number;
}

export interface RiddleAttemptData {
  solved: boolean;
  hintsUsed: number;
  wrongAttempts: number;
  score: number;
}

export interface TodayRiddleResponse {
  riddle: RiddleData | null;
  attempt: RiddleAttemptData | null;
}

export interface AnswerResponse {
  correct: boolean;
  score: number;
  attempt: RiddleAttemptData;
}

export interface LeaderboardEntry {
  userId: string;
  totalScore: number;
  riddlesSolved: number;
  displayName?: string;
}

export const riddleApi = {
  getToday: () =>
    fetchWithAuth<TodayRiddleResponse>("/entertainment/riddles/today"),

  submitAnswer: (riddleId: string, answer: string) =>
    fetchWithAuth<AnswerResponse>(`/entertainment/riddles/${riddleId}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),

  revealHint: (riddleId: string) =>
    fetchWithAuth<{ hint: string | null; message?: string }>(`/entertainment/riddles/${riddleId}/hint`, {
      method: "POST",
    }),

  getLeaderboard: () =>
    fetchWithAuth<LeaderboardEntry[]>("/entertainment/riddles/leaderboard"),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCRASTINATION ROASTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoastLineData {
  id: string;
  text: string;
  category: string;
  minIdleMinutes: number;
}

export const roasterApi = {
  getLines: (category: string = "idle") =>
    fetchWithAuth<RoastLineData[]>(`/entertainment/roaster/lines?category=${category}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BRAIN DUEL ARENA (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DuelMatchData {
  id: string;
  status: string;
  subject: string;
  questionCount?: number;
  challengerScore?: number;
  opponentScore?: number;
  winnerId?: string | null;
}

export interface DuelQuestionData {
  id: string;
  text: string;
  options: string[];
  timeLimitSeconds: number;
  difficulty: number;
}

export interface DuelSubmitResponse {
  status: string;
  yourScore: number;
  opponentScore: number;
  winnerId: string | null;
  isWinner: boolean;
}

export interface DuelStatsData {
  userId: string;
  wins: number;
  losses: number;
  draws: number;
  totalDuels: number;
  currentWinStreak: number;
  bestWinStreak: number;
  rating: number;
}

export interface DuelHistoryEntry {
  id: string;
  subject: string;
  challengerScore: number;
  opponentScore: number;
  winnerId: string | null;
  completedAt: string;
  isWinner: boolean;
  isChallenger: boolean;
}

export const duelApi = {
  create: (subject?: string) =>
    fetchWithAuth<DuelMatchData>("/entertainment/duel/create", {
      method: "POST",
      body: JSON.stringify({ subject: subject || "general" }),
    }),
  join: (matchId?: string) =>
    fetchWithAuth<DuelMatchData>("/entertainment/duel/join", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    }),
  getQuestions: (matchId: string) =>
    fetchWithAuth<DuelQuestionData[]>(`/entertainment/duel/${matchId}/questions`),
  submit: (matchId: string, answers: { questionId: string; selectedIndex: number; responseTimeMs: number }[]) =>
    fetchWithAuth<DuelSubmitResponse>(`/entertainment/duel/${matchId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  getStats: () => fetchWithAuth<DuelStatsData>("/entertainment/duel/stats"),
  getLeaderboard: () => fetchWithAuth<DuelStatsData[]>("/entertainment/duel/leaderboard"),
  getHistory: () => fetchWithAuth<DuelHistoryEntry[]>("/entertainment/duel/history"),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FOCUS BEAST (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FocusBeastData {
  id: string;
  userId: string;
  name: string;
  stage: string;
  experience: number;
  level: number;
  health: number;
  maxHealth: number;
  avatar: string;
  totalFocusMinutes: number;
  idleDamageToday: number;
  lastFedAt: string;
  createdAt: string;
}

export const beastApi = {
  get: () => fetchWithAuth<FocusBeastData>("/entertainment/beast"),
  feed: (focusMinutes: number) =>
    fetchWithAuth<FocusBeastData>("/entertainment/beast/feed", {
      method: "POST",
      body: JSON.stringify({ focusMinutes }),
    }),
  damage: (idleMinutes: number) =>
    fetchWithAuth<FocusBeastData>("/entertainment/beast/damage", {
      method: "POST",
      body: JSON.stringify({ idleMinutes }),
    }),
  rename: (name: string) =>
    fetchWithAuth<FocusBeastData>("/entertainment/beast/rename", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MEME FORGE (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemeTemplateData {
  id: string;
  name: string;
  emoji: string;
  format: string;
  category: string;
}

export interface CreatedMemeData {
  id: string;
  authorId?: string;
  renderedText: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  templateId?: string;
}

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  userVote: string;
}

export const memeApi = {
  getTemplates: (category?: string) =>
    fetchWithAuth<MemeTemplateData[]>(`/entertainment/memes/templates${category ? `?category=${category}` : ""}`),
  create: (templateId: string, topText: string, bottomText: string) =>
    fetchWithAuth<{ id: string; renderedText: string; createdAt: string }>("/entertainment/memes/create", {
      method: "POST",
      body: JSON.stringify({ templateId, topText, bottomText }),
    }),
  vote: (memeId: string, voteType: string) =>
    fetchWithAuth<VoteResponse>(`/entertainment/memes/${memeId}/vote`, {
      method: "POST",
      body: JSON.stringify({ voteType }),
    }),
  getGallery: (sort?: string, page?: number) =>
    fetchWithAuth<CreatedMemeData[]>(`/entertainment/memes/gallery?sort=${sort || "hot"}&page=${page || 0}`),
  getMine: () => fetchWithAuth<CreatedMemeData[]>("/entertainment/memes/mine"),
};

