import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";

export const useServerHealth = () => {
  return useQuery({
    queryKey: ["system", "health"],
    queryFn: () => fetchWithAuth<{ status: string; version: string; minMobileVersion?: string }>("/health"),
    refetchInterval: 30000, // Check health every 30s for version gate
  });
};
