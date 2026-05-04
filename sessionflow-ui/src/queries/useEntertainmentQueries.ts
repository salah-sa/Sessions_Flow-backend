import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quoteApi, riddleApi, roasterApi, duelApi, beastApi, memeApi } from "../api/entertainmentApi";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

// ═══════════════════════════════════════════════════════════════════════════════
//  QUOTE DOJO
// ═══════════════════════════════════════════════════════════════════════════════

export const useTodayQuote = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.entertainment.quoteToday,
    queryFn: () => quoteApi.getToday(),
    enabled: !!token && hydrated,
    staleTime: 5 * 60_000, // 5 min — quote doesn't change within a day
    retry: 2,
  });
};

export const useQuoteCollection = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.quoteCollection,
    queryFn: () => quoteApi.getCollection(),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useToggleQuoteLike = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => quoteApi.toggleLike(quoteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.quoteToday });
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.quoteCollection });
    },
  });
};

export const usePinQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => quoteApi.pinQuote(quoteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.quoteToday });
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RIDDLE LABYRINTH
// ═══════════════════════════════════════════════════════════════════════════════

export const useTodayRiddle = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.entertainment.riddleToday,
    queryFn: () => riddleApi.getToday(),
    enabled: !!token && hydrated,
    staleTime: 5 * 60_000,
    retry: 2,
  });
};

export const useSubmitRiddleAnswer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ riddleId, answer }: { riddleId: string; answer: string }) =>
      riddleApi.submitAnswer(riddleId, answer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.riddleToday });
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.riddleLeaderboard });
    },
  });
};

export const useRevealRiddleHint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (riddleId: string) => riddleApi.revealHint(riddleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.riddleToday });
    },
  });
};

export const useRiddleLeaderboard = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.riddleLeaderboard,
    queryFn: () => riddleApi.getLeaderboard(),
    enabled: !!token,
    staleTime: 2 * 60_000,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCRASTINATION ROASTER
// ═══════════════════════════════════════════════════════════════════════════════

export const useRoastLines = (category: string = "idle") => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.roastLines(category),
    queryFn: () => roasterApi.getLines(category),
    enabled: !!token,
    staleTime: 10 * 60_000,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BRAIN DUEL ARENA (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

export const useDuelStats = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.duelStats,
    queryFn: () => duelApi.getStats(),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useDuelLeaderboard = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.duelLeaderboard,
    queryFn: () => duelApi.getLeaderboard(),
    enabled: !!token,
    staleTime: 2 * 60_000,
  });
};

export const useDuelHistory = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.duelHistory,
    queryFn: () => duelApi.getHistory(),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useCreateDuel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subject?: string) => duelApi.create(subject),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.duelStats });
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.duelHistory });
    },
  });
};

export const useJoinDuel = () => {
  return useMutation({
    mutationFn: (matchId?: string) => duelApi.join(matchId),
  });
};

export const useSubmitDuel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, answers }: { matchId: string; answers: { questionId: string; selectedIndex: number; responseTimeMs: number }[] }) =>
      duelApi.submit(matchId, answers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.duelStats });
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.duelHistory });
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.duelLeaderboard });
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FOCUS BEAST (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

export const useFocusBeast = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.entertainment.beast,
    queryFn: () => beastApi.get(),
    enabled: !!token && hydrated,
    staleTime: 30_000,
  });
};

export const useFeedBeast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (focusMinutes: number) => beastApi.feed(focusMinutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.entertainment.beast }),
  });
};

export const useDamageBeast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idleMinutes: number) => beastApi.damage(idleMinutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.entertainment.beast }),
  });
};

export const useRenameBeast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => beastApi.rename(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.entertainment.beast }),
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MEME FORGE (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

export const useMemeTemplates = (category?: string) => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.memeTemplates(category),
    queryFn: () => memeApi.getTemplates(category),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
};

export const useMemeGallery = (sort: string = "hot", page: number = 0) => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.memeGallery(sort, page),
    queryFn: () => memeApi.getGallery(sort, page),
    enabled: !!token,
    staleTime: 30_000,
  });
};

export const useMyMemes = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.entertainment.memesMine,
    queryFn: () => memeApi.getMine(),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useCreateMeme = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, topText, bottomText }: { templateId: string; topText: string; bottomText: string }) =>
      memeApi.create(templateId, topText, bottomText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entertainment.memesMine });
      qc.invalidateQueries({ queryKey: ["entertainment", "meme-gallery"] });
    },
  });
};

export const useVoteMeme = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memeId, voteType }: { memeId: string; voteType: string }) =>
      memeApi.vote(memeId, voteType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entertainment", "meme-gallery"] });
    },
  });
};

