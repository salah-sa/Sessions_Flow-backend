import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/resources_extra";
import { authApi } from "../api/resources";
import { queryKeys } from "./keys";
import { Notification } from "../types";

export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications.recent,
    queryFn: () => notificationsApi.getRecent(),
  });
};

export const usePendingStudentRequests = () => {
  return useQuery({
    queryKey: ["pending-student-requests"],
    queryFn: () => authApi.getPendingStudentRequests(),
  });
};

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const approveStudentMutation = useMutation({
    mutationFn: (id: string) => authApi.approveStudentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
    },
  });

  const denyStudentMutation = useMutation({
    mutationFn: (id: string) => authApi.denyStudentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
    },
  });

  return {
    markAsReadMutation,
    markAllAsReadMutation,
    approveStudentMutation,
    denyStudentMutation,
  };
};
