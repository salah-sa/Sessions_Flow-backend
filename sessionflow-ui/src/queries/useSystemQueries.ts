import { useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";

export interface BroadcastUpdatePayload {
  message: string;
  forceRefresh: boolean;
  version?: string;
}

export function useBroadcastUpdate() {
  return useMutation({
    mutationFn: async (payload: BroadcastUpdatePayload) => {
      const res = await fetchWithAuth("/api/system/broadcast-update", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return (res as any).data;
    },
  });
}
