import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Minus, X, Trash2, Sparkles, History, ChevronLeft, Clock, Zap, MessageSquare } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { useAIAgentStore, useAuthStore } from '../../store/stores';
import { useAIUsage, useAIHistory } from '../../queries/useAIQueries';
import { AIMessageList } from './AIMessageList';
import { AIMessageInput } from './AIMessageInput';
import { cn } from '../../lib/utils';

// ─── Quota Bar Component ──────────────────────────────────────────────────────
const QuotaBar: React.FC<{
  used: number;
  limit: number;
  resetsAt: string;
  tier: string;
}> = ({ used, limit, resetsAt, tier }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isLow = remaining <= 2;
  const isExhausted = remaining <= 0;

  useEffect(() => {
    const update = () => {
      const diff = new Date(resetsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('resetting…'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [resetsAt]);

  const barColor = isExhausted
    ? 'from-rose-500 to-red-600'
    : isLow
      ? 'from-amber-400 to-orange-500'
      : 'from-violet-500 to-indigo-500';

  const textColor = isExhausted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-300';

  return (
    <div className="px-4 py-2.5 border-b border-white/[0.04] bg-[#0c1018]">
      <div className="flex items-center justify-between text-[10px] mb-1.5">
        <div className="flex items-center gap-1.5">
          <Zap className={cn('w-3 h-3', isExhausted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-violet-400')} />
          <span className={cn('font-semibold', textColor)}>
            {remaining} <span className="text-slate-500 font-normal">/ {limit} remaining</span>
          </span>
        </div>
        <span className="text-slate-600 flex items-center gap-1 font-mono">
          <Clock className="w-2.5 h-2.5" />
          {timeLeft}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', barColor)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <p className="text-[9px] text-slate-600 mt-1 text-right capitalize tracking-wide">{tier} plan · 3h window</p>
    </div>
  );
};

// ─── History Panel ────────────────────────────────────────────────────────────
const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data: history, isLoading } = useAIHistory();

  // Group by sessionId
  const sessions = React.useMemo(() => {
    if (!history) return [];
    const map = new Map<string, { sessionId: string; items: typeof history; firstAt: string }>();
    for (const h of history) {
      const existing = map.get(h.sessionId);
      if (existing) {
        existing.items.push(h);
      } else {
        map.set(h.sessionId, { sessionId: h.sessionId, items: [h], firstAt: h.timestamp });
      }
    }
    return Array.from(map.values()).slice(0, 20);
  }, [history]);

  const loadSession = useCallback((items: typeof history) => {
    if (!items) return;
    const store = useAIAgentStore.getState();
    store.clearSession();
    for (const item of [...items].reverse()) {
      store.addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: item.prompt,
        timestamp: item.timestamp,
        status: 'sent',
      });
      store.addMessage({
        id: crypto.randomUUID(),
        role: 'agent',
        content: item.response,
        timestamp: item.timestamp,
        status: 'sent',
      });
    }
    onClose();
  }, [onClose]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.04] bg-[#0c1018]">
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/5">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-violet-400" />
          <p className="text-sm font-semibold text-white">Chat History</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <motion.div
              className="w-6 h-6 rounded-full border-2 border-violet-500/30 border-t-violet-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-xs text-slate-500">Loading history…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageSquare className="w-8 h-8 text-slate-700" />
            <p className="text-xs text-slate-500">No conversations yet</p>
          </div>
        ) : (
          sessions.map((s, idx) => (
            <motion.button
              key={s.sessionId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => loadSession(s.items)}
              className="w-full text-left px-3.5 py-3 rounded-xl bg-[#141926] hover:bg-slate-800/80 border border-slate-700/25 hover:border-violet-500/30 transition-all duration-200 group"
            >
              <p className="text-[12px] text-slate-200 truncate group-hover:text-violet-300 transition-colors font-medium">
                {s.items[0]?.prompt.slice(0, 70) || 'Untitled'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-600 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(s.firstAt).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-slate-600">·</span>
                <span className="text-[10px] text-slate-600">{s.items.length} messages</span>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Main Chat Panel ──────────────────────────────────────────────────────────
export const AIChatPanel: React.FC = () => {
  const isOpen = useAIAgentStore((s) => s.isOpen);
  const isMinimizedPanel = useAIAgentStore((s) => s.isMinimizedPanel);
  const isThinking = useAIAgentStore((s) => s.isThinking);
  const fabPosition = useAIAgentStore((s) => s.fabPosition);
  const closePanel = useAIAgentStore((s) => s.closePanel);
  const minimizePanel = useAIAgentStore((s) => s.minimizePanel);
  const clearSession = useAIAgentStore((s) => s.clearSession);
  const messages = useAIAgentStore((s) => s.messages);
  const token = useAuthStore((s) => s.token);

  const [showHistory, setShowHistory] = useState(false);

  // ── Fetch quota from API ──────────────────────────────────────────────────
  const { data: quota, refetch: refetchQuota } = useAIUsage();

  // ── Real-time quota via SignalR (AIQuotaUpdated) ──────────────────────────
  const [realtimeQuota, setRealtimeQuota] = useState<{
    used: number; limit: number; resetsAt: string; tier: string;
  } | null>(null);

  useEffect(() => {
    if (!token || !isOpen) return;

    const HUB_URL = `${import.meta.env.VITE_API_URL ?? ''}/hub/notifications`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('AIQuotaUpdated', (payload: { used: number; limit: number; resetsAt: string; tier: string }) => {
      setRealtimeQuota(payload);
    });

    connection.start().catch(() => {});

    return () => { connection.stop().catch(() => {}); };
  }, [token, isOpen]);

  // Merge: prefer real-time, fall back to API data
  const activeQuota = realtimeQuota || (quota ? {
    used: quota.used, limit: quota.limit, resetsAt: quota.resetsAt, tier: quota.tier
  } : null);

  // Refetch quota when a message completes (as backup for SignalR)
  useEffect(() => {
    if (!isThinking && messages.length > 0) {
      refetchQuota();
    }
  }, [isThinking, messages.length]);

  // ── Panel dimensions & positioning ────────────────────────────────────────
  const btnSize = 56;
  const panelW = 480;
  const panelH = 640;
  const defaultFabX = window.innerWidth - btnSize - 24;
  const defaultFabY = window.innerHeight - btnSize - 96;
  const fabX = fabPosition?.x ?? defaultFabX;
  const fabY = fabPosition?.y ?? defaultFabY;

  const rawLeft = fabX + btnSize / 2 - panelW / 2;
  const panelLeft = Math.max(8, Math.min(window.innerWidth - panelW - 8, rawLeft));
  const panelTop = Math.max(8, fabY - panelH - 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ai-chat-panel"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          style={{
            position: 'fixed',
            left: panelLeft,
            top: panelTop,
            width: panelW,
            zIndex: 9998,
          }}
          className={cn(
            'flex flex-col rounded-3xl overflow-hidden',
            'border border-violet-500/15',
            'bg-[#0a0e1a] backdrop-blur-2xl',
            'shadow-[0_32px_100px_rgba(0,0,0,0.7),0_0_80px_rgba(139,92,246,0.08)]',
          )}
          id="ai-chat-panel"
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] flex-shrink-0 bg-gradient-to-r from-violet-500/[0.06] via-indigo-500/[0.04] to-transparent">
            {/* Avatar with status */}
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                <Bot className="w-5 h-5 text-violet-400" />
              </div>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0e1a]',
                isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-white tracking-tight">Code Assistant</p>
                <Sparkles className="w-3.5 h-3.5 text-violet-400/70" />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {isThinking ? (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-amber-400"
                  >
                    Generating response…
                  </motion.span>
                ) : 'Ready · Coding assistant'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Chat history"
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                  showHistory ? 'text-violet-400 bg-violet-500/15 border border-violet-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
                )}
                id="ai-history-button"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearSession}
                  title="New conversation"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                  id="ai-clear-button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => minimizePanel(!isMinimizedPanel)}
                title={isMinimizedPanel ? 'Expand' : 'Minimize'}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                id="ai-minimize-button"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={closePanel}
                title="Close"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                id="ai-close-button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Quota Bar ── */}
          {activeQuota && !isMinimizedPanel && (
            <QuotaBar
              used={activeQuota.used}
              limit={activeQuota.limit}
              resetsAt={activeQuota.resetsAt}
              tier={activeQuota.tier}
            />
          )}

          {/* ── Body (collapsible) ── */}
          <AnimatePresence>
            {!isMinimizedPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: panelH - 110, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex flex-col overflow-hidden"
                style={{ height: panelH - 110 }}
              >
                {showHistory ? (
                  <HistoryPanel onClose={() => setShowHistory(false)} />
                ) : (
                  <>
                    <AIMessageList />
                    <AIMessageInput />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
