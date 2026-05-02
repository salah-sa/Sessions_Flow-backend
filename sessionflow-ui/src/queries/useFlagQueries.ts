import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flagsApi, FlagRecord } from "../api/newFeatures";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

// ── List All Flags ────────────────────────────────────────────────────────────
export const useFeatureFlags = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.flags.list,
    queryFn: flagsApi.getAll,
    enabled: !!token && hydrated,
    staleTime: 30_000,
  });
};

// ── CRUD Mutations ────────────────────────────────────────────────────────────
export const useFlagMutations = () => {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: Partial<FlagRecord>) => flagsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.flags.list }),
  });

  const update = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<FlagRecord> }) =>
      flagsApi.update(key, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.flags.list }),
  });

  const remove = useMutation({
    mutationFn: (key: string) => flagsApi.delete(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.flags.list }),
  });

  return { create, update, remove };
};

// ── Re-export type ────────────────────────────────────────────────────────────
export type { FlagRecord };
