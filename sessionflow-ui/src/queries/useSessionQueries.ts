import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { sessionsApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { Session, PaginatedResponse, AttendanceUpdateRecord } from "../types";

export interface SessionFilters {
  page?: number;
  pageSize?: number;
  groupId?: string;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

export const useSessions = (filters: SessionFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.sessions.list(filters),
    queryFn: () => sessionsApi.getAll(filters),
  });
};

export const useInfiniteSessions = (filters: SessionFilters = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.sessions.list(filters),
    queryFn: ({ pageParam = 1 }) => 
      sessionsApi.getAll({ ...filters, page: pageParam as number, pageSize: filters.pageSize || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<Session>) => 
      lastPage.hasMore ? (lastPage.page || 1) + 1 : undefined,
  });
};

export const useSessionsByGroup = (groupId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.sessions.byGroup(groupId!),
    queryFn: () => sessionsApi.getAll({ groupId }),
    enabled: !!groupId,
  });
};

export const useSession = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.sessions.byId(id || ""),
    queryFn: () => sessionsApi.getById(id!),
    enabled: !!id,
  });
};

export const useSessionAttendance = (id: string | undefined) => {
  return useQuery({
    queryKey: ["sessions", "attendance", id],
    queryFn: () => sessionsApi.getAttendance(id!),
    enabled: !!id,
  });
};

export const useSessionMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => sessionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.start(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.sessions.byId(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const endMutation = useMutation({
    mutationFn: ({ id, notes, force }: { id: string; notes?: string; force?: boolean }) => sessionsApi.end(id, notes, force),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.sessions.byId(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, records }: { id: string; records: AttendanceUpdateRecord[] }) => 
      sessionsApi.updateAttendance(id, records),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", "attendance", id] });
    },
  });

  const skipMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      sessionsApi.skip(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  return {
    createMutation,
    startMutation,
    endMutation,
    updateAttendanceMutation,
    skipMutation,
  };
};
