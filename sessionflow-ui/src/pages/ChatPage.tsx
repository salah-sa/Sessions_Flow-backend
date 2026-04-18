import React, { useState, useEffect } from "react";
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
import { useSignalR } from "../providers/SignalRProvider";
import AnimatedChatIcon from "../components/ui/AnimatedChatIcon";
import { cn } from "../lib/utils";
import { Group, ChatMessage, MessageMention, Student, PaginatedResponse } from "../types";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useChatRecovery } from "../hooks/useChatRecovery";

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
      students: studentsInGroup.length > 0 ? studentsInGroup : fullSelectedGroup.students || []
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
    const flat = messagesData.pages.slice().reverse().flatMap(page => page.slice().reverse());
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
    <div className="h-full flex bg-[var(--ui-bg)] animate-fade-in overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--ui-accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--ui-accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Zenith Sidebar */}
      <div className={cn(
        "fixed inset-y-0 start-0 z-50 w-full sm:w-[320px] md:relative border-e border-white/5 flex flex-col h-full bg-[var(--ui-sidebar-bg)] backdrop-blur-3xl transition-transform duration-500",
        activeGroupId ? "hidden md:flex" : "flex",
        !isSidebarOpen && "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-8 space-y-8 flex-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                {t("chat.title")}
              </h1>
              <p className="text-[var(--ui-accent)] text-[9px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
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
              className="w-full h-12 ps-12 rounded-xl border border-white/5 bg-black/40 text-[10px] font-bold uppercase tracking-widest text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-2 custom-scrollbar">
          {(loadingActive || loadingArchived) ? (
            [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />)
          ) : (
            <>
              {filteredActive.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ps-3 py-2">Operational Nodes</p>
                  {filteredActive.map((group) => {
                    const lastMsg = lastMessages[group.id];
                    const unread = unreadCounts[group.id] || 0;
                    const isSelected = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden border",
                          isSelected
                            ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/20 shadow-xl shadow-[var(--ui-accent)]/5"
                            : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-500 relative z-10",
                          isSelected ? "bg-[var(--ui-accent)] text-white shadow-glow" : "bg-white/[0.03] border border-white/5 text-slate-500"
                        )}>
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-start min-w-0 relative z-10">
                          <p className="text-[11px] font-bold truncate uppercase tracking-widest text-white">{group.name}</p>
                          <p className={cn("text-[8px] font-bold truncate uppercase mt-0.5 tracking-wider", isSelected ? "text-[var(--ui-accent)]/70" : "text-slate-600")}>
                            {lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : `L${group.level} Matrix`}
                          </p>
                        </div>
                        {unread > 0 && !isSelected && <div className="ms-2 w-5 h-5 flex items-center justify-center bg-[var(--ui-accent)] text-white text-[9px] font-bold rounded-full shadow-glow animate-pulse">{unread}</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {archivedGroups.length > 0 && (
                <div className="space-y-2 pt-6">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ps-3 py-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Records
                  </p>
                  {archivedGroups.map((group) => {
                    const isSelected = activeGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => { setActiveGroup(group.id); clearUnread(group.id); }}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative group opacity-50 hover:opacity-100",
                          isSelected ? "bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/20" : "bg-transparent"
                        )}
                      >
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-600">
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-start min-w-0">
                          <p className="text-[11px] font-bold truncate uppercase tracking-widest text-slate-400">{group.name}</p>
                          <p className="text-[8px] font-bold truncate uppercase mt-0.5 text-slate-700 tracking-wider">Historical Archive</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-black/40 border-t border-white/5">
          <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[var(--ui-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-var(--ui-sidebar-bg) flex items-center justify-center border border-white/5 text-slate-600 group-hover:text-[var(--ui-accent)] transition-colors overflow-hidden">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5" />}
              </div>
              <div className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-[var(--ui-accent)] border border-[#060608] shadow-glow" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 relative z-10">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{user?.name}</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest truncate">{user?.role} Unit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zenith Chat Area */}
      <div className={cn("flex-1 flex h-full bg-[var(--ui-bg)]/40 relative z-0", !activeGroupId && "hidden md:flex")}>
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
              <div className="flex-1 min-h-0 p-8 relative overflow-hidden flex flex-col">
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-fade-in">
             <div className="relative">
                <div className="absolute inset-0 bg-[var(--ui-accent)]/20 blur-3xl scale-150 animate-pulse" />
                <div className="w-24 h-24 rounded-2xl bg-[var(--ui-sidebar-bg)] border border-[var(--ui-accent)]/30 flex items-center justify-center shadow-2xl relative z-10">
                   <Target className="w-12 h-12 text-[var(--ui-accent)] animate-[spin_4s_linear_infinite]" />
                </div>
             </div>
             <div className="text-center space-y-3 relative z-10">
                <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Select Frequency</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Establish direct neural link to begin.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;

