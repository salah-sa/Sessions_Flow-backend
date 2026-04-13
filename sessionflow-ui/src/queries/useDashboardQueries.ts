import { useQuery } from "@tanstack/react-query";
import { dashboardApi, timetableApi } from "../api/resources_extra";
import { queryKeys } from "./keys";

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardApi.getSummary(),
  });
};

export const useTimetableEntries = () => {
  return useQuery({
    queryKey: queryKeys.timetable.entries,
    queryFn: () => timetableApi.getEntries(),
  });
};
