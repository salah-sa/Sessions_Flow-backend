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
import { cn, getTierBorderClass } from "../lib/utils";
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
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

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
      const result = await sendMessageMutation.mutateAsync({ groupId: activeGroupId, message: text, blocks, mentions, file, id: messageId });
      
      // Consume usage data if returned by the API
      if (result?._usage) {
        setDailyRemaining(result._usage.remaining);
        setDailyLimit(result._usage.limit);
      }
    } catch (err: any) {
      const isLimitError = err?.code === "DAILY_LIMIT_REACHED" || err?.status === 429;
      if (isLimitError) {
        setDailyRemaining(0);
        toast.error(`Daily message limit reached (${err?.limit ?? dailyLimit} msgs/day). Upgrade your plan for more.`, { duration: 6000 });
        // Remove pending from UI
        queryClient.setQueryData(queryKeys.chat.messages(activeGroupId), (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: ChatMessage[]) => page.filter(m => m.id !== messageId));
          return { ...old, pages: newPages };
        });
        return;
      }
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
    <div className="h-full flex bg-[var(--ui-bg)] animate-fade-in overflow-hidden relative">
      {/* Decorative Orbs - Hidden on mobile for performance and clarity */}
      <div className="hidden sm:block absolute top-0 right-0 w-[clamp(300px,40vw,600px)] h-[clamp(300px,40vw,600px)] bg-[var(--ui-accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="hidden sm:block absolute bottom-0 left-0 w-[clamp(250px,35vw,500px)] h-[clamp(250px,35vw,500px)] bg-[var(--ui-accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Zenith Sidebar */}
      <div className={cn(
        "fixed inset-y-0 start-0 z-50 w-full md:chat-sidebar-width md:relative border-e border-white/5 flex flex-col h-full bg-[var(--ui-sidebar-bg)] backdrop-blur-3xl transition-all duration-500",
        activeGroupId ? "translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto" : "translate-x-0 opacity-100",
        !isSidebarOpen && "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 space-y-4 xs:p-5 xs:space-y-5 md:p-6 md:space-y-6 flex-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl xs:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                {t("chat.title")}
              </h1>
              <p className="text-[var(--ui-accent)] text-[10px] xs:text-xs font-bold uppercase flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> {connectionMode === "full" ? "Neural Link Active" : "Disconnected"}
              </p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--ui-accent)] shadow-glow" />
          </div>

          <div className="relative group">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[var(--ui-accent)] transition-colors" />
            <input
              placeholder={t("chat.search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 xs:h-12 ps-11 xs:ps-12 rounded-xl border border-white/5 bg-black/40 text-[10px] xs:text-xs font-bold uppercase text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 sm:px-5 sm:pb-10 space-y-1 sm:space-y-2 custom-scrollbar">
          {(loadingActive || loadingArchived) ? (
            [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />)
          ) : (
            <>
              {filteredActive.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase ps-3 py-2">Operational Nodes</p>
                  {filteredActive.map((group) => {
                    const lastMsg = lastMessages[group.id];
                    const unread = unreadCounts[group.id] || 0;
                    const isSelected = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
                          getTierBorderClass(user?.subscriptionTier),
                          isSelected
                            ? "bg-[var(--ui-accent)]/5 shadow-xl shadow-[var(--ui-accent)]/10"
                            : "bg-transparent hover:bg-white/[0.02]"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 xs:w-10 xs:h-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-500 relative z-10",
                          isSelected ? "bg-[var(--ui-accent)] text-white shadow-glow" : "bg-white/[0.03] border border-white/5 text-slate-500"
                        )}>
                          <Hash className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                        </div>
                        <div className="flex-1 text-start min-w-0 relative z-10">
                          <p className="text-[10px] xs:text-[11px] font-bold truncate uppercase text-white">{group.name}</p>
                          <p className={cn("text-[9px] xs:text-xs font-bold truncate uppercase mt-0.5 tracking-wider", isSelected ? "text-[var(--ui-accent)]/70" : "text-slate-600")}>
                            {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : `L${group.level} Matrix`}
                          </p>
                        </div>
                        {unread > 0 && !isSelected && <div className="ms-2 w-4 h-4 xs:w-5 xs:h-5 flex items-center justify-center bg-[var(--ui-accent)] text-white text-[9px] xs:text-xs font-bold rounded-full shadow-glow animate-pulse">{unread}</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {archivedGroups.length > 0 && (
                <div className="space-y-2 pt-6">
                  <p className="text-xs font-bold text-slate-500 uppercase ps-3 py-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Records
                  </p>
                  {archivedGroups.map((group) => {
                    const isSelected = activeGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 rounded-xl transition-all duration-300 relative group opacity-50 hover:opacity-100",
                          isSelected ? "bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/20" : "bg-transparent"
                        )}
                      >
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-600">
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-start min-w-0">
                          <p className="text-[11px] font-bold truncate uppercase text-slate-400">{group.name}</p>
                          <p className="text-xs font-bold truncate uppercase mt-0.5 text-slate-700 tracking-wider">Historical Archive</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 xs:p-4 md:p-6 bg-black/40 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 bg-white/[0.02] p-3 xs:p-4 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[var(--ui-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className={cn("rounded-full", getTierBorderClass(user?.subscriptionTier))}>
                <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-full bg-[var(--ui-sidebar-bg)] flex items-center justify-center text-slate-600 group-hover:text-[var(--ui-accent)] transition-colors overflow-hidden relative z-10">
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 xs:w-5 xs:h-5" />}
                </div>
              </div>
              <div className="absolute -bottom-0.5 -end-0.5">
                <SelfPresenceLED />
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 relative z-10">
              <span className="text-[10px] xs:text-xs font-bold text-white uppercase truncate">{user?.name}</span>
              <span className="text-[9px] xs:text-[10px] font-bold text-slate-600 uppercase truncate">{user?.role} Unit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zenith Chat Area */}
      <div className={cn(
        "flex-1 flex h-full bg-[var(--ui-bg)]/40 relative z-0 transition-all duration-500",
        activeGroupId ? "translate-x-0 opacity-100" : "translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
      )}>
        {currentGroup ? (
          <div className="flex-1 flex flex-col h-full">
            <GroupHeader
              group={currentGroup}
              onToggleMembers={() => setMembersOpen((v) => !v)}
              onToggleMute={() => toggleMute(currentGroup.id)}
              onEditDescription={() => setDescriptionModalOpen(true)}
              onStartCall={() => {
                toast.info("Group calls — coming soon for Pro/Ultra plans!", {
                  description: "This feature is under development.",
                  duration: 4000,
                });
              }}
              canCall={['Pro', 'Ultra', 'Enterprise'].includes(user?.subscriptionTier ?? '')}
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
                  dailyRemaining={dailyRemaining}
                  dailyLimit={dailyLimit}
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-fade-in">
             <div className="relative">
                <div className="absolute inset-0 bg-[var(--ui-accent)]/20 blur-3xl scale-150 animate-pulse" />
                <div className="w-24 h-24 rounded-2xl bg-[var(--ui-sidebar-bg)] border border-[var(--ui-accent)]/30 flex items-center justify-center shadow-2xl relative z-10">
                   <Target className="w-12 h-12 text-[var(--ui-accent)] animate-[spin_4s_linear_infinite]" />
                </div>
             </div>
             <div className="text-center space-y-3 relative z-10">
                <h2 className="text-xl sm:text-2xl font-bold text-white uppercase">Select Frequency</h2>
                <p className="text-xs text-slate-500 font-bold uppercase">Establish direct neural link to begin.</p>
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
      "w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full border border-[#060608] transition-all duration-500 relative",
      isOnline ? "bg-[var(--ui-accent)] shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.6)]" : 
      isAway ? "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]" : 
      "bg-slate-700"
    )}>
      {isOnline && (
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-[var(--ui-accent)]"
        />
      )}
    </div>
  );
};

export default ChatPage;

