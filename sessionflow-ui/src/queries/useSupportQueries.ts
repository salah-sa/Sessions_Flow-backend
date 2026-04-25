import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";
import { queryKeys } from "./keys";

export interface CreateTicketPayload {
  title: string;
  description: string;
  department: string;
}

export interface UpdateTicketStatusPayload {
  id: string;
  status: string;
}

export function useSupportTickets(pageSize: number = 50) {
  return useQuery({
    queryKey: queryKeys.support.tickets,
    queryFn: async () => {
      const res = await fetchWithAuth(`/support/tickets?pageSize=${pageSize}`);
      return (res as any).data;
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      const res = await fetchWithAuth("/support/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return (res as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: UpdateTicketStatusPayload) => {
      const res = await fetchWithAuth(`/support/tickets/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      return (res as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.tickets });
    },
  });
}
