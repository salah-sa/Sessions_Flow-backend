import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../lib/axios";

export const useSubscriptionStatus = () => {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data } = await api.get("/api/subscription/status");
      return data;
    }
  });
};

export const useCheckoutMutation = () => {
  return useMutation({
    mutationFn: async (payload: { tier: string, isAnnual: boolean, paymentMethod: string }) => {
      const { data } = await api.post("/api/subscription/checkout", payload);
      return data; // contains { iframeUrl, transactionId }
    }
  });
};
