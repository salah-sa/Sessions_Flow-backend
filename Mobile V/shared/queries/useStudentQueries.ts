import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi, groupsApi } from "../api/resources";
import { queryKeys } from "./keys";
import { Student } from "../types";

export const useInfiniteStudents = (filters: { search?: string; groupId?: string } = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.students.list(filters),
    queryFn: ({ pageParam = 1 }) => 
      studentsApi.getAll({ 
        page: pageParam, 
        pageSize: 20, 
        search: filters.search,
        groupId: filters.groupId
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.students.byId(id),
    queryFn: () => studentsApi.getById(id),
    enabled: !!id,
  });
};

export const useStudentMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) => 
      groupsApi.addStudent(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => 
      studentsApi.update(id, name),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.byId(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => studentsApi.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });

  return {
    createMutation,
    updateStudentMutation,
    deleteStudentMutation,
    bulkDeleteMutation
  };
};
