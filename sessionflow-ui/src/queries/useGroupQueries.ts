import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { groupsApi } from "../api/resources";
import { queryKeys } from "./keys";
import { Group } from "../types";

export const useGroups = (filters: { search?: string; status?: string; pageSize?: number } = {}) => {
  return useQuery({
    queryKey: queryKeys.groups.list(filters),
    queryFn: () => groupsApi.getAll(filters),
  });
};

export const useInfiniteGroups = (filters: { search?: string; status?: string; pageSize?: number } = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.groups.infiniteList(filters),
    queryFn: ({ pageParam = 1 }) => 
      groupsApi.getAll({ ...filters, page: pageParam, pageSize: filters.pageSize || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => 
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
};

export const useGroup = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.groups.byId(id || ""),
    queryFn: () => groupsApi.getById(id!),
    enabled: !!id,
  });
};

export const useGroupMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => groupsApi.create(data),
    onSuccess: () => {
      // Cascade invalidation to ALL dependent caches
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => groupsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(id) });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const enrollStudentMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) => 
      groupsApi.addStudent(groupId, name),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    enrollStudentMutation
  };
};
