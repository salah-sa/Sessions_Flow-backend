import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/newFeatures";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

// ── Overview KPIs ─────────────────────────────────────────────────────────────
export const useAnalyticsOverview = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: analyticsApi.overview,
    enabled: !!token && hydrated,
    staleTime: 60_000,
  });
};

// ── Daily Active Users ────────────────────────────────────────────────────────
export const useAnalyticsDau = (days = 30) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.analytics.dau(days),
    queryFn: () => analyticsApi.dau(days),
    enabled: !!token && hydrated,
    staleTime: 60_000,
  });
};

// ── Feature / Page Usage ──────────────────────────────────────────────────────
export const useAnalyticsFeatureUsage = (days = 30) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.analytics.featureUsage(days),
    queryFn: () => analyticsApi.featureUsage(days),
    enabled: !!token && hydrated,
    staleTime: 60_000,
  });
};

// ── Session Metrics ───────────────────────────────────────────────────────────
export const useAnalyticsSessions = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.analytics.sessions,
    queryFn: analyticsApi.sessions,
    enabled: !!token && hydrated,
    staleTime: 60_000,
  });
};

// ── Role Distribution ─────────────────────────────────────────────────────────
export const useAnalyticsRoles = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  return useQuery({
    queryKey: queryKeys.analytics.roles,
    queryFn: analyticsApi.roles,
    enabled: !!token && hydrated,
    staleTime: 5 * 60_000,
  });
};
