import { useMutation, useQuery } from "@tanstack/react-query";
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

export interface BroadcastHistoryItem {
  id: string;
  version: string;
  notes: string[];
  broadcastedBy: string;
  createdAt: string;
}

export function useBroadcastHistory() {
  return useQuery({
    queryKey: ["system-broadcast-history"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/system/broadcast-update/history");
      return (res as any).data as BroadcastHistoryItem[];
    },
  });
}

export function useLatestBroadcast() {
  return useQuery({
    queryKey: ["latest-broadcast"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/system/broadcast-update/latest");
      return (res as any).data as BroadcastHistoryItem;
    },
    retry: false,
  });
}
