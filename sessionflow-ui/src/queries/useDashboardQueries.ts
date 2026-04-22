import { useQuery } from "@tanstack/react-query";
import { dashboardApi, timetableApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { DashboardSummary, Session, TimetableEntry } from "../types";
import { useAuthStore } from "../store/stores";

export const useDashboardSummary = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardApi.getSummary(),
    enabled: !!token && hydrated,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
};

export const useTimetableEntries = () => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.timetable.entries,
    queryFn: () => timetableApi.getEntries(),
    enabled: !!token && hydrated,
    retry: 2,
    staleTime: 60000, // 1 minute
  });
};

