import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/shallow";
import { MessageSquare, Users, Search, Hash, Star, User as UserIcon, Clock, Zap, Target, Activity } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Input, Badge, Skeleton } from "../components/ui";
import { ChatWindow } from "../components/chat/Chat";
import GroupHeader from "../components/chat/GroupHeader";
import MembersPanel from "../components/chat/MembersPanel";
import GroupDescriptionModal from "../components/chat/GroupDescriptionModal";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useGroups, useGroup } from "../queries/useGroupQueries";
import { useInfiniteStudents } from "../queries/useStudentQueries";
import { useInfiniteChatMessages, useSendMessage } from "../queries/useChatQueries";
import { queryKeys } from "../queries/keys";
import { sounds } from "../lib/sounds";
import { useAuthStore, useChatStore, useAppStore } from "../store/stores";
import { useMuteStore } from "../store/muteStore";
import { usePresenceStore } from "../store/presenceStore";
import { useSignalR } from "../providers/SignalRProvider";
import AnimatedChatIcon from "../components/ui/AnimatedChatIcon";
import { cn } from "../lib/utils";
import { Group, ChatMessage, MessageMention, Student, PaginatedResponse } from "../types";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useChatRecovery } from "../hooks/useChatRecovery";
import { useRequiresInternet } from "../hooks/useRequiresInternet";

