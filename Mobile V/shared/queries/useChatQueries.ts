import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/resources";
import { queryKeys } from "./keys";
import { ChatMessage, MessageMention } from "../types";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Chat Queries
 * Phase 13: Communication Layer Scaffolding (Re-scaffolded)
 * ═══════════════════════════════════════════════════════════
 */

export const useChatMessages = (groupId?: string) => {
  return useQuery({
    queryKey: queryKeys.chat.messages(groupId!),
    queryFn: () => chatApi.getMessages(groupId!),
    enabled: !!groupId,
    refetchInterval: 30000, // Fallback polling
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      groupId, 
      message, 
      mentions, 
      id 
    }: { 
      groupId: string; 
      message: string; 
      mentions?: MessageMention[]; 
      id: string;
    }) => chatApi.sendMessage(groupId, message, undefined, mentions, id),
    
    // Note: Mobile uses optimistic updates in the screen component
    onSuccess: (serverMsg, { groupId, id }) => {
      // Immediately mark optimistic entry as "sent" so the clock icon disappears
      queryClient.setQueryData(
        queryKeys.chat.messages(groupId),
        (old: any[] | undefined) =>
          (old || []).map((m: any) =>
            m.id === id ? { ...m, ...serverMsg, status: serverMsg?.status || "sent" } : m
          )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(groupId) });
    },
  });
};

export const useSendFileMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      groupId, 
      text, 
      fileUri, 
      fileName, 
      fileType,
      id 
    }: { 
      groupId: string; 
      text: string; 
      fileUri: string;
      fileName: string;
      fileType: string;
      id?: string;
    }) => chatApi.sendMessageWithFile(groupId, text, fileUri, fileName, fileType, undefined, undefined, id),
    
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(groupId) });
    },
  });
};
