import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, AIPreset } from "../api/newFeatures";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

// ── Presets ───────────────────────────────────────────────────────────────────
export const useAIPresets = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.ai.presets,
    queryFn: aiApi.getPresets,
    enabled: !!token && hydrated,
    staleTime: 5 * 60_000,
  });
};

export const useAIPresetMutations = () => {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (data: { title: string; prompt: string; icon: string; category: string }) =>
      aiApi.savePreset(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ai.presets }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => aiApi.deletePreset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ai.presets }),
  });
  return { save, remove };
};

// ── Usage ─────────────────────────────────────────────────────────────────────
export const useAIUsage = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.ai.usage,
    queryFn: aiApi.getUsage,
    enabled: !!token && hydrated,
    staleTime: 30_000,
  });
};

// ── Logs (Admin) ──────────────────────────────────────────────────────────────
export const useAILogs = (page = 1) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.ai.logs(page),
    queryFn: () => aiApi.getLogs(page),
    enabled: !!token && hydrated,
    staleTime: 60_000,
  });
};

// ── Re-export type for pages ──────────────────────────────────────────────────
export type { AIPreset };
export type { AIHistoryItem } from "../api/newFeatures";

// ── History ───────────────────────────────────────────────────────────────────
export const useAIHistory = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.ai.history,
    queryFn: () => aiApi.getHistory(100),
    enabled: !!token && hydrated,
    staleTime: 30_000,
  });
};
