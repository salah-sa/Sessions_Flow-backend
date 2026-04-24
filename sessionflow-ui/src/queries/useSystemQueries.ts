import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";

export interface BroadcastUpdatePayload {
  notes: string[];
  forceRefresh: boolean;
  version?: string;
}

export function useBroadcastUpdate() {
  return useMutation({
    mutationFn: async (payload: BroadcastUpdatePayload) => {
      const res = await fetchWithAuth("/system/broadcast-update", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res;
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
      const res = await fetchWithAuth("/system/broadcast-update/history");
      return res as BroadcastHistoryItem[];
    },
  });
}

export function useLatestBroadcast() {
  return useQuery({
    queryKey: ["latest-broadcast"],
    queryFn: async () => {
      try {
        const res = await fetchWithAuth("/system/broadcast-update/latest");
        return res as BroadcastHistoryItem;
      } catch (error: any) {
        // If no broadcast exists (404), return null instead of throwing
        if (error.message?.includes("404")) return null;
        throw error;
      }
    },
    retry: false,
  });
}
