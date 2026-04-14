import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send, User as UserIcon, Smile, Paperclip, X, MessageSquare, Loader2, Clock, Check, CheckCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Card, Button, Input, EmptyState, Skeleton, Badge } from "../ui";
import { ChatMessage, MessageMention } from "../../types";
import { useAuthStore } from "../../store/stores";
import { toast } from "sonner";
import { AudioPlayer } from "./AudioPlayer";
import { ImageViewer } from "./ImageViewer";
import { format, isToday, isYesterday } from "date-fns";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Group, Student, User as ProjectUser } from "../../types";
import { createMentionEngine, MentionEngine, MentionableMember } from "../../lib/MentionEngine";
import AnimatedChatIcon from "../ui/AnimatedChatIcon";

// ═══════════════════════════════════════════════
// Block-based Message Renderer (Token System)
// ═══════════════════════════════════════════════

const BlockMessageRenderer: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { text, blocks, mentions } = message;
  
  // 1. Prioritize Token-based Blocks (Modern 2025 standard)
  if (blocks && blocks.length > 0) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {blocks.map((block, i) => {
          if (block.type === "text") {
            return <React.Fragment key={i}>{block.content}</React.Fragment>;
          }
          if (block.type === "mention") {
            return (
              <span 
                key={i} 
                className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md mx-0.5 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] inline-block transition-transform hover:scale-105"
                title={`${block.role}: ${block.name}`}
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

  // 2. Fallback: Legacy Structured Mentions (indices-based)
  if (text && mentions && mentions.length > 0) {
    const sortedMentions = [...mentions].sort((a, b) => a.indices[0] - b.indices[0]);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMentions.forEach((mention, i) => {
      const [start, end] = mention.indices;
      if (start > lastIndex) elements.push(text.substring(lastIndex, start));
      elements.push(
        <span key={`legacy-${i}`} className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded mx-0.5 border border-emerald-500/20">
          {text.substring(start, end)}
        </span>
      );
      lastIndex = end;
    });

    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return <div className="whitespace-pre-wrap break-words">{elements}</div>;
  }

  // 3. Fallback: Raw Text
  return <div className="whitespace-pre-wrap break-words">{text}</div>;
};

// MessageBubble
interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  showSender?: boolean;
}

const formatMessageTime = (date: string | Date) => {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
};

// ═══════════════════════════════════════════════
// Creative Profile Image Component
// ═══════════════════════════════════════════════
const ProfileImage: React.FC<{ 
  url?: string | null; 
  initial?: string; 
  isMe: boolean;
}> = ({ url, initial, isMe }) => {
  return (
    <div className={cn(
      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-transform duration-300 hover:scale-105 overflow-hidden",
      isMe 
        ? "bg-gradient-to-br from-blue-500 to-brand-500 p-[1.5px]" 
        : "bg-gradient-to-br from-emerald-500 to-cyan-500 p-[1.5px]"
    )}>
      <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {url ? (
          <img src={url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className={cn(
            "text-[12px] font-black uppercase tracking-tighter",
            isMe ? "text-blue-300" : "text-emerald-300"
          )}>
            {initial || "U"}
          </span>
        )}
      </div>
      {/* Active status ring */}
      <div className={cn(
        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 shadow-sm",
        isMe ? "bg-blue-500" : "bg-emerald-500"
      )} />
    </div>
  );
};

export const MessageBubble = React.memo<MessageBubbleProps>(({ message, isMe, showSender }) => {
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const { user: currentUser } = useAuthStore();

  // FIX-5: Use enriched sender object from API for other users' avatars
  // Self-messages use current user data (always fresh from Zustand)
  // Other users' messages use the sender object returned by the API
  const profileImageUrl = isMe
    ? currentUser?.avatarUrl
    : (message.sender?.avatarUrl ?? "/default-avatar.png");
  const profileName = isMe
    ? currentUser?.name
    : (message.sender?.name ?? "Unknown");
  const profileRole = isMe
    ? currentUser?.role
    : (message.sender?.role ?? "Student");
  const initial = profileName?.charAt(0).toUpperCase();

  const isEngineer = profileRole === "Engineer";
  const isAdmin = profileRole === "Admin";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex flex-col group relative mb-3", isMe ? "items-end" : "items-start")}
    >
      {/* Sender Header */}
      {showSender && (
        <div className={cn(
          "flex items-center gap-2 mb-1 px-1",
          isMe ? "flex-row-reverse pe-12" : "ps-12"
        )}>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            isMe ? "text-blue-400/80" : (isEngineer ? "text-amber-400" : "text-slate-400")
          )}>
            {profileName}
          </span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[7px] h-4 px-1.5 font-black uppercase tracking-[0.2em] border-none",
              isEngineer ? "bg-amber-500/10 text-amber-500" : (isAdmin ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-500")
            )}
          >
            {profileRole}
          </Badge>
        </div>
      )}

      <div className={cn("flex items-end gap-3 max-w-[85%]", isMe && "flex-row-reverse")}>
        {/* Profile Image */}
        <ProfileImage url={profileImageUrl} initial={initial} isMe={isMe} />

        <div className="flex flex-col gap-1.5">
          <div className={cn(
            "px-5 py-3.5 rounded-3xl text-[14px] leading-relaxed relative transition-all duration-300 overflow-hidden",
            isMe 
              ? "bg-blue-600 text-white font-medium rounded-tr-none shadow-[0_4px_16px_rgba(59,130,246,0.3)]" 
              : cn(
                  "bg-[#1A1A1A] text-slate-200 border border-white/[0.05] rounded-tl-none shadow-xl",
                  isEngineer && "border-amber-500/20 bg-amber-500/[0.03] text-amber-50/90"
                )
          )}>
            <div className={cn(
              "absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent pointer-events-none",
              isMe && "via-white/[0.1]",
              !isMe && isEngineer && "via-amber-500/[0.05]"
            )} />
            
            <div className="relative z-10">
              <BlockMessageRenderer message={message} />
              
              {message.fileUrl && (
                <div className="mt-3 space-y-2">
                  {message.fileType?.startsWith("image/") && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg group/media relative">
                      <img 
                        src={message.fileUrl} 
                        alt={message.fileName || "Image"} 
                        className="max-w-full max-h-[300px] object-cover transition-transform duration-500 group-hover/media:scale-105 cursor-pointer"
                        onClick={() => setIsViewerOpen(true)}
                      />
                      <ImageViewer 
                        isOpen={isViewerOpen} 
                        onClose={() => setIsViewerOpen(false)} 
                        src={message.fileUrl} 
                        alt={message.fileName} 
                      />
                    </div>
                  )}
                  {message.fileType?.startsWith("video/") && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                      <video src={message.fileUrl} controls className="w-full max-h-[300px] object-contain" />
                    </div>
                  )}
                  {message.fileType?.startsWith("audio/") && <AudioPlayer src={message.fileUrl} />}
                  <div className={cn("text-[11px] font-bold bg-black/20 p-2.5 rounded-xl border border-white/5 flex items-center gap-3 transition-colors hover:bg-black/30", isMe ? "text-slate-100" : "text-slate-400")}>
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    <a href={message.fileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline flex-1 uppercase tracking-tighter">{message.fileName || "View Attachment"}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className={cn("flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity", isMe && "justify-end")}>
            <span className="text-[9px] font-bold text-slate-600 uppercase tabular-nums">
              {formatMessageTime(message.sentAt)}
            </span>
            {isMe && (
              <div className="flex items-center">
                {message.status === "pending" ? (
                  <Clock className="w-2.5 h-2.5 text-slate-700" />
                ) : message.status === "read" ? (
                  <CheckCheck className="w-2.5 h-2.5 text-blue-400" />
                ) : (
                  <Check className="w-2.5 h-2.5 text-slate-600" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ChatWindow
interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, file?: File, mentions?: MessageMention[], blocks?: any[]) => void;
  isLoading?: boolean;
  group?: Group | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading, group }) => {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // High-performance mention state
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [activeMentions, setActiveMentions] = useState<MessageMention[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const isArchived = group?.status === "Completed" || group?.status === "Archived";

  const engine = useMemo(() => {
    if (!group) return null;
    return createMentionEngine(group.students || [], group.engineer);
  }, [group]);

  const filteredMembers = useMemo(() => {
    if (!engine) return [];
    return engine.search(mentionSearch);
  }, [engine, mentionSearch]);

  useEffect(() => {
    if (showMentions && filteredMembers.length === 0) {
      setShowMentions(false);
    }
  }, [filteredMembers, showMentions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setSelectedFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setSelectedFileUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (val: string) => {
    
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = val.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([\w\s]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      // Only keep showMentions if we haven't crossed a space or if it's short
      if (query.length < 20) {
        setShowMentions(true);
        setMentionSearch(query);
        setMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
    setText(val);
  };

  const insertMention = (member: MentionableMember) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const textAfterCursor = text.substring(cursorPosition);
    
    const mentionText = `@${member.name} `;
    const newTextBefore = textBeforeCursor.replace(/@([\w\s]*)$/, mentionText);
    const newText = newTextBefore + textAfterCursor;
    
    // Calculate new index
    const startIdx = newTextBefore.length - mentionText.length;
    const endIdx = newTextBefore.length - 1; // excluding the trailing space

    const newMention: MessageMention = {
      userId: member.userId || member.id,
      name: member.name,
      indices: [startIdx, endIdx],
      role: member.role
    };

    setActiveMentions(prev => [...prev, newMention]);
    setText(newText);
    setShowMentions(false);
    
    // Refocus and place cursor after the space
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = newTextBefore.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {

    if (showMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredMembers[mentionIndex]) {
          insertMention(filteredMembers[mentionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (text.trim() || selectedFile) {
      // Validate current mentions still align with text ranges
      const validatedMentions = activeMentions.filter(m => {
        const sliced = text.substring(m.indices[0], m.indices[1]);
        return sliced === `@${m.name}`;
      });

      // BUILD TOKENIZED BLOCKS (O(N) conversion)
      const blocks = MentionEngine.buildBlocks(text.trim(), validatedMentions);

      onSendMessage(text.trim(), selectedFile || undefined, validatedMentions, blocks);
      setText("");
      setSelectedFile(null);
      setActiveMentions([]);
      setShowMentions(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/40 backdrop-blur-3xl rounded-[2rem] border border-white/5 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
      <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]); }} className="hidden" />

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-1 custom-scrollbar">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-4 p-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-slate-800/50 rounded-[2rem]" />)}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState 
            icon={() => <AnimatedChatIcon size={48} state="idle" />} 
            title="ENCRYPTED CHANNEL" 
            description="Direct link established. You can now start communicating." 
          />
        ) : (
          messages.map((msg, i) => {
            const prevMsg = messages[i-1];
            const showSender = i === 0 || prevMsg.senderId !== msg.senderId;
            return <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === user?.id} showSender={showSender} />;
          })
        )}
      </div>

      <div className="p-4 bg-slate-950/50 border-t border-slate-800 backdrop-blur-xl flex flex-col gap-2 shrink-0 relative">
        {/* Mentions Suggestions */}
        <AnimatePresence>
          {showMentions && filteredMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-4 mb-2 w-72 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
            >
              <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ps-2">Mention Member</span>
                <Badge variant="outline" className="text-[8px] opacity-50">{filteredMembers.length}</Badge>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {filteredMembers.map((member, i) => (
                  <button
                    key={member.id}
                    onClick={() => insertMention(member)}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                      i === mentionIndex ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0",
                      member.role === "Engineer" ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
                    )}>
                      {member.avatarUrl ? (
                         <img src={member.avatarUrl} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate tracking-tight">{member.name}</span>
                      <span className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none mt-0.5">{member.role}</span>
                    </div>
                    {i === mentionIndex && <div className="ms-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isArchived && (
          <div className="flex items-center justify-center gap-3 py-2 bg-amber-500/10 border-b border-white/5 text-amber-500 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Archived Group — Historical Context Enabled</span>
          </div>
        )}

        {selectedFile && selectedFileUrl && (
          <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl relative self-start">
             <button onClick={() => setSelectedFile(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full z-10 shadow-lg"><X className="w-3 h-3" /></button>
             {selectedFile.type.startsWith("image/") ? <img src={selectedFileUrl} alt="prev" className="max-h-[120px] rounded-lg" /> : <div className="text-xs p-2 text-slate-400">{selectedFile.name}</div>}
          </div>
        )}
        <div className="flex items-center gap-2 bg-slate-900 rounded-2xl border border-slate-800 px-3 py-1.5 transition-all">
          <div className="relative" ref={emojiPickerRef}>
            <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-slate-500 hover:text-blue-400"><Smile className="w-5 h-5" /></Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-3 left-0 z-50">
                <Picker data={data} onEmojiSelect={(emoji: any) => setText(prev => prev + emoji.native)} theme="dark" previewPosition="none" />
              </div>
            )}
          </div>
          <Input 
            ref={inputRef}
            value={text} 
            onChange={(e) => handleInputChange(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder="Message..." 
            className="border-none bg-transparent focus:ring-0 px-0 h-10 flex-1" 
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-slate-500"><Paperclip className="w-5 h-5" /></Button>
          <Button onClick={handleSend} disabled={!text.trim() && !selectedFile} className="h-10 w-10 p-0 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
};
