import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, MessageSquare, Zap, BookOpen, History,
  Send, Plus, Trash2, Sparkles, Code2, FileText,
  BarChart3, Users, Loader2, Copy, Check, ChevronRight
} from "lucide-react";
import { useAuthStore } from "../store/stores";
import { cn } from "../lib/utils";
import { streamAIChat } from "../api/newFeatures";
import { useAIPresets, useAIUsage, useAILogs, useAIPresetMutations, type AIPreset } from "../queries/useAIQueries";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface Message { role: "user" | "assistant"; content: string; ts: Date }
interface Preset { id: string; title: string; prompt: string; icon: string; category: string }

// ── System Presets ─────────────────────────────────────────────────────────
const SYSTEM_PRESETS: Omit<Preset, "id">[] = [
  { title: "Summarize Sessions", prompt: "Summarize the attendance patterns from the last week and highlight any concerning trends.", icon: "BarChart3", category: "analytics" },
  { title: "Generate Report", prompt: "Help me write a professional monthly performance report for my students.", icon: "FileText", category: "reporting" },
  { title: "Student Engagement", prompt: "What strategies can I use to improve student engagement and attendance rates?", icon: "Users", category: "teaching" },
  { title: "Schedule Optimizer", prompt: "How should I organize my group sessions for maximum efficiency and minimal conflicts?", icon: "Zap", category: "scheduling" },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  BarChart3, FileText, Users, Zap, Sparkles, Code2, BookOpen, Brain
};

// ── AI Usage Bar ───────────────────────────────────────────────────────────
const UsageBar: React.FC = () => {
  const { data } = useAIUsage();
  if (!data) return null;
  const pct = Math.min((data.used / data.limit) * 100, 100);
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] rounded-xl border border-white/5">
      <Brain className="w-4 h-4 text-[var(--ui-accent)]" />
      <div className="flex-1">
        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          <span>Daily AI Usage</span>
          <span>{data.used} / {data.limit === 9999 ? "∞" : data.limit}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className={cn("h-full rounded-full", pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-[var(--ui-accent)]")}
          />
        </div>
      </div>
    </div>
  );
};

// ── Chat Message ────────────────────────────────────────────────────────────
const ChatMessage: React.FC<{ msg: Message }> = ({ msg }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
        msg.role === "user" ? "bg-[var(--ui-accent)] text-white" : "bg-purple-500/20 text-purple-400"
      )}>
        {msg.role === "user" ? "U" : "AI"}
      </div>
      <div className={cn(
        "group relative max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
        msg.role === "user"
          ? "bg-[var(--ui-accent)] text-white rounded-tr-sm"
          : "bg-white/[0.04] text-slate-200 border border-white/5 rounded-tl-sm"
      )}>
        {/* Render markdown-like bold */}
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>')
        }} />
        {msg.role === "assistant" && (
          <button
            onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>
        )}
        <p className="mt-1 text-[9px] opacity-40">
          {msg.ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
};

