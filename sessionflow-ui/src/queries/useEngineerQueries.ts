import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/resources";
import { queryKeys } from "./keys";

export const usePendingStudentRequests = () => {
  return useQuery({
    queryKey: ["pending-student-requests"],
    queryFn: () => authApi.getPendingStudentRequests(),
  });
};

export const useEngineerMutations = () => {
  const queryClient = useQueryClient();

  const approveStudentMutation = useMutation({
    mutationFn: (id: string) => authApi.approveStudentRequest(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (err: any) => {
      console.error("[Mutation] Approve student failed:", err.message);
    }
  });

  const denyStudentMutation = useMutation({
    mutationFn: (id: string) => authApi.denyStudentRequest(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (err: any) => {
      console.error("[Mutation] Deny student failed:", err.message);
    }
  });

  return {
    approveStudentMutation,
    denyStudentMutation,
  };
};
