import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send, User as UserIcon, Smile, Paperclip, X, MessageSquare, Loader2, Clock, Check, CheckCheck, Lock, ChevronDown, Zap, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Card, Button, Input, EmptyState, Skeleton, Badge } from "../ui";
import { ChatMessage, MessageMention } from "../../types";
import { useAuthStore, useChatStore } from "../../store/stores";
import { useShallow } from "zustand/shallow";
import { useSignalR } from "../../providers/SignalRProvider";
import { toast } from "sonner";
import { AudioPlayer } from "./AudioPlayer";
import { ImageViewer } from "./ImageViewer";
import { format, isToday, isYesterday } from "date-fns";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Group, Student, User as ProjectUser } from "../../types";
import { createMentionEngine, MentionEngine, MentionableMember } from "../../lib/MentionEngine";
import AnimatedChatIcon from "../ui/AnimatedChatIcon";

const BlockMessageRenderer: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { text, blocks, mentions } = message;
  
  if (blocks && blocks.length > 0) {
    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {blocks.map((block, i) => {
          if (block.type === "text") return <React.Fragment key={i}>{block.content}</React.Fragment>;
          if (block.type === "mention") {
            return (
              <span 
                key={i} 
                className="text-ui-accent font-bold bg-ui-accent/10 px-1.5 py-0.5 rounded-md mx-0.5 border border-ui-accent/20 shadow-glow shadow-ui-accent/5 inline-block"
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

  if (text && mentions && mentions.length > 0) {
    const sortedMentions = [...mentions].sort((a, b) => a.indices[0] - b.indices[0]);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMentions.forEach((mention, i) => {
      const [start, end] = mention.indices;
      if (start > lastIndex) elements.push(text.substring(lastIndex, start));
      elements.push(
        <span key={`legacy-${i}`} className="text-ui-accent font-bold bg-ui-accent/10 px-1 rounded mx-0.5 border border-ui-accent/10">
          {text.substring(start, end)}
        </span>
      );
      lastIndex = end;
    });

    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return <div className="whitespace-pre-wrap break-words leading-relaxed">{elements}</div>;
  }

  return <div className="whitespace-pre-wrap break-words leading-relaxed">{text}</div>;
};

const ProfileImage: React.FC<{ url?: string | null; initial?: string; isMe: boolean; }> = ({ url, initial, isMe }) => {
  return (
    <div className={cn(
      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden ring-1 ring-white/10",
      isMe ? "bg-ui-accent/20" : "bg-ui-sidebar-bg"
    )}>
      {url ? (
        <img src={url} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className={cn("text-[10px] font-bold uppercase", isMe ? "text-ui-accent" : "text-slate-500")}>{initial || "U"}</span>
      )}
      <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-ui-bg", isMe ? "bg-ui-accent" : "bg-emerald-500")} />
    </div>
  );
};

export const MessageBubble = React.memo<{ message: ChatMessage; isMe: boolean; showSender?: boolean; }>(({ message, isMe, showSender }) => {
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const profileImageUrl = isMe ? currentUser?.avatarUrl : message.sender?.avatarUrl;
  const profileName = isMe ? currentUser?.name : (message.sender?.name ?? "Unknown");
  const profileRole = isMe ? currentUser?.role : (message.sender?.role ?? "Student");
  const initial = profileName?.charAt(0).toUpperCase() || "?";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col relative mb-4", isMe ? "items-end" : "items-start")}
    >
      {showSender && (
        <div className={cn("flex items-center gap-3 mb-2", isMe ? "flex-row-reverse pe-12" : "ps-12")}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{profileName}</span>
          <span className={cn("text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border", profileRole === "Engineer" ? "bg-ui-accent/10 border-ui-accent/20 text-ui-accent" : "bg-white/[0.02] border-white/10 text-slate-600")}>
            {profileRole}
          </span>
        </div>
      )}

      <div className={cn("flex items-end gap-4 max-w-[85%]", isMe && "flex-row-reverse")}>
        <ProfileImage url={profileImageUrl} initial={initial} isMe={isMe} />

        <div className="flex flex-col gap-2">
          <div className={cn(
            "px-4 py-3 md:px-6 md:py-4 rounded-xl text-[13px] relative shadow-2xl border transition-all duration-300",
            isMe 
              ? "bg-ui-accent text-white font-medium border-transparent shadow-ui-accent/20" 
              : "bg-ui-sidebar-bg/95 text-slate-200 border-white/5 shadow-black/80"
          )}>
            <BlockMessageRenderer message={message} />
            
            {message.fileUrl && (
              <div className="mt-4 space-y-3">
                {message.fileType?.startsWith("image/") && (
                  <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg group/media relative cursor-pointer" onClick={() => setIsViewerOpen(true)}>
                    <img src={message.fileUrl} alt={message.fileName || "Image"} className="max-w-full max-h-[300px] object-cover transition-transform duration-500 group-hover/media:scale-105" />
                    <ImageViewer isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} src={message.fileUrl} alt={message.fileName} />
                  </div>
                )}
                <div className={cn("text-[10px] font-bold bg-black/20 p-3 rounded-lg border border-white/5 flex items-center gap-3", isMe ? "text-white/80" : "text-slate-500")}>
                  <Paperclip className="w-4 h-4 text-ui-accent" />
                  <a href={message.fileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline flex-1 uppercase tracking-widest">{message.fileName || "ATTACHMENT"}</a>
                </div>
              </div>
            )}
          </div>
          
          <div className={cn("flex items-center gap-2 px-1", isMe && "justify-end")}>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest tabular-nums">
              {format(new Date(message.sentAt), "h:mm a")}
            </span>
            {isMe && (
              <div className="flex items-center">
                {message.status === "pending" ? <Clock className="w-2.5 h-2.5 text-slate-600 animate-pulse" /> : message.status === "read" ? <CheckCheck className="w-2.5 h-2.5 text-ui-accent" /> : <Check className="w-2.5 h-2.5 text-slate-600" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export const ChatWindow: React.FC<{ messages: ChatMessage[]; isLoading: boolean; onSendMessage: (text: string, file?: File, mentions?: MessageMention[], blocks?: any[]) => void; activeGroupId: string | null; currentGroup: Group | null; fetchNextPage?: () => void; hasNextPage?: boolean; isFetchingNextPage?: boolean; }> = ({ messages, isLoading, onSendMessage, activeGroupId, currentGroup, fetchNextPage, hasNextPage, isFetchingNextPage }) => {
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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

  const handleEmojiSelect = (emoji: any) => {
    const input = inputRef.current;
    if (!input) return;

    const cursor = input.selectionStart || 0;
    const newText = text.substring(0, cursor) + emoji.native + text.substring(cursor);
    setText(newText);
    
    // Position cursor after the emoji
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
    if (text.trim() || selectedFile) {
      const validatedMentions = activeMentions.filter(m => text.substring(m.indices[0], m.indices[1] + 1).includes(`@${m.name}`));
      onSendMessage(text.trim(), selectedFile || undefined, validatedMentions, MentionEngine.buildBlocks(text.trim(), validatedMentions));
      setText(""); setSelectedFile(null); setActiveMentions([]); setShowMentions(false); setShowEmojiPicker(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-ui-sidebar-bg/40 backdrop-blur-3xl rounded-xl border border-white/5 overflow-hidden shadow-2xl relative">
      <div className="flex-1 min-h-0 relative">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 md:p-8 space-y-2 custom-scrollbar">
          {isLoading && <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-10 h-10 text-ui-accent animate-spin mb-4" /><p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">establishing link...</p></div>}
          {hasNextPage && <div className="flex justify-center py-6"><Button variant="ghost" size="sm" onClick={() => fetchNextPage?.()} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest bg-white/[0.02] border border-white/5 rounded-xl px-8">{isFetchingNextPage ? "Accessing Archive..." : "Load Older Records"}</Button></div>}
          {messages.map((msg, i) => <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === user?.id} showSender={i === 0 || messages[i-1]?.senderId !== msg.senderId} />)}
        </div>
        <AnimatePresence>{showScrollButton && <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => scrollRef.current?.scroll({ top: scrollRef.current.scrollHeight, behavior: "smooth" })} className="absolute bottom-8 right-10 w-12 h-12 rounded-full bg-ui-accent text-white flex items-center justify-center shadow-glow shadow-ui-accent/40 border border-ui-accent/20 hover:scale-110 transition-all"><ChevronDown className="w-6 h-6" /></motion.button>}</AnimatePresence>
      </div>

      <div className="p-3 md:p-6 bg-ui-bg/80 border-t border-white/5 flex flex-col gap-4 relative z-50">
        <TypingIndicator activeGroupId={activeGroupId} />
        
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              ref={emojiPickerRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 right-0 md:left-6 md:right-auto mb-4 z-[60] shadow-2xl rounded-2xl overflow-hidden border border-white/10"
            >
              <Picker 
                data={data} 
                onEmojiSelect={handleEmojiSelect} 
                theme="dark"
                set="native"
                previewPosition="none"
                skinTonePosition="none"
              />
            </motion.div>
          )}

          {showMentions && filteredMembers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-3 md:left-6 right-3 md:right-auto mb-4 w-auto md:w-72 bg-ui-sidebar-bg border border-white/10 rounded-xl shadow-2xl overflow-hidden overflow-y-auto max-h-64 custom-scrollbar">
              <div className="p-3 border-b border-white/5 bg-white/[0.02] text-[9px] font-bold text-slate-500 uppercase tracking-widest">Establish Point-to-Point Mention</div>
              {filteredMembers.map((m, i) => (
                <button key={m.id} onClick={() => insertMention(m)} className={cn("w-full flex items-center gap-4 px-5 py-4 transition-all text-left", i === mentionIndex ? "bg-ui-accent/10 text-ui-accent" : "text-slate-400 hover:bg-white/5")}>
                  <div className="w-8 h-8 rounded-full bg-ui-sidebar-bg border border-white/5 flex items-center justify-center text-[10px] font-bold">{m.name.charAt(0)}</div>
                  <div className="flex flex-col"><span className="text-sm font-bold tracking-tight">{m.name}</span><span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{m.role}</span></div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {selectedFile && <div className="p-3 bg-black/40 border border-white/5 rounded-xl self-start flex gap-4 items-center relative"><img src={selectedFileUrl!} className="w-12 h-12 rounded-lg object-cover" /><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedFile.name}</div><button onClick={() => setSelectedFile(null)} className="p-1 hover:text-rose-500 transition-colors"><X className="w-4 h-4" /></button></div>}

        <div className="flex items-center gap-2 md:gap-3 bg-black/40 rounded-xl border border-white/5 px-3 md:px-4 h-12 md:h-16 shadow-inner transition-all focus-within:border-ui-accent/30">
          <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-slate-500 hover:text-ui-accent"><Smile className="w-5 h-5" /></Button>
          <input 
            ref={inputRef} value={text} onChange={(e) => handleInputChange(e.target.value)} 
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="ENCRYPTED TRANSMISSION..." className="border-none bg-transparent focus:ring-0 h-full flex-1 text-sm font-medium text-white placeholder:text-slate-700 placeholder:uppercase placeholder:font-bold placeholder:tracking-[0.2em] placeholder:text-[10px]" 
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-ui-accent"><Paperclip className="w-5 h-5" /></Button>
          <button onClick={handleSend} disabled={!text.trim() && !selectedFile} className="w-11 h-11 rounded-lg bg-ui-accent text-white flex items-center justify-center shadow-glow shadow-ui-accent/20 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"><Send className="w-4 h-4" /></button>
          <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} className="hidden" />
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
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-6 mb-4 flex items-center gap-3 px-4 py-2 rounded-xl bg-ui-bg/90 text-ui-accent border border-ui-accent/20 shadow-glow shadow-ui-accent/5">
      <div className="flex gap-1.5"><span className="w-1.5 h-1.5 bg-ui-accent rounded-full animate-bounce [animation-delay:-0.3s]" /><span className="w-1.5 h-1.5 bg-ui-accent rounded-full animate-bounce [animation-delay:-0.15s]" /><span className="w-1.5 h-1.5 bg-ui-accent rounded-full animate-bounce" /></div>
      <span className="text-[9px] font-bold uppercase tracking-widest">{typingNames.length === 1 ? `${typingNames[0]} sync in progress` : `${typingNames.length} nodes syncing`}</span>
    </motion.div>
  );
};

