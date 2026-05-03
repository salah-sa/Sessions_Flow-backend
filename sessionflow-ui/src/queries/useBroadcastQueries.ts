import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastApi } from "../api/resources_extra";
import { sendDirectEmail } from "../api/newFeatures";
import { queryKeys } from "./keys";
import { useAuthStore } from "../store/stores";

export const useBroadcastHistory = (page: number, enabled = true) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: queryKeys.broadcast.history(page),
    queryFn: () => broadcastApi.getHistory(page),
    enabled: !!token && hydrated && enabled,
    staleTime: 30_000,
    retry: 2,
  });
};

export const useSendBroadcast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { subject: string; message: string; channel: string }) =>
      broadcastApi.send(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.broadcast.all });
    },
  });
};

/** Synchronous diagnostic: sends ONE test email and returns the Resend API result. */
export const useTestBroadcastEmail = () =>
  useMutation({
    mutationFn: (to: string) => broadcastApi.testEmail(to),
  });

/** Send a direct email to a single user by userId. */
export const useSendDirectEmail = () =>
  useMutation({
    mutationFn: (payload: { userId: string; subject: string; message: string }) =>
      sendDirectEmail(payload.userId, payload.subject, payload.message),
  });
