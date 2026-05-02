import { useQuery } from "@tanstack/react-query";
import { sessionTimelineApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

export const useSessionTimeline = (days: number) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.sessionTimeline.byDays(days),
    queryFn: () => sessionTimelineApi.getTimeline(days),
    enabled: !!token && hydrated,
    staleTime: 60_000,
    retry: 2,
  });
};