const ChatPage: React.FC = () => {
  useChatRecovery(); 
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  
  const {
    activeGroupId, setActiveGroup, clearUnread, unreadCounts,
    lastMessages, queueMessage, flushQueue
  } = useChatStore(useShallow((s) => ({
    activeGroupId: s.activeGroupId, setActiveGroup: s.setActiveGroup,
    clearUnread: s.clearUnread, unreadCounts: s.unreadCounts,
    lastMessages: s.lastMessages, setLastMessage: s.setLastMessage,
    queueMessage: s.queueMessage, flushQueue: s.flushQueue,
    incrementUnread: s.incrementUnread,
  })));

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "Student";

  const activeFilters = React.useMemo(() => ({ status: "Active", pageSize: 100 }), []);
  const archivedFilters = React.useMemo(() => ({ status: "Completed", pageSize: 100 }), []);

  const { data: activeGroupsData, isLoading: loadingActive } = useGroups(activeFilters);
  const { data: archivedGroupsData, isLoading: loadingArchived } = useGroups(archivedFilters);

  const activeGroups = React.useMemo(() => activeGroupsData?.items || [], [activeGroupsData?.items]);
  const archivedGroups = React.useMemo(() => archivedGroupsData?.items || [], [archivedGroupsData?.items]);

  const { data: fullSelectedGroup } = useGroup(activeGroupId || "");
  const { data: studentsData } = useInfiniteStudents({ groupId: activeGroupId || undefined });
  
  const studentsInGroup = React.useMemo(() => studentsData?.pages?.flatMap(page => (page as PaginatedResponse<Student>).items) || [], [studentsData]);

  const currentGroup = React.useMemo(() => {
    if (!fullSelectedGroup) return null;
    return {
      ...fullSelectedGroup,
      students: fullSelectedGroup.students?.length ? fullSelectedGroup.students : (studentsInGroup.length > 0 ? studentsInGroup : [])
    };
  }, [fullSelectedGroup, studentsInGroup]);

  const { 
    data: messagesData, 
    isLoading: messagesLoading,
    isInitialLoading: messagesInitialLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteChatMessages(activeGroupId || undefined);

  const messages = React.useMemo(() => {
    if (!messagesData) return [];
    // Keep them newest-first for flex-col-reverse
    const flat = messagesData.pages.flatMap(page => page);
    const seen = new Set();
    return flat.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messagesData]);

  const sendMessageMutation = useSendMessage();
  const { checkConnectivity } = useRequiresInternet();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredActive = React.useMemo(() => 
    activeGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeGroups, searchTerm]
  );

  const mutedGroupIds = useMuteStore((s) => s.mutedGroupIds);
  const toggleMute = useMuteStore((s) => s.toggleMute);
  const isMuted = (gid: string) => mutedGroupIds.includes(gid);

  const { on, invoke } = useSignalR();
  const connectionMode = useAppStore((s) => s.connectionMode);

  useEffect(() => {
    if (!activeGroupId && activeGroups.length > 0) {
      setActiveGroup(activeGroups[0].id);
      clearUnread(activeGroups[0].id);
    }
  }, [activeGroups, activeGroupId, setActiveGroup, clearUnread]);

  useEffect(() => {
    if (!activeGroupId) return;
    clearUnread(activeGroupId);
    invoke("JoinChat", activeGroupId).catch(console.error);
    invoke("MarkMessagesAsRead", activeGroupId).catch(console.error);
  }, [activeGroupId, invoke, clearUnread]);

  const handleSendMessage = async (text: string, file?: File, mentions?: MessageMention[], blocks?: any[]) => {
    if (!activeGroupId || !user) return;
    if (!checkConnectivity()) return;
    sounds.playClick();
    const messageId = crypto.randomUUID();

    const pendingMsg: ChatMessage = {
      id: messageId,
      groupId: activeGroupId,
      senderId: user.id,
      senderName: user.name,
      text: text,
      blocks: blocks,
      mentions: mentions,
      sentAt: new Date().toISOString(),
      status: "pending",
      ...(file && { fileName: file.name, fileType: file.type, fileUrl: URL.createObjectURL(file) })
    };

    queryClient.setQueryData(queryKeys.chat.messages(activeGroupId), (old: any) => {
      if (!old) return { pages: [[pendingMsg]], pageParams: [undefined] };
      const newPages = old.pages.map((page: ChatMessage[], index: number) => index === 0 ? [pendingMsg, ...page] : page);
      return { ...old, pages: newPages };
    });

    try {
      await sendMessageMutation.mutateAsync({ groupId: activeGroupId, message: text, blocks, mentions, file, id: messageId });
    } catch (err: any) {
      const isNetworkError = !navigator.onLine || err?.message?.includes("Network");
      if (isNetworkError) {
        queryClient.setQueryData(queryKeys.chat.messages(activeGroupId), (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: ChatMessage[]) => page.map(m => m.id === messageId ? { ...m, status: "queued" as any } : m));
          return { ...old, pages: newPages };
        });
        queueMessage(pendingMsg);
      } else {
        toast.error(t("chat.error_send"));
        queryClient.setQueryData(queryKeys.chat.messages(activeGroupId), (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: ChatMessage[]) => page.filter(m => m.id !== messageId));
          return { ...old, pages: newPages };
        });
      }
    }
  };

  return (
    <div className="chat-realm h-full flex bg-[var(--chat-bg)] overflow-hidden relative selection:bg-[var(--chat-accent-rose)]/30">
      {/* Ambient Mesh Background */}
      <div className="chat-ambient-mesh" />
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[var(--chat-accent-warm)]/5 blur-[120px] rounded-full pointer-events-none animate-[ambient-breathe_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[var(--chat-accent-rose)]/5 blur-[120px] rounded-full pointer-events-none animate-[ambient-breathe_10s_ease-in-out_infinite_reverse]" />

      {/* Obsidian Sidebar */}
      <div className={cn(
        "fixed inset-y-0 start-0 z-50 w-full md:w-[320px] lg:w-[360px] md:relative flex flex-col h-full chat-sidebar-glass transition-all duration-500",
        activeGroupId ? "translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto" : "translate-x-0 opacity-100",
        !isSidebarOpen && "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 space-y-6 flex-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white font-display tracking-tight">
                {t("chat.title", "Conversations")}
              </h1>
              <p className="text-[var(--chat-accent-warm)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", connectionMode === "full" ? "bg-[var(--chat-accent-warm)]" : "bg-slate-600")} />
                {connectionMode === "full" ? t("chat.connected", "Connected") : t("chat.disconnected", "Reconnecting...")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
               <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[var(--chat-accent-warm)] transition-colors" />
            <input
              placeholder={t("chat.search_placeholder", "Search conversations...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 ps-11 rounded-2xl border border-white/5 bg-white/5 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[var(--chat-accent-warm)]/20 focus:bg-white/[0.08] focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
          {(loadingActive || loadingArchived) ? (
            [1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />)
          ) : (
            <>
              {filteredActive.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ps-3 py-3">Recent Chats</p>
                  {filteredActive.map((group) => {
                    const lastMsg = lastMessages[group.id];
                    const unread = unreadCounts[group.id] || 0;
                    const isSelected = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden border",
                          isSelected
                            ? "bg-white/[0.06] border-white/10 shadow-2xl"
                            : "bg-transparent border-transparent hover:bg-white/[0.03]"
                        )}
                      >
                        {isSelected && <motion.div layoutId="active-pill" className="absolute start-0 w-1 h-6 bg-[var(--chat-accent-warm)] rounded-full" />}
                        
                        <div className={cn(
                          "w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-500 relative z-10 overflow-hidden border",
                          isSelected ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-white/[0.03] border-white/5 text-slate-500"
                        )}>
                           <Hash className="w-5 h-5 opacity-40" />
                        </div>

                        <div className="flex-1 text-start min-w-0 relative z-10">
                          <div className="flex items-center justify-between gap-2">
                             <p className="text-[13px] font-bold truncate text-white font-display">{group.name}</p>
                             {lastMsg && <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatDistanceToNow(new Date(lastMsg.sentAt), { addSuffix: false, locale: i18n.language === 'ar' ? ar : enUS })}</span>}
                          </div>
                          <p className={cn("text-[11px] font-medium truncate mt-0.5", isSelected ? "text-slate-300" : "text-slate-500")}>
                            {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : `${t("chat.no_messages", "No messages yet")}`}
                          </p>
                        </div>

                        {unread > 0 && !isSelected && (
                          <div className="ms-2 px-2 h-5 flex items-center justify-center bg-[var(--chat-accent-gradient)] text-white text-[10px] font-bold rounded-full shadow-lg animate-bounce">
                            {unread}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {archivedGroups.length > 0 && (
                <div className="space-y-1 pt-6">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] ps-3 py-3 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Archived
                  </p>
                  {archivedGroups.map((group) => {
                    const isSelected = activeGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative group opacity-40 hover:opacity-100",
                          isSelected ? "bg-white/[0.06]" : "bg-transparent"
                        )}
                      >
                        <div className="w-10 h-10 shrink-0 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-600">
                           <Hash className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-start min-w-0">
                          <p className="text-[12px] font-bold truncate text-slate-400">{group.name}</p>
                          <p className="text-[10px] font-medium truncate mt-0.5 text-slate-700">Archived Discussion</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5 relative overflow-hidden group transition-all hover:bg-white/[0.06]">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--chat-accent-warm)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 text-slate-400 group-hover:border-[var(--chat-accent-warm)]/30 transition-colors overflow-hidden">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5" />}
              </div>
              <div className="absolute -bottom-0.5 -end-0.5 scale-110">
                <SelfPresenceLED />
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 relative z-10">
              <span className="text-[13px] font-bold text-white truncate font-display">{user?.name}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Obsidian Chat Area */}
      <div className={cn(
        "flex-1 flex h-full relative z-0 transition-all duration-500",
        activeGroupId ? "translate-x-0 opacity-100" : "translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
      )}>
        {currentGroup ? (
          <div className="flex-1 flex flex-col h-full">
            <GroupHeader
              group={currentGroup}
              onToggleMembers={() => setMembersOpen((v) => !v)}
              onToggleMute={() => toggleMute(currentGroup.id)}
              onEditDescription={() => setDescriptionModalOpen(true)}
              isMuted={isMuted(currentGroup.id)}
              membersOpen={membersOpen}
            />

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-h-0 p-0 md:p-2 lg:p-4 relative overflow-hidden flex flex-col">
                <ChatWindow
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={messagesInitialLoading}
                  activeGroupId={activeGroupId}
                  currentGroup={currentGroup}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              </div>

              <MembersPanel
                group={currentGroup}
                isOpen={membersOpen}
                onClose={() => setMembersOpen(false)}
              />
            </div>

            <GroupDescriptionModal
              group={currentGroup}
              isOpen={descriptionModalOpen}
              onClose={() => setDescriptionModalOpen(false)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 animate-fade-in relative">
             <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--chat-accent-warm)]/10 to-[var(--chat-accent-rose)]/10 blur-[100px] scale-[3] animate-pulse" />
                <div className="w-32 h-32 rounded-[40px] bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 backdrop-blur-3xl overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20" />
                   <MessageSquare className="w-16 h-16 text-white/20" />
                </div>
             </div>
             <div className="text-center space-y-4 relative z-10 max-w-sm">
                <h2 className="text-2xl font-bold text-white font-display tracking-tight">{t("chat.empty_title", "Your Conversations")}</h2>
                <p className="text-sm text-slate-500 leading-relaxed">{t("chat.empty_desc", "Select a discussion from the sidebar to view messages and collaborate with your team.")}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SelfPresenceLED: React.FC = () => {
  const selfStatus = usePresenceStore((s) => s.selfStatus);
  const isOnline = selfStatus === "active";
  const isAway = selfStatus === "idle" || selfStatus === "hidden";
  
  return (
    <div className={cn(
      "w-2.5 h-2.5 rounded-full border-2 border-[#0c0e12] transition-all duration-500 relative",
      isOnline ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]" : 
      isAway ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]" : 
      "bg-slate-700"
    )}>
      {isOnline && (
        <motion.div
          animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full bg-emerald-400"
        />
      )}
    </div>
  );
};

export default ChatPage;