// ── Chat Tab ───────────────────────────────────────────────────────────────
const ChatTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "👋 Hello! I'm your **SessionFlow AI Assistant**.\n\nI can help you with:\n- 📊 Analyzing attendance and session trends\n- 📝 Generating reports and summaries\n- 💡 Suggesting teaching strategies\n- ⚡ Optimizing your schedule\n\nWhat would you like to explore today?",
    ts: new Date()
  }]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(s => s.user);

  const scroll = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scroll(); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: input.trim(), ts: new Date() };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const aiMsg: Message = { role: "assistant", content: "", ts: new Date() };
    setMessages(prev => [...prev, aiMsg]);

    try {
      let accumulated = "";
      await streamAIChat(sessionId, userMsg.content, history, (chunk) => {
        accumulated += chunk;
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: accumulated } : m
        ));
      });
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: "❌ Connection error. Please try again." } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <UsageBar />
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-4 min-h-0 custom-scrollbar">
        {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">AI</div>
            <div className="px-4 py-3 bg-white/[0.04] rounded-2xl rounded-tl-sm border border-white/5 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[var(--ui-accent)] animate-spin" />
              <span className="text-xs text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-3 bg-white/[0.03] rounded-2xl border border-white/5 p-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your sessions, students, or analytics..."
            rows={2}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 resize-none outline-none px-2 py-1"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="self-end w-10 h-10 rounded-xl bg-[var(--ui-accent)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="mt-2 text-center text-[9px] text-slate-600">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

// ── Presets Tab ─────────────────────────────────────────────────────────────
const PresetsTab: React.FC<{ onUsePreset: (prompt: string, tab: string) => void }> = ({ onUsePreset }) => {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const { data: userPresets = [] } = useAIPresets();
  const { save: saveMutation, remove: deleteMutation } = useAIPresetMutations();

  const handleSave = () => {
    saveMutation.mutate(
      { title: newTitle, prompt: newPrompt, icon: "Sparkles", category: "custom" },
      {
        onSuccess: () => { setShowNew(false); setNewTitle(""); setNewPrompt(""); toast.success("Preset saved!"); },
        onError: () => toast.error("Failed to save preset")
      }
    );
  };

  const PresetCard: React.FC<{ preset: any; isSystem?: boolean }> = ({ preset, isSystem }) => {
    const Icon = ICON_MAP[preset.icon] || Sparkles;
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="group flex items-start gap-3 p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 hover:border-[var(--ui-accent)]/20 transition-all cursor-pointer"
        onClick={() => onUsePreset(preset.prompt, "chat")}
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[var(--ui-accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">{preset.title}</p>
            {isSystem && <span className="text-[8px] px-2 py-0.5 rounded-full bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] font-bold uppercase tracking-wider">System</span>}
            {!isSystem && (
              <button
                onClick={e => { e.stopPropagation(); deleteMutation.mutate(preset.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{preset.prompt}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[var(--ui-accent)] flex-shrink-0 mt-1 transition-colors" />
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Presets</p>
      </div>
      {SYSTEM_PRESETS.map((p, i) => <PresetCard key={i} preset={{ ...p, id: `sys-${i}` }} isSystem />)}

      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">My Presets</p>
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 text-xs text-[var(--ui-accent)] hover:opacity-80 transition-opacity font-semibold">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <AnimatePresence>
          {showNew && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-4 bg-white/[0.02] rounded-2xl border border-[var(--ui-accent)]/20 space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Preset title..."
                className="w-full bg-transparent text-sm text-white border-b border-white/10 pb-1 outline-none placeholder:text-slate-600" />
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Prompt text..." rows={3}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600 resize-none" />
              <button onClick={handleSave}
                disabled={!newTitle.trim() || !newPrompt.trim() || saveMutation.isPending}
                className="w-full py-2 rounded-xl bg-[var(--ui-accent)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
                {saveMutation.isPending ? "Saving..." : "Save Preset"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {userPresets.filter((p: any) => !p.isSystemPreset).length === 0 ? (
          <p className="text-center text-sm text-slate-600 py-8">No custom presets yet. Create one above!</p>
        ) : (
          userPresets.filter((p: any) => !p.isSystemPreset).map((p: any) => <PresetCard key={p.id} preset={p} />)
        )}
      </div>
    </div>
  );
};

// ── Logs Tab ────────────────────────────────────────────────────────────────
const LogsTab: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === "Admin";
  const { data: logs = [], isLoading } = useAILogs(1);

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
      <Brain className="w-12 h-12 text-slate-700" />
      <p className="text-sm text-slate-500">AI logs are only visible to administrators.</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-2">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Recent AI Interactions</p>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center text-sm text-slate-600 py-8">No AI logs yet.</p>
      ) : logs.map((log: any) => (
        <div key={log.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{log.model}</span>
            <div className="flex items-center gap-2">
              {log.wasCached && <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">CACHED</span>}
              <span className="text-[9px] text-slate-600">{log.durationMs}ms</span>
              <span className="text-[9px] text-slate-600">{new Date(log.timestamp).toLocaleDateString()}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-1 font-medium">Q: {log.prompt}</p>
          <p className="text-xs text-slate-600 line-clamp-2">A: {log.response}</p>
        </div>
      ))}
    </div>
  );
};

// ── Main Page ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "presets", label: "Presets", icon: Sparkles },
  { id: "logs", label: "AI Logs", icon: History },
];

const AICenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handleUsePreset = (prompt: string, tab: string) => {
    setActiveTab("chat");
    setPendingPrompt(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-[var(--ui-accent)]/20 border border-purple-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">AI Control Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">Your intelligent platform assistant — powered by SessionFlow Neural Engine</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                activeTab === tab.id
                  ? "bg-[var(--ui-accent)] text-white shadow-lg"
                  : "text-slate-500 hover:text-white"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === "chat" && <ChatTab />}
            {activeTab === "presets" && <PresetsTab onUsePreset={handleUsePreset} />}
            {activeTab === "logs" && <LogsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AICenterPage;
