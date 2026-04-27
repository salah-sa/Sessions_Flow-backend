import React, { useState, useEffect, useRef, useMemo } from "react";
import { Send, User as UserIcon, Smile, Paperclip, X, MessageSquare, Loader2, Clock, Check, CheckCheck, Lock, ChevronDown, Zap, Target, Copy, Sparkles } from "lucide-react";
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
import { sounds } from "../../lib/sounds";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Group, Student, User as ProjectUser } from "../../types";
import { createMentionEngine, MentionEngine, MentionableMember } from "../../lib/MentionEngine";
import { usePresenceStore, PresenceStatus } from "../../store/presenceStore";
import AnimatedChatIcon from "../ui/AnimatedChatIcon";
import { useChatUsage } from "../../queries/useChatQueries";

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple regex-based syntax highlighter
  const highlightCode = (code: string) => {
    // 1. Strict HTML Escaping to neutralize any malicious injection
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // 2. Safe Tokenization and Highlighting
    // We only wrap specific tokens in pre-defined spans. 
    // This is safer than dangerouslySetInnerHTML with raw content.
    return escaped
      .replace(/\b(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g, '<span class="text-[#c678dd]">$1</span>') // Keywords
      .replace(/\b(console|window|document|Math|JSON|Object|Array|String|Number|Boolean|Promise)\b/g, '<span class="text-[#e5c07b]">$1</span>') // Built-ins
      .replace(/(&quot;[^&]*&quot;|&#039;[^&]*&#039;|`[^`]*`)/g, '<span class="text-[#98c379]">$1</span>') // Strings
      .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="text-[#5c6370] italic">$1</span>') // Comments
      .replace(/\b(\d+)\b/g, '<span class="text-[#d19a66]">$1</span>'); // Numbers
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-black/40 group/code">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{language || "Code"}</span>
        <button 
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-2"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[9px] font-bold uppercase tracking-wider">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed selection:bg-white/20 custom-scrollbar">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
      </pre>
    </div>
  );
};

const BlockMessageRenderer: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { text, blocks } = message;
  
  const renderContent = (content: string) => {
    // 1. Detect Triple Backtick Code Blocks (Multi-block support)
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
      }
      
      // Add the code block
      parts.push(<CodeBlock key={`code-${match.index}`} code={match[2]} language={match[1]} />);
      
      lastIndex = codeBlockRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      
      // 2. Heuristic for non-backticked code (whole message detection)
      const isLikelyCode = 
        (remaining.includes("{") && remaining.includes("}") && (remaining.includes("=>") || remaining.includes("function") || remaining.includes("public") || remaining.includes("void") || remaining.includes("class "))) ||
        (remaining.includes("def ") && remaining.includes(":") && remaining.includes("\n    ")) || // Python
        (remaining.startsWith("using ") && remaining.includes(";") && remaining.includes("namespace ")) || // C#
        (remaining.startsWith("import ") && remaining.includes(";") && remaining.includes("public class ")); // Java

      if (isLikelyCode && remaining.length > 30 && parts.length === 0) {
        return <CodeBlock code={remaining} />;
      }

      parts.push(<span key={`text-${lastIndex}`}>{remaining}</span>);
    }

    return parts.length > 0 ? parts : content;
  };
  
  if (blocks && blocks.length > 0) {
    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed selection:bg-white/10">
        {blocks.map((block, i) => {
          if (block.type === "text") return <React.Fragment key={i}>{renderContent(block.content)}</React.Fragment>;
          if (block.type === "mention") {
            return (
              <span 
                key={i} 
                className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-lg mx-0.5 border border-white/10 inline-block shadow-sm"
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

  return <div className="whitespace-pre-wrap break-words leading-relaxed selection:bg-white/10">{renderContent(text || "")}</div>;
};

const ProfileImage: React.FC<{ userId?: string; url?: string | null; initial?: string; isMe: boolean; }> = ({ userId, url, initial, isMe }) => {
  const status = usePresenceStore((s) => isMe ? (s.selfStatus === "active" ? "online" : "away") : (userId ? s.getPresence(userId).status : "offline"));
  
  return (
    <div className={cn(
      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden ring-1 ring-white/10 transition-transform duration-300 hover:scale-105",
      isMe ? "bg-white/10" : "bg-white/5"
    )}>
      {url ? (
        <img src={url} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className={cn("text-[11px] font-bold", isMe ? "text-white" : "text-slate-500")}>{initial || "U"}</span>
      )}
      
      <div className="absolute bottom-1 end-1">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full border-2 border-[#14161d] transition-all duration-500 relative",
          status === "online" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : 
          status === "away" ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]" : 
          "bg-slate-700"
        )}>
          {status === "online" && (
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-emerald-400"
            />
          )}
        </div>
      </div>
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
          <span className="text-[11px] font-bold text-slate-500 font-display">{profileName}</span>
          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest h-5 px-2", profileRole === "Engineer" ? "border-[var(--chat-accent-warm)]/20 bg-[var(--chat-accent-warm)]/5 text-[var(--chat-accent-warm)]" : "border-white/10 bg-white/5 text-slate-400")}>
            {profileRole}
          </Badge>
        </div>
      )}

      <div className={cn("flex items-end gap-3 max-w-[85%] md:max-w-[70%]", isMe && "flex-row-reverse")}>
        <ProfileImage userId={isMe ? currentUser?.id : message.senderId} url={profileImageUrl} initial={initial} isMe={isMe} />

        <div className="flex flex-col gap-1.5 min-w-0">
          <div className={cn(
            "px-4 py-3 text-[14px] relative transition-all duration-300 group/bubble",
            isMe 
              ? "chat-bubble-mine" 
              : "chat-bubble-theirs",
            isImportant && "border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20",
            !isMe && isEngineerMessage && !isImportant && "border-s-2 border-s-[var(--chat-accent-warm)]/50"
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
                "absolute top-2 opacity-0 group-hover/bubble:opacity-100 transition-all p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-[var(--chat-accent-warm)] z-20",
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
              <div className="flex items-center">
                {message.status === "pending" ? (
                  <Clock className="w-3 h-3 text-slate-600 animate-pulse" />
                ) : message.status === "read" ? (
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

const DateDivider: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center gap-4 my-8">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    <div className="px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{date}</span>
    </div>
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
  </div>
);

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
  
  const { data: usage } = useChatUsage();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingEvent = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { invoke } = useSignalR();
  const user = useAuthStore((s) => s.user);

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
    if (text.trim() || selectedFile) {
      const validatedMentions = activeMentions.filter(m => text.substring(m.indices[0], m.indices[1] + 1).includes(`@${m.name}`));
      onSendMessage(text.trim(), selectedFile || undefined, validatedMentions, MentionEngine.buildBlocks(text.trim(), validatedMentions));
      sounds.playChatSend();
      setText(""); setSelectedFile(null); setActiveMentions([]); setShowMentions(false); setShowEmojiPicker(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          // Rename to clipboard-<timestamp>.png
          const newFile = new File([file], `clipboard-${Date.now()}.png`, { type: file.type });
          
          if (text.trim() === "") {
            // Instant send if no text
            onSendMessage("", newFile, [], []);
            sounds.playChatSend();
            toast.success("Image sent instantly");
          } else {
            // Attach if text exists
            setSelectedFile(newFile);
            toast.success("Image attached to your message");
          }
          break;
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent rounded-none md:rounded-3xl border-0 overflow-hidden relative">
      <div className="flex-1 min-h-0 relative">
        <div 
          ref={scrollRef} 
          className="absolute inset-0 overflow-y-auto p-4 md:px-8 md:py-6 flex flex-col-reverse gap-2 custom-scrollbar"
          onScroll={(e) => {
            const target = e.currentTarget;
            setShowScrollButton(target.scrollTop < -100);
          }}
        >
          {messages.map((msg, i) => {
            const nextMsg = messages[i + 1];
            const isDifferentDay = nextMsg && !isToday(new Date(msg.sentAt)) && format(new Date(msg.sentAt), "yyyy-MM-dd") !== format(new Date(nextMsg.sentAt), "yyyy-MM-dd");
            const dateStr = isToday(new Date(msg.sentAt)) ? "Today" : isYesterday(new Date(msg.sentAt)) ? "Yesterday" : format(new Date(msg.sentAt), "MMMM d, yyyy");

            return (
              <React.Fragment key={msg.id}>
                <MessageBubble 
                  message={msg} 
                  isMe={msg.senderId === user?.id} 
                  showSender={i === messages.length - 1 || messages[i+1]?.senderId !== msg.senderId} 
                />
                {isDifferentDay && <DateDivider date={dateStr} />}
              </React.Fragment>
            );
          })}

          {hasNextPage && (
            <div className="flex justify-center py-8">
              <button 
                onClick={() => fetchNextPage?.()} 
                className="text-[11px] font-bold text-slate-500 hover:text-white uppercase tracking-widest bg-white/[0.03] border border-white/5 rounded-2xl px-12 h-11 hover:bg-white/[0.08] transition-all"
              >
                {isFetchingNextPage ? "Establishing connection..." : "Load earlier messages"}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-[var(--chat-accent-warm)] animate-spin mb-4" />
                <div className="absolute inset-0 bg-[var(--chat-accent-warm)]/20 blur-xl rounded-full" />
              </div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest animate-pulse">Entering Frequency...</p>
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

      <div className="p-4 md:p-8 bg-ui-bg/95 border-t border-white/5 flex flex-col gap-4 relative z-50">
        <div className="flex items-center justify-between px-2">
          <TypingIndicator activeGroupId={activeGroupId} />
          
          {usage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "ms-auto mb-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 backdrop-blur-md transition-all duration-500",
                usage.total === null 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                  : (usage.used / usage.total > 0.8)
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse"
                    : "bg-white/5 border-white/10 text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                <span>{usage.tier} Quota</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-white">{usage.used}</span>
                <span className="opacity-40">/</span>
                <span>{usage.total ?? "∞"}</span>
              </div>
            </motion.div>
          )}
        </div>
        
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
              className="absolute bottom-full start-4 end-4 md:start-8 md:end-auto mb-6 w-full md:w-80 bg-[var(--chat-surface-elevated)] border border-white/10 rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[40vh] custom-scrollbar z-[60]"
            >
              <div className="p-4 border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mention someone</div>
              {filteredMembers.map((m, i) => (
                <button key={m.id} onClick={() => insertMention(m)} className={cn("w-full flex items-center gap-4 px-5 py-4 transition-all text-left group/m", i === mentionIndex ? "bg-[var(--chat-accent-warm)]/10 text-[var(--chat-accent-warm)]" : "text-slate-400 hover:bg-white/5")}>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold transition-transform group-hover/m:scale-110">{m.name.charAt(0)}</div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold tracking-tight text-white font-display">{m.name}</span>
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

        <div 
          onPaste={handlePaste}
          className="flex items-center gap-3 bg-white/[0.03] rounded-full border border-white/10 px-4 md:px-6 h-14 md:h-16 shadow-xl transition-all focus-within:border-[var(--chat-accent-warm)]/40 focus-within:bg-white/[0.05]"
        >
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            className="p-2 text-slate-500 hover:text-[var(--chat-accent-warm)] transition-colors"
          >
            <Smile className="w-6 h-6" />
          </button>
          
          <input 
            ref={inputRef} 
            value={text} 
            onChange={(e) => handleInputChange(e.target.value)} 
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..." 
            className="border-none bg-transparent focus:ring-0 h-full flex-1 text-[15px] font-medium text-white placeholder:text-slate-600 min-w-0" 
          />

          {text.length > 0 && (
            <div className={cn(
              "hidden md:flex items-center px-3 py-1 rounded-lg border text-[9px] font-black tracking-widest uppercase transition-colors",
              text.length > 1500 ? "border-amber-500/30 text-amber-500 bg-amber-500/5" : "border-white/5 text-slate-600 bg-white/5"
            )}>
              {text.length} Chars
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-2 text-slate-500 hover:text-[var(--chat-accent-warm)] transition-colors"
            >
              <Paperclip className="w-6 h-6" />
            </button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend} 
              disabled={!text.trim() && !selectedFile} 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[var(--chat-accent-gradient)] text-white flex items-center justify-center shadow-lg transition-all disabled:opacity-20 disabled:grayscale"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => { 
              const file = e.target.files?.[0];
              if (file) {
                const tier = user?.subscriptionTier || "Free";
                const limits: Record<string, number> = { Free: 5, Pro: 25, Ultra: 100 };
                const maxMB = limits[tier] || 5;
                if (file.size > maxMB * 1024 * 1024) {
                  toast?.error?.(`File exceeds ${maxMB}MB limit for ${tier} tier.`);
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
      className="absolute bottom-full left-8 mb-4 flex items-center gap-4 px-5 py-2.5 rounded-full bg-[var(--chat-surface-elevated)] text-[var(--chat-accent-warm)] border border-white/10 shadow-2xl"
    >
      <div className="flex gap-1.5">
        <span className="w-1.5 h-1.5 bg-[var(--chat-accent-warm)] rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-[var(--chat-accent-warm)] rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-[var(--chat-accent-warm)] rounded-full animate-bounce" />
      </div>
      <span className="text-[11px] font-bold tracking-tight">
        {typingNames.length === 1 ? `${typingNames[0]} is typing...` : `${typingNames.join(", ")} are typing...`}
      </span>
    </motion.div>
  );
};

export default ChatWindow;
