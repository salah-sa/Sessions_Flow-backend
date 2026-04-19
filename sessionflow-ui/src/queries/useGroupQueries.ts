import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { groupsApi } from "../api/resources";
import { queryKeys } from "./keys";
import { Group, PaginatedResponse, GroupCreateData, GroupUpdateData } from "../types";

export const useGroupQueries = (filters: { search?: string; status?: string; pageSize?: number } = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.groups.infiniteList(filters),
    queryFn: ({ pageParam = 1 }) => 
      groupsApi.getAll({ ...filters, page: pageParam as number, pageSize: filters.pageSize || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<Group>) => 
      lastPage.hasMore ? (lastPage.page || 1) + 1 : undefined,
  });
};

export const useGroup = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.groups.byId(id || ""),
    queryFn: () => groupsApi.getById(id!),
    enabled: !!id,
  });
};

// Compatibility Aliases
export const useGroups = (filters: { search?: string; status?: string; pageSize?: number; page?: number } = {}) => {
  return useQuery({
    queryKey: queryKeys.groups.list(filters),
    queryFn: () => groupsApi.getAll({ ...filters, page: filters.page || 1, pageSize: filters.pageSize || 100 }),
  });
};

export const useInfiniteGroups = (filters: { search?: string; status?: string; pageSize?: number } = {}) => 
  useGroupQueries(filters);

export const useGroupMutations = () => {
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();
  const deleteMutation = useDeleteGroup();
  const enrollStudentMutation = useEnrollStudent();

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    enrollStudentMutation
  };
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GroupCreateData) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GroupUpdateData }) => groupsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(id) });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useEnrollStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) => 
      groupsApi.addStudent(groupId, name),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};
