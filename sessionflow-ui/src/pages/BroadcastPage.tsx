import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Send, History, Users, Mail, Bell,
  CheckCircle2, Clock, Loader2, Zap, AlertTriangle, RefreshCw, ChevronRight,
  TestTube2, XCircle
} from "lucide-react";
import { useBroadcastHistory, useSendBroadcast, useTestBroadcastEmail } from "../queries/useBroadcastQueries";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const CHANNELS = [
  { id: "InApp", label: "In-App", icon: Bell, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  { id: "Email", label: "Email", icon: Mail, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  { id: "Both", label: "Both", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
];

const TEMPLATES = [
  { label: "Maintenance", subject: "🔧 Scheduled Maintenance", message: "We will be performing scheduled maintenance. The platform may be temporarily unavailable. We apologize for any inconvenience." },
  { label: "New Feature", subject: "✨ New Feature Available", message: "A new feature is now available on SessionFlow! Log in to explore the latest improvements to your experience." },
  { label: "Policy Update", subject: "📋 Important Policy Update", message: "We've updated our terms and policies. Please log in to review the changes." },
  { label: "Welcome Back", subject: "👋 Welcome Back!", message: "We've missed you! Log in today and explore what's new on SessionFlow." },
];

const HistoryItem: React.FC<{ item: any }> = ({ item }) => {
  const ChannelIcon = item.channel === "Email" ? Mail : item.channel === "Both" ? Zap : Bell;
  const channelColor = item.channel === "Email" ? "text-sky-400" : item.channel === "Both" ? "text-amber-400" : "text-indigo-400";
  const hasEmailChannel = item.channel === "Email" || item.channel === "Both";
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ChannelIcon className={cn("w-3.5 h-3.5 flex-shrink-0", channelColor)} />
            <p className="text-sm font-semibold text-white truncate">{item.subject}</p>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.message}</p>
          <div className="flex items-center gap-3 text-[9px] text-slate-600 font-bold uppercase tracking-widest flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.recipientCount} recipients</span>
            {hasEmailChannel && (
              item.emailCompleted ? (
                <>
                  <span className={cn("flex items-center gap-1", item.emailFailedCount > 0 ? "text-amber-400" : "text-emerald-500")}>
                    <CheckCircle2 className="w-3 h-3" />
                    {item.emailSentCount}/{item.recipientCount} sent
                  </span>
                  {item.emailFailedCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-400">
                      <XCircle className="w-3 h-3" /> {item.emailFailedCount} failed
                    </span>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-1 text-amber-500">
                  <Clock className="w-3 h-3 animate-pulse" /> Sending...
                </span>
              )
            )}
          </div>
          {item.emailError && (
            <p className="text-[10px] text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {item.emailError}
            </p>
          )}
        </div>
        <span className="text-[9px] text-slate-600 whitespace-nowrap flex-shrink-0">
          {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};



const BroadcastPage: React.FC = () => {
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("InApp");
  const [page, setPage] = useState(1);
  const [showTemplates, setShowTemplates] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; hint?: string } | null>(null);

  const historyQ = useBroadcastHistory(page, tab === "history");
  const sendMutation = useSendBroadcast();
  const testMutation = useTestBroadcastEmail();
  const handleSend = () => {
    sendMutation.mutate(
      { subject, message, channel },
      {
        onSuccess: (data: any) => {
          toast.success(`Broadcast sent to ${data.recipientCount} users!`);
          setSubject(""); setMessage(""); setTab("history");
        },
        onError: () => toast.error("Failed to send broadcast."),
      }
    );
  };

  const handleTestEmail = () => {
    setTestResult(null);
    testMutation.mutate(testEmailAddr, {
      onSuccess: (data) => setTestResult(data),
      onError: () => setTestResult({ success: false, error: "Request failed — check network or Railway logs.", hint: "Ensure the backend is running and RESEND_API_KEY is set." }),
    });
  };

  const isValid = subject.trim().length > 0 && message.trim().length >= 10;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 pt-6 pb-10 max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/20 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Broadcast</h1>
              <p className="text-xs text-slate-500 mt-0.5">Send platform-wide announcements to all users</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1">
            {(["compose", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                tab === t ? "bg-[var(--ui-accent)] text-white" : "text-slate-500 hover:text-white"
              )}>
                {t === "compose" ? <Send className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                {t}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === "compose" ? (
            <motion.div key="compose" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              {/* Channel */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Delivery Channel</p>
                <div className="grid grid-cols-3 gap-3">
                  {CHANNELS.map(ch => (
                    <button key={ch.id} onClick={() => setChannel(ch.id)} className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                      channel === ch.id ? `${ch.bg} ${ch.border} ${ch.color}` : "bg-white/[0.02] border-white/5 text-slate-500 hover:text-white"
                    )}>
                      <ch.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Subject *</label>
                <input value={subject} onChange={e => setSubject(e.target.value.slice(0, 5000))}
                  placeholder="e.g. Important System Update"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--ui-accent)]/50 placeholder:text-slate-600" />
                <p className="text-[9px] text-slate-600 mt-1 text-right">{subject.length}/5000</p>
              </div>

              {/* Templates */}
              <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-2 text-xs text-[var(--ui-accent)] font-semibold hover:opacity-80">
                <Zap className="w-3.5 h-3.5" /> Use Template <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showTemplates && "rotate-90")} />
              </button>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map(t => (
                      <button key={t.label} onClick={() => { setSubject(t.subject); setMessage(t.message); setShowTemplates(false); }}
                        className="text-left p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-[var(--ui-accent)]/30 hover:bg-[var(--ui-accent)]/5 transition-all group">
                        <p className="text-xs font-semibold text-white group-hover:text-[var(--ui-accent)]">{t.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t.subject}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 2000))} rows={6}
                  placeholder="Write your announcement here..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--ui-accent)]/50 placeholder:text-slate-600 resize-none" />
                <p className={cn("text-[9px] mt-1 text-right", message.length > 1800 ? "text-rose-400" : "text-slate-600")}>{message.length}/2000</p>
              </div>

              {(channel === "Email" || channel === "Both") && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">Email delivery runs in the background. Large recipient lists may take a few minutes.</p>
                </div>
              )}

              <button onClick={handleSend} disabled={!isValid || sendMutation.isPending}
                className="w-full py-3.5 rounded-2xl bg-[var(--ui-accent)] text-white font-bold text-sm flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-[var(--ui-accent)]/20">
                {sendMutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Megaphone className="w-5 h-5" /> Send Broadcast</>}
              </button>

              {/* ── Email Diagnostic Panel ────────────────────────────────────── */}
              <div className="border border-white/5 rounded-2xl p-4 bg-white/[0.015] space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <TestTube2 className="w-3.5 h-3.5" /> Email Diagnostic
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Send a test email to verify <strong className="text-slate-400">RESEND_API_KEY</strong> is set and <strong className="text-slate-400">sessionflow.uk</strong> is verified. Check inbox + spam.
                </p>
                <div className="flex gap-2">
                  <input
                    value={testEmailAddr}
                    onChange={e => setTestEmailAddr(e.target.value)}
                    placeholder="your@gmail.com"
                    type="email"
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50 placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleTestEmail}
                    disabled={testMutation.isPending || !testEmailAddr.includes('@')}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send Test
                  </button>
                </div>

                {/* Result */}
                <AnimatePresence>
                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "rounded-xl p-3 border text-xs space-y-1",
                        testResult.success
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                      )}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        {testResult.success
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Email delivered successfully!</>
                          : <><XCircle className="w-3.5 h-3.5" /> Delivery failed</>}
                      </p>
                      {testResult.error && <p className="opacity-80">{testResult.error}</p>}
                      {testResult.hint && (
                        <p className={cn("font-semibold", testResult.success ? "text-emerald-400" : "text-amber-400")}>
                          → {testResult.hint}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div key="history" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Broadcast History {historyQ.data ? `(${historyQ.data.total})` : ""}</p>
                <button onClick={() => historyQ.refetch()} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              {historyQ.isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" /></div>
                : historyQ.data?.items?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <Megaphone className="w-12 h-12 text-slate-700" />
                    <p className="text-sm text-slate-500">No broadcasts sent yet.</p>
                    <button onClick={() => setTab("compose")} className="text-xs text-[var(--ui-accent)] font-semibold">Send your first broadcast →</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyQ.data?.items?.map((item: any) => <HistoryItem key={item.id} item={item} />)}
                    {(historyQ.data?.totalPages ?? 0) > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 hover:text-white disabled:opacity-30">← Prev</button>
                        <span className="text-xs text-slate-500">{page} / {historyQ.data!.totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(historyQ.data!.totalPages, p + 1))} disabled={page === historyQ.data!.totalPages} className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 hover:text-white disabled:opacity-30">Next →</button>
                      </div>
                    )}
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BroadcastPage;
