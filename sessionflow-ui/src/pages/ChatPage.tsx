import React, { useState, useEffect } from "react";
import { MessageSquare, Users, Search, Hash, Star, User as UserIcon, Clock } from "lucide-react";
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
import { useSignalR } from "../providers/SignalRProvider";
import AnimatedChatIcon from "../components/ui/AnimatedChatIcon";
import { cn } from "../lib/utils";
import { Group, ChatMessage, MessageMention } from "../types";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useChatRecovery } from "../hooks/useChatRecovery";

const ChatPage: React.FC = () => {
  useChatRecovery(); // FIX-3: Auto-recover from auth state corruption
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const {
    activeGroupId, setActiveGroup, clearUnread, unreadCounts,
    lastMessages, setLastMessage, queueMessage, flushQueue, incrementUnread
  } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "Student";

  const activeFilters = React.useMemo(
    () => ({ status: "Active", pageSize: 100 }),
    []
  );
  const archivedFilters = React.useMemo(
    () => ({ status: "Completed", pageSize: 100 }),
    []
  );

  const { data: activeGroupsData, isLoading: loadingActive } = useGroups(activeFilters);
  const { data: archivedGroupsData, isLoading: loadingArchived } = useGroups(archivedFilters);

  const activeGroups = activeGroupsData?.items || [];
  const archivedGroups = archivedGroupsData?.items || [];

  // ── Fetch Full Group Details (Includes Students) ─────
  const { data: fullSelectedGroup } = useGroup(activeGroupId || "");
  const rawGroup = fullSelectedGroup;

  // ── Polyfill Students if Backend Omits Them ─────
  const { data: studentsData } = useInfiniteStudents({ groupId: rawGroup?.id });
  const studentsInGroup = React.useMemo(() => {
    return studentsData?.pages?.flatMap(page => page.items) || [];
  }, [studentsData]);

  const currentGroup = React.useMemo(() => {
    if (!rawGroup) return null;
    return {
      ...rawGroup,
      students: studentsInGroup.length > 0 ? studentsInGroup : rawGroup.students || []
    };
  }, [rawGroup, studentsInGroup]);

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
    // Pages are in descending order (latest page first), and each page is descending.
    // We want a flat array in ASCENDING order for the UI.
    const flat = messagesData.pages
      .slice()
      .reverse()
      .flatMap(page => page.slice().reverse());
    
    // Final dedupe by ID just in case
    const seen = new Set();
    return flat.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messagesData]);
  const sendMessageMutation = useSendMessage();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredActive = React.useMemo(() => 
    activeGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [activeGroups, searchTerm]
  );

  const filteredArchived = React.useMemo(() => 
    archivedGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [archivedGroups, searchTerm]
  );

  // user is already destructured at line 37 for isStudent check
  const toggleMute = useMuteStore((s) => s.toggleMute);
  const mutedGroupIds = useMuteStore((s) => s.mutedGroupIds);
  const isMuted = (gid: string) => mutedGroupIds.includes(gid);

  const { on, invoke } = useSignalR();
  const connectionMode = useAppStore((s) => s.connectionMode);

  const dateLocale = i18n.language === "ar" ? ar : enUS;

  // Auto-select first group on load if none selected OR recover persisted
  useEffect(() => {
    if (!activeGroupId && activeGroups.length > 0) {
      const firstGroup = activeGroups[0];
      setActiveGroup(firstGroup.id);
      clearUnread(firstGroup.id);
    }
  }, [activeGroups, activeGroupId, setActiveGroup, clearUnread]);

  // Handle SignalR Group Subscriptions
  // NOTE: Users are auto-joined to all their chat groups via OnConnectedAsync.
  // We only call JoinChat here as a safety re-join (e.g., after reconnection).
  useEffect(() => {
    if (!activeGroupId) return;

    clearUnread(activeGroupId);
    invoke("JoinChat", activeGroupId).catch(console.error);
    // Mark messages as read when entering this group
    invoke("MarkMessagesAsRead", activeGroupId).catch(console.error);
  }, [activeGroupId, invoke, clearUnread]);

  const handleSendMessage = async (text: string, file?: File, mentions?: MessageMention[], blocks?: any[]) => {
    if (!activeGroupId || !user) return;
    sounds.playClick();

    const messageId = crypto.randomUUID();

    // Optimistic cache update
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
      ...(file && {
        fileName: file.name,
        fileType: file.type,
        fileUrl: URL.createObjectURL(file), // Generate local preview URL
      })
    };

    queryClient.setQueryData(
      queryKeys.chat.messages(activeGroupId),
      (old: any) => {
        if (!old) return { pages: [[pendingMsg]], pageParams: [undefined] };
        const newPages = old.pages.map((page: ChatMessage[], index: number) =>
          index === 0 ? [pendingMsg, ...page] : page
        );
        return { ...old, pages: newPages };
      }
    );

    try {
      await sendMessageMutation.mutateAsync({
        groupId: activeGroupId,
        message: text,
        blocks,
        mentions,
        file,
        id: messageId
      });
    } catch (err: any) {
      // ── Offline-Safe: Queue instead of discard ──────────
      const isNetworkError = !navigator.onLine || err?.message?.includes("Network") || err?.code === "ERR_NETWORK";
      if (isNetworkError) {
        // Keep message in cache as "queued", store in offline queue
        queryClient.setQueryData(
          queryKeys.chat.messages(activeGroupId),
          (old: any) => {
            if (!old) return old;
            const newPages = old.pages.map((page: ChatMessage[]) =>
              page.map(m => m.id === messageId ? { ...m, status: "queued" as any } : m)
            );
            return { ...old, pages: newPages };
          }
        );
        queueMessage(pendingMsg);
        toast.info(t("chat.message_queued", "Message queued — will send when reconnected"));
      } else {
        toast.error(t("chat.error_send"));
        queryClient.setQueryData(
          queryKeys.chat.messages(activeGroupId),
          (old: any) => {
            if (!old) return old;
            const newPages = old.pages.map((page: ChatMessage[]) =>
              page.filter(m => m.id !== messageId)
            );
            return { ...old, pages: newPages };
          }
        );
      }
    }
  };

  // ── Offline Queue Flush on Reconnect ─────────────────
  useEffect(() => {
    if (connectionMode !== "full") return;
    const queued = flushQueue();
    if (queued.length === 0) return;

    // Replay each queued message
    queued.forEach(async (msg) => {
      try {
        await sendMessageMutation.mutateAsync({
          groupId: msg.groupId,
          message: msg.text,
          blocks: msg.blocks,
          mentions: msg.mentions,
          id: msg.id,
        });
        // Update status in cache from "queued" to "sent"
        queryClient.setQueryData(
          queryKeys.chat.messages(msg.groupId),
          (old: any) => {
            if (!old) return old;
            const newPages = old.pages.map((page: ChatMessage[]) =>
              page.map(m => m.id === msg.id ? { ...m, status: "sent" } : m)
            );
            return { ...old, pages: newPages };
          }
        );
      } catch {
        // Re-queue if still failing
        queueMessage(msg);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionMode]);

  return (
    <div className="h-full flex bg-[#020617] animate-fade-in overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent)] pointer-events-none" />

      {/* Sidebar Channels */}
      <div className={cn(
        "fixed inset-y-0 start-0 z-50 w-[320px] sm:relative sm:w-[340px] border-e border-white/5 flex flex-col h-full bg-slate-900/40 backdrop-blur-3xl transition-transform duration-500",
        !isSidebarOpen && "-translate-x-full sm:translate-x-0"
      )}>
        <div className="p-8 space-y-8 flex-none">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-sora font-black text-white tracking-widest uppercase flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shadow-glow">
                <AnimatedChatIcon size={16} state="active" />
              </div>
              {t("chat.title")}
            </h1>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow" />
          </div>

          <div className="relative group">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-brand-500" />
            <Input
              placeholder={t("chat.search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-12 h-12 rounded-2xl border-white/5 bg-slate-950/60 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-500/20 transition-all border-glow"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-3 custom-scrollbar">
          {(loadingActive || loadingArchived) ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl mb-2 bg-slate-900/50" />)
          ) : (
            <>
              {filteredActive.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-4 py-2">Active Channels</p>
                  {filteredActive.map((group) => {
                    const lastMsg = lastMessages[group.id];
                    const unread = unreadCounts[group.id] || 0;
                    const isSelected = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all duration-300 relative group overflow-hidden",
                          isSelected
                            ? "bg-slate-800/80 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transform scale-[1.02]"
                            : "bg-slate-950/40 border border-transparent hover:bg-slate-900/60 hover:border-white/5 hover:scale-[1.01]"
                        )}
                      >
                        {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent pointer-events-none" />}
                        <div className={cn(
                          "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-500 relative z-10",
                          isSelected ? "bg-brand-500 text-black shadow-glow" : "bg-slate-900 border border-white/5 text-slate-500"
                        )}>
                          <Hash className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-start min-w-0 relative z-10">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-black truncate uppercase tracking-[0.2em]">{group.name}</span>
                          </div>
                          <p className={cn("text-[10px] font-bold truncate uppercase mt-1", isSelected ? "text-slate-300" : "text-slate-600")}>
                            {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : `Level ${group.level}`}
                          </p>
                        </div>
                        {unread > 0 && !isSelected && <div className="absolute end-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-brand-500 text-black text-[10px] font-black rounded-full shadow-glow animate-pulse z-10">{unread}</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredArchived.length > 0 && (
                <div className="space-y-3 pt-6">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-4 py-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Archive
                  </p>
                  {filteredArchived.map((group) => {
                    const isSelected = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all duration-300 relative group overflow-hidden opacity-60 hover:opacity-100",
                          isSelected ? "bg-slate-800/80 border border-white/10" : "bg-slate-950/20 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xs",
                          isSelected ? "bg-amber-500/20 text-amber-500" : "bg-slate-900/50 text-slate-700"
                        )}>
                          <Hash className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-start min-w-0">
                          <span className="text-[12px] font-black truncate uppercase tracking-[0.2em]">{group.name}</span>
                          <p className="text-[10px] font-bold truncate uppercase mt-1 text-slate-700">Historical History</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-slate-950/80 border-t border-white/5">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-600 group-hover:text-emerald-400 transition-colors overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 relative z-10">
              <span className="text-[10px] font-extrabold text-white uppercase tracking-widest truncate">{user?.name}</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest truncate">{user?.role} {t("chat.node_suffix")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex h-full bg-slate-950/20 relative z-0">
        {currentGroup ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Social Group Header */}
            <GroupHeader
              group={currentGroup}
              onToggleMembers={() => setMembersOpen((v) => !v)}
              onToggleMute={() => toggleMute(currentGroup.id)}
              onEditDescription={() => setDescriptionModalOpen(true)}
              isMuted={isMuted(currentGroup.id)}
              membersOpen={membersOpen}
            />

            {/* Chat Window + Members Panel */}
            <div className="flex-1 flex min-h-0">
              {/* Chat Area */}
              <div className="flex-1 min-h-0 p-4 relative overflow-hidden flex flex-col">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[150px] pointer-events-none" />
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

              {/* Members Panel (slide-in) */}
              <MembersPanel
                group={currentGroup}
                isOpen={membersOpen}
                onClose={() => setMembersOpen(false)}
              />
            </div>

            {/* Description Editor Modal */}
            <GroupDescriptionModal
              group={currentGroup}
              isOpen={descriptionModalOpen}
              onClose={() => setDescriptionModalOpen(false)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-pulse grayscale opacity-40">
            <div className="w-24 h-24 rounded-[2rem] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-2xl">
              <AnimatedChatIcon size={48} state="idle" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-sora font-extrabold text-white tracking-[0.3em] uppercase">{t("chat.empty_title")}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t("chat.empty_subtitle")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
