import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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

export const useInfiniteChatMessages = (groupId: string | undefined) => {
  return useInfiniteQuery<ChatMessage[], Error, { pages: ChatMessage[][]; pageParams: (string | undefined)[] }>({
    queryKey: queryKeys.chat.messages(groupId!),
    queryFn: ({ pageParam }) => chatApi.getMessages(groupId!, pageParam as string | undefined, 50),
    initialPageParam: undefined,
    getNextPageParam: (lastPage: ChatMessage[]) => {
      if (!lastPage || lastPage.length < 50) return undefined;
      // Index 0 is newest, index length-1 is oldest in current page
      return lastPage[lastPage.length - 1].sentAt;
    },
    enabled: !!groupId,
    refetchInterval: false,
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
        (old: any) => {
          if (!old) return { pages: [[{ ...newMessage, status: "sent" }]], pageParams: [undefined] };
          
          const newPages = old.pages.map((page: ChatMessage[], index: number) => {
            // Newest messages are in the FIRST page (index 0)
            if (index === 0) {
              const filtered = page.filter(m => m.id !== variables.id);
              const exists = filtered.some(m => m.id === newMessage.id);
              if (exists) {
                return filtered.map(m => m.id === newMessage.id ? { ...m, ...newMessage, status: "sent" } : m);
              }
              return [{ ...newMessage, status: "sent" }, ...filtered];
            }
            return page;
          });

          return { ...old, pages: newPages };
        }
      );
    },
  });
};
