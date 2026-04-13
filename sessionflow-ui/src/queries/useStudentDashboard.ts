import { useQuery } from "@tanstack/react-query";
import { studentApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

export const useStudentDashboard = () => {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.studentDashboard.data,
    queryFn: () => studentApi.getDashboard(),
    enabled: user?.role === "Student",
    staleTime: 30_000,
    retry: 2,
    // FIX-K: Dev Observability (Non-blocking)
    meta: { 
      errorTag: "[StudentDashboard]",
      onError: (err: any) => {
        console.error("[StudentDashboard]", err);
      }
    },
  });
};
