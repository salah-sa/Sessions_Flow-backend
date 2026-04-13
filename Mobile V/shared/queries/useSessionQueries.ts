import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { sessionsApi } from "../api/resources";
import { queryKeys } from "./keys";
import { AttendanceStatus } from "../types";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Session Queries
 * Phase 13: Operational Data Scaffolding (Re-scaffolded)
 * ═══════════════════════════════════════════════════════════
 */

export const useSessions = (filters: any = {}) => {
  return useQuery({
    queryKey: queryKeys.sessions.list(filters),
    queryFn: () => sessionsApi.getAll(filters),
  });
};

export const useInfiniteSessions = (filters: any = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.sessions.list(filters),
    queryFn: ({ pageParam = 1 }) => 
      sessionsApi.getAll({ ...filters, page: pageParam as number, pageSize: filters.pageSize || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
};

export const useSession = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.sessions.byId(id || ""),
    queryFn: () => sessionsApi.getById(id!),
    staleTime: 1000 * 10,
    enabled: !!id,
  });
};

export const useSessionAttendance = (id: string | undefined) => {
  return useQuery({
    queryKey: ["sessions", "attendance", id],
    queryFn: () => sessionsApi.getAttendance(id!),
    staleTime: 1000 * 10,
    enabled: !!id,
  });
};

export const useSessionMutations = () => {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.start(id),
    onSuccess: (updated: any) => {
      queryClient.setQueryData(queryKeys.sessions.byId(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const endMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => sessionsApi.end(id, notes),
    onSuccess: (updated: any) => {
      queryClient.setQueryData(queryKeys.sessions.byId(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, records }: { id: string; records: { studentId: string, status: AttendanceStatus }[] }) => 
      sessionsApi.updateAttendance(id, records),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "attendance", id] });
    },
  });

  return {
    startMutation,
    endMutation,
    updateAttendanceMutation
  };
};
