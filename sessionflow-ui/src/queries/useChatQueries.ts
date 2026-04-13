import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { ChatMessage, MessageMention } from "../types";

export const useChatMessages = (groupId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.chat.messages(groupId!),
    queryFn: () => chatApi.getMessages(groupId!),
    enabled: !!groupId,
    refetchInterval: false, // We rely on SignalR for real-time
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      groupId, 
      message, 
      blocks,
      mentions, 
      file,
      id = crypto.randomUUID() 
    }: { 
      groupId: string; 
      message: string; 
      blocks?: any[];
      mentions?: MessageMention[];
      file?: File;
      id?: string;
    }) => 
      file 
        ? chatApi.sendMessageWithFile(groupId, message, file, blocks, mentions, id)
        : chatApi.sendMessage(groupId, message, blocks, mentions, id),
    onSuccess: (newMessage, variables) => {
      queryClient.setQueryData(
        queryKeys.chat.messages(variables.groupId),
        (old: ChatMessage[] | undefined) => {
          if (!old) return [{ ...newMessage, status: "sent" }];
          
          // Remove the optimistic message (which used a client-side UUID).
          // The server generated a new ObjectId for the actual message.
          const filtered = old.filter(m => m.id !== variables.id);
          
          // Deduplicate by the new server ID (Server might have already pushed via SignalR)
          const exists = filtered.some(m => m.id === newMessage.id);
          if (exists) {
            // Update existing (e.g. status transition from pending/sending to sent)
            return filtered.map(m => m.id === newMessage.id ? { ...m, ...newMessage, status: "sent" } : m);
          }
          
          return [...filtered, { ...newMessage, status: "sent" }];
        }
      );
    },
  });
};
