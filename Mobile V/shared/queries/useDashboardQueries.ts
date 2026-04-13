import { useQuery } from "@tanstack/react-query";
import { dashboardApi, timetableApi } from "../api/resources";
import { queryKeys } from "./keys";

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardApi.getSummary(),
    refetchInterval: 60 * 1000, // 1 minute
  });
};

export const useTimetableEntries = () => {
  return useQuery({
    queryKey: queryKeys.timetable.entries,
    queryFn: () => timetableApi.getEntries(),
  });
};
