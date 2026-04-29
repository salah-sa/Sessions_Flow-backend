import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send, User as UserIcon, Smile, Paperclip, X, MessageSquare, Loader2, Clock, Check, CheckCheck, Lock, ChevronDown, Zap, Target, Copy, Sparkles, Info, MoreVertical, Eye, Image as ImageIcon, Video, FileText, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getTierBorderClass } from "../../lib/utils";
import { Card, Button, Input, EmptyState, Skeleton, Badge } from "../ui";
import { ChatMessage, MessageMention } from "../../types";
import { useAuthStore, useChatStore } from "../../store/stores";
import { useShallow } from "zustand/shallow";
import { useSignalR } from "../../providers/SignalRProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AudioPlayer } from "./AudioPlayer";
import { ImageViewer } from "./ImageViewer";
import { format, isToday, isYesterday } from "date-fns";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Group, Student, User as ProjectUser } from "../../types";
import { createMentionEngine, MentionEngine, MentionableMember } from "../../lib/MentionEngine";
import { usePresenceStore, PresenceStatus } from "../../store/presenceStore";
import AnimatedChatIcon from "../ui/AnimatedChatIcon";

const BlockMessageRenderer: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { text, blocks, mentions } = message;
  
  if (blocks && blocks.length > 0) {
    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed selection:bg-white/20">
        {blocks.map((block, i) => {
          if (block.type === "text") return <React.Fragment key={i}>{block.content}</React.Fragment>;
          if (block.type === "mention") {
            return (
              <span 
                key={i} 
                className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded-md mx-0.5 border border-white/20 inline-block shadow-sm"
              >
                @{block.name}
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return <div className="whitespace-pre-wrap break-words leading-relaxed selection:bg-white/20">{text}</div>;
};

const ProfileImage: React.FC<{ userId?: string; url?: string | null; initial?: string; isMe: boolean; subscriptionTier?: string; }> = ({ userId, url, initial, isMe, subscriptionTier }) => {
  const status = usePresenceStore((s) => isMe ? "online" : (userId ? s.getPresence(userId).status : "offline"));
  
  return (
    <div className={cn("w-10 h-10 rounded-2xl p-[1.5px] z-10 shrink-0", getTierBorderClass(subscriptionTier))}>
      <div className={cn(
        "w-full h-full rounded-[14px] flex items-center justify-center relative overflow-hidden transition-transform duration-300 hover:scale-105 z-10",
        isMe ? "bg-[#1f1938]" : "bg-[#1c202a]"
      )}>
        {url ? (
          <img src={url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className={cn("text-[11px] font-bold uppercase", isMe ? "text-ui-accent" : "text-slate-500")}>{initial || "U"}</span>
        )}
        
        <div className="absolute bottom-1 end-1">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full border border-ui-bg transition-all duration-500 relative",
            status === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
            status === "away" ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" : 
            "bg-slate-700"
          )}>
            {status === "online" && (
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-emerald-500"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MessageBubble = React.memo<{ message: ChatMessage; isMe: boolean; showSender?: boolean; }>(({ message, isMe, showSender }) => {
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [showReadBy, setShowReadBy] = React.useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const profileImageUrl = isMe ? currentUser?.avatarUrl : message.sender?.avatarUrl;
  const profileName = isMe ? currentUser?.name : (message.sender?.name ?? "Unknown");
  const profileRole = isMe ? currentUser?.role : (message.sender?.role ?? "Student");
  const initial = profileName?.charAt(0).toUpperCase() || "?";

  const isImportant = message.text?.startsWith("//");
  const isEngineerMessage = profileRole === "Engineer";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex flex-col relative mb-6", isMe ? "items-end" : "items-start")}
    >
      {showSender && !isMe && (
        <div className="flex items-center gap-3 mb-2 ps-14">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{profileName}</span>
          <Badge variant="outline" className={cn("text-[8px] font-bold uppercase tracking-widest h-5 px-2", profileRole === "Engineer" ? "border-ui-accent/20 bg-ui-accent/5 text-ui-accent" : "border-white/10 bg-white/5 text-slate-400")}>
            {profileRole}
          </Badge>
        </div>
      )}

      <div className={cn("flex items-end gap-3 max-w-[85%] md:max-w-[70%]", isMe && "flex-row-reverse")}>
        <ProfileImage userId={isMe ? currentUser?.id : message.senderId} url={profileImageUrl} initial={initial} isMe={isMe} subscriptionTier={isMe ? currentUser?.subscriptionTier : message.sender?.subscriptionTier} />

        <div className="flex flex-col gap-1.5 min-w-0">
          <div className={cn(
            "px-4 py-3 rounded-[24px] text-[14px] relative shadow-xl border transition-all duration-300 group/bubble",
            isMe 
              ? "bg-gradient-to-br from-ui-accent to-ui-accent-dark text-white border-white/10 rounded-br-none shadow-ui-accent/10" 
              : "bg-white/[0.03] backdrop-blur-md text-slate-200 border-white/5 rounded-bl-none shadow-black/20",
            isImportant && "border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20",
            !isMe && isEngineerMessage && !isImportant && "border-s-2 border-s-amber-500/50"
          )}>
            {isImportant && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Important Priority</span>
              </div>
            )}

            <button 
              onClick={() => {
                navigator.clipboard.writeText(message.text || "");
                toast.success("Copied to clipboard");
              }}
              className={cn(
                "absolute top-2 opacity-0 group-hover/bubble:opacity-100 transition-all p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:text-ui-accent z-20",
                isMe ? "-left-12" : "-right-12"
              )}
            >
              <Copy className="w-4 h-4" />
            </button>

            <BlockMessageRenderer message={message} />
            
            {message.fileUrl && (
              <div className="mt-4 space-y-3">
                {message.fileType?.startsWith("image/") && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg group/media relative cursor-pointer" onClick={() => setIsViewerOpen(true)}>
                    <img src={message.fileUrl} alt={message.fileName || "Image"} className="max-w-full max-h-[400px] object-cover transition-transform duration-700 group-hover/media:scale-105" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                       <Badge className="bg-black/60 backdrop-blur-md border-white/20">View Frame</Badge>
                    </div>
                    <ImageViewer isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} src={message.fileUrl} alt={message.fileName} />
                  </div>
                )}
                <div className={cn("text-[10px] font-bold bg-black/20 p-3 rounded-xl border border-white/5 flex items-center gap-3 transition-colors hover:bg-black/30", isMe ? "text-white/80" : "text-slate-400")}>
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-ui-accent" />
                  </div>
                  <a href={message.fileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline flex-1 uppercase tracking-[0.1em] break-all">
                    {message.fileName || "ATTACHMENT"}
                  </a>
                </div>
              </div>
            )}
          </div>
          
          <div className={cn("flex items-center gap-2 px-2", isMe && "justify-end")}>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest tabular-nums">
              {format(new Date(message.sentAt), "HH:mm")}
            </span>
            {isMe && (
              <div className="flex items-center gap-2">
                {/* Seen-By Info Button for Engineers */}
                {currentUser?.role === "Engineer" && message.readBy && message.readBy.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowReadBy(!showReadBy)}
                      onMouseEnter={() => setShowReadBy(true)}
                      onMouseLeave={() => setShowReadBy(false)}
                      className="p-1 rounded-md hover:bg-white/10 transition-colors text-slate-500 hover:text-white"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    
                    <AnimatePresence>
                      {showReadBy && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 w-48 bg-ui-sidebar-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl z-[70] overflow-hidden"
                        >
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1 flex justify-between">
                            <span>Seen By</span>
                            <span className="text-ui-accent">{message.readBy.length}</span>
                          </div>
                          <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                            {message.readBy.map((r, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 group/read">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-4 h-4 rounded-md bg-ui-accent/20 flex items-center justify-center text-[8px] font-bold text-ui-accent shrink-0">
                                    {r.userName.charAt(0)}
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-300 truncate tracking-tight">{r.userName}</span>
                                </div>
                                <span className="text-[8px] font-bold text-slate-600 shrink-0">
                                  {format(new Date(r.readAt), "HH:mm")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {message.status === "pending" ? (
                  <Clock className="w-3 h-3 text-slate-600 animate-pulse" />
                ) : (message.readBy && message.readBy.length > 0) || message.status === "read" ? (
                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Check className="w-3 h-3 text-slate-600" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export const ChatWindow: React.FC<{ messages: ChatMessage[]; isLoading: boolean; onSendMessage: (text: string, file?: File, mentions?: MessageMention[], blocks?: any[]) => void; activeGroupId: string | null; currentGroup: Group | null; fetchNextPage?: () => void; hasNextPage?: boolean; isFetchingNextPage?: boolean; usage?: { remaining: number; limit: number; imagesRemaining?: number; videosRemaining?: number; filesRemaining?: number; } | null; }> = ({ messages, isLoading, onSendMessage, activeGroupId, currentGroup, fetchNextPage, hasNextPage, isFetchingNextPage, usage }) => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [activeMentions, setActiveMentions] = useState<MessageMention[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingEvent = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { invoke } = useSignalR();
  const user = useAuthStore((s) => s.user);
  const [localRemaining, setLocalRemaining] = useState<number | null>(usage?.remaining ?? null);
  const [imagesRemaining, setImagesRemaining] = useState<number | null>(usage?.imagesRemaining ?? null);
  const [videosRemaining, setVideosRemaining] = useState<number | null>(usage?.videosRemaining ?? null);
  const [filesRemaining, setFilesRemaining] = useState<number | null>(usage?.filesRemaining ?? null);
  const dailyLimit = usage?.limit ?? null;

  // Sync when parent updates usage
  useEffect(() => { 
    if (usage) {
      setLocalRemaining(usage.remaining);
      setImagesRemaining(usage.imagesRemaining ?? null);
      setVideosRemaining(usage.videosRemaining ?? null);
      setFilesRemaining(usage.filesRemaining ?? null);
    }
  }, [usage]);

  const isLimitReached = localRemaining !== null && localRemaining <= 0;

  const mentionEngine = useMemo(() => {
    const members: MentionableMember[] = [
      ...(currentGroup?.students || []).map(s => ({ id: s.id, name: s.name, role: "Student" as const })),
      ...(currentGroup?.engineerId ? [{ id: currentGroup.engineerId, name: currentGroup.engineerName || "Engineer", role: "Engineer" as const }] : [])
    ];
    return createMentionEngine(members);
  }, [currentGroup]);

  const filteredMembers = useMemo(() => mentionEngine.search(mentionSearch), [mentionEngine, mentionSearch]);

  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setSelectedFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleEmojiSelect = (emoji: any) => {
    const input = inputRef.current;
    if (!input) return;

    const cursor = input.selectionStart || 0;
    const newText = text.substring(0, cursor) + emoji.native + text.substring(cursor);
    setText(newText);
    
    const newCursorPos = cursor + emoji.native.length;
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleInputChange = (val: string) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const match = val.substring(0, cursor).match(/@([\w\s]*)$/);
    if (match && match[1].length < 20) { setShowMentions(true); setMentionSearch(match[1]); setMentionIndex(0); }
    else setShowMentions(false);
    
    if (activeGroupId && Date.now() - lastTypingEvent.current > 2000 && val.length > 0) {
      lastTypingEvent.current = Date.now();
      invoke("SendTyping", activeGroupId).catch(() => {});
    }
    setText(val);
  };

  const insertMention = (member: MentionableMember) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const mentionText = `@${member.name} `;
    const newText = text.substring(0, cursor).replace(/@([\w\s]*)$/, mentionText) + text.substring(cursor);
    setActiveMentions(prev => [...prev, { userId: member.userId || member.id, name: member.name, indices: [cursor - (mentionSearch.length + 1), cursor + mentionText.length - 2], role: member.role }]);
    setText(newText);
    setShowMentions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = () => {
    if ((text.trim() || selectedFile) && !isLimitReached) {
      const validatedMentions = activeMentions.filter(m => text.substring(m.indices[0], m.indices[1] + 1).includes(`@${m.name}`));
      onSendMessage(text.trim(), selectedFile || undefined, validatedMentions, MentionEngine.buildBlocks(text.trim(), validatedMentions));
      setText(""); setSelectedFile(null); setActiveMentions([]); setShowMentions(false); setShowEmojiPicker(false);
      // Optimistic decrement
      if (localRemaining !== null) setLocalRemaining(prev => Math.max(0, (prev ?? 1) - 1));
      if (selectedFile) {
        if (selectedFile.type.startsWith("image/")) setImagesRemaining(prev => Math.max(0, (prev ?? 1) - 1));
        else if (selectedFile.type.startsWith("video/")) setVideosRemaining(prev => Math.max(0, (prev ?? 1) - 1));
        else setFilesRemaining(prev => Math.max(0, (prev ?? 1) - 1));
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-ui-sidebar-bg/60 backdrop-blur-3xl rounded-none md:rounded-3xl border-0 md:border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
      <div className="flex-1 min-h-0 relative">
        <div 
          ref={scrollRef} 
          className="absolute inset-0 overflow-y-auto p-4 md:p-8 flex flex-col-reverse gap-2 custom-scrollbar"
          onScroll={(e) => {
            const target = e.currentTarget;
            setShowScrollButton(target.scrollTop < -100);
          }}
        >
          {messages.map((msg, i) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isMe={msg.senderId === user?.id} 
              showSender={i === messages.length - 1 || messages[i+1]?.senderId !== msg.senderId} 
            />
          ))}
          {hasNextPage && (
            <div className="flex justify-center py-8">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchNextPage?.()} 
                className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-[0.2em] bg-white/5 border-white/10 rounded-2xl px-10 h-10 hover:bg-white/10 transition-all"
              >
                {isFetchingNextPage ? "Decrypting Archives..." : "Load Operational Logs"}
              </Button>
            </div>
          )}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-ui-accent animate-spin mb-4" />
                <div className="absolute inset-0 bg-ui-accent/20 blur-xl rounded-full" />
              </div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] animate-pulse">Establishing Secure Stream...</p>
            </div>
          )}
        </div>
        <AnimatePresence>
          {showScrollButton && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.5, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.5, y: 10 }}
              onClick={() => scrollRef.current?.scroll({ top: 0, behavior: "smooth" })} 
              className="absolute bottom-8 end-8 w-12 h-12 rounded-2xl bg-ui-accent text-white flex items-center justify-center shadow-2xl shadow-ui-accent/40 border border-white/20 hover:scale-110 active:scale-95 transition-all z-20 group"
            >
              <ChevronDown className="w-6 h-6 transition-transform group-hover:translate-y-0.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 md:px-8 py-3 bg-ui-bg/95 border-t border-white/5 flex flex-col gap-4 relative z-50">
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-1">
          {localRemaining !== null && (
             <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest h-6 px-3 bg-white/5", localRemaining <= 3 ? "border-amber-500/30 text-amber-500" : "border-emerald-500/20 text-emerald-500")}>
                <MessageSquare className="w-3 h-3 me-1.5" />
                {localRemaining} Msgs Left
             </Badge>
          )}
          {imagesRemaining !== null && (
             <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest h-6 px-3 bg-white/5", imagesRemaining <= 0 ? "border-rose-500/30 text-rose-500 opacity-50" : "border-blue-500/20 text-blue-400")}>
                <ImageIcon className="w-3 h-3 me-1.5" />
                {imagesRemaining} Images
             </Badge>
          )}
          {videosRemaining !== null && (
             <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest h-6 px-3 bg-white/5", videosRemaining <= 0 ? "border-rose-500/30 text-rose-500 opacity-50" : "border-purple-500/20 text-purple-400")}>
                <Video className="w-3 h-3 me-1.5" />
                {videosRemaining} Videos
             </Badge>
          )}
          {filesRemaining !== null && (
             <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest h-6 px-3 bg-white/5", filesRemaining <= 0 ? "border-rose-500/30 text-rose-500 opacity-50" : "border-slate-500/20 text-slate-400")}>
                <FileText className="w-3 h-3 me-1.5" />
                {filesRemaining} Files
             </Badge>
          )}
        </div>

        <TypingIndicator activeGroupId={activeGroupId} />
        
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              ref={emojiPickerRef}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full start-4 end-4 md:start-8 md:end-auto mb-6 z-[60] shadow-2xl rounded-3xl overflow-hidden border border-white/10"
            >
              <Picker 
                data={data} 
                onEmojiSelect={handleEmojiSelect} 
                theme="dark"
                set="native"
                previewPosition="none"
                skinTonePosition="none"
                width="100%"
              />
            </motion.div>
          )}

          {showMentions && filteredMembers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="absolute bottom-full start-4 end-4 md:start-8 md:end-auto mb-6 w-full md:w-80 bg-ui-sidebar-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[40vh] custom-scrollbar z-[60]"
            >
              <div className="p-4 border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Signal Target</div>
              {filteredMembers.map((m, i) => (
                <button key={m.id} onClick={() => insertMention(m)} className={cn("w-full flex items-center gap-4 px-5 py-4 transition-all text-left group/m", i === mentionIndex ? "bg-ui-accent/10 text-ui-accent" : "text-slate-400 hover:bg-white/5")}>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold transition-transform group-hover/m:scale-110">{m.name.charAt(0)}</div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold tracking-tight text-white">{m.name}</span>
                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{m.role}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {selectedFile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white/5 border border-white/10 rounded-2xl self-start flex gap-4 items-center relative shadow-xl"
          >
            {selectedFile.type.startsWith("image/") ? (
              <img src={selectedFileUrl || ""} className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/10" alt="Preview" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-ui-sidebar-bg flex items-center justify-center border border-white/10">
                <Paperclip className="w-6 h-6 text-ui-accent" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <div className="text-[11px] font-bold text-slate-200 uppercase tracking-widest truncate max-w-[250px]">
                {selectedFile.name}
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button 
              onClick={() => setSelectedFile(null)} 
              className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all ms-4"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Messages Remaining Indicator */}
        {localRemaining !== null && (
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-sm backdrop-blur-md">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isLimitReached ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : 
                localRemaining <= 3 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : 
                "bg-ui-accent shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.6)]"
              )} />
              <span className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                {localRemaining} message{localRemaining !== 1 ? 's' : ''} remaining
              </span>
            </div>
          </div>
        )}

        {/* Upgrade Banner — shown when limit is reached */}
        {isLimitReached && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-rose-500/20 mb-3"
          >
            <Lock className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white uppercase tracking-wide">Daily message limit reached</p>
              <p className="text-[9px] text-slate-400 font-medium">Upgrade to Pro or Ultra for unlimited messages</p>
            </div>
            <button 
              onClick={() => navigate("/pricing")} 
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ui-accent text-white text-[10px] font-bold uppercase tracking-widest hover:bg-ui-accent/80 transition-colors shadow-glow shadow-ui-accent/20"
            >
              Upgrade <ArrowUpRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        <div className="flex items-center gap-3 bg-white/[0.03] rounded-[24px] border border-white/10 px-4 md:px-6 h-16 md:h-20 shadow-2xl transition-all focus-within:border-ui-accent/40 focus-within:bg-white/[0.05]">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            className="text-slate-500 hover:text-ui-accent transition-colors"
          >
            <Smile className="w-6 h-6" />
          </Button>
          
          <input 
            ref={inputRef} 
            value={text} 
            onChange={(e) => handleInputChange(e.target.value)} 
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="ENCRYPTED TRANSMISSION..." 
            className="border-none bg-transparent focus:ring-0 h-full flex-1 text-[15px] font-medium text-white placeholder:text-slate-700 placeholder:uppercase placeholder:font-bold placeholder:tracking-[0.3em] placeholder:text-[10px] min-w-0" 
          />
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()} 
                className="text-slate-500 hover:text-ui-accent transition-colors"
                disabled={isLimitReached}
              >
                <Paperclip className="w-6 h-6" />
              </Button>
              {filesRemaining !== null && (
                <span className={cn(
                  "absolute -top-1 -end-1 min-w-[16px] h-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 pointer-events-none shadow-sm border",
                  filesRemaining === 0 
                    ? "bg-rose-500/20 text-rose-500 border-rose-500/50" 
                    : "bg-slate-800 border-slate-600 text-slate-300"
                )}>
                  {filesRemaining}
                </span>
              )}
            </div>
            
            <motion.button 
              whileHover={{ scale: isLimitReached ? 1 : 1.05 }}
              whileTap={{ scale: isLimitReached ? 1 : 0.95 }}
              onClick={handleSend} 
              disabled={(!text.trim() && !selectedFile) || isLimitReached} 
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all relative",
                isLimitReached 
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed" 
                  : "bg-ui-accent text-white shadow-[0_8px_20px_rgba(var(--ui-accent-rgb),0.3)] disabled:opacity-20 disabled:grayscale"
              )}
              title={isLimitReached ? "Message limit reached" : undefined}
            >
              {isLimitReached ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </motion.button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => { 
              const file = e.target.files?.[0];
              if (file) {
                // Tiered file size limits based on subscription
                const tier = user?.role === "Admin" ? "Ultra" : (user?.subscriptionTier || "Free");
                const limits: Record<string, number> = { Free: 5, Pro: 25, Enterprise: 100, Ultra: 500 };
                const isStudent = user?.role === "Student";
                const maxMB = isStudent ? 100 : (limits[tier] || 5);
                if (file.size > maxMB * 1024 * 1024) {
                  toast?.error?.(`File exceeds ${maxMB}MB limit for ${isStudent ? 'Students' : tier} tier. Upgrade your plan for larger uploads.`);
                  e.target.value = "";
                  return;
                }
                setSelectedFile(file);
              }
            }} 
            className="hidden" 
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/*,video/*"
          />
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC<{ activeGroupId: string | null }> = ({ activeGroupId }) => {
  const typingUsers = useChatStore(useShallow(s => s.typingUsers[activeGroupId || ""] || {}));
  const user = useAuthStore((s) => s.user);
  const typingNames = Object.entries(typingUsers).filter(([userId]) => userId !== user?.id).map(([_, data]) => data.name);
  if (typingNames.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="absolute bottom-full left-8 mb-6 flex items-center gap-4 px-6 py-3 rounded-2xl bg-ui-bg/95 text-ui-accent border border-ui-accent/20 shadow-2xl"
    >
      <div className="flex gap-2">
        <span className="w-2 h-2 bg-ui-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-ui-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-ui-accent rounded-full animate-bounce" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
        {typingNames.length === 1 ? `${typingNames[0]} is typing...` : `${typingNames.join(", ")} are typing...`}
      </span>
    </motion.div>
  );
};

export default ChatWindow;
