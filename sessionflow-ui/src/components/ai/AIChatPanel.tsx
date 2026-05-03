import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Minus, X, Trash2, Sparkles, History, ChevronLeft, Clock } from 'lucide-react';
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

  return (
    <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40">
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className={cn('font-medium', isExhausted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-400')}>
          {remaining}/{limit} left
        </span>
        <span className="text-slate-600 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {timeLeft}
        </span>
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isExhausted ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-violet-500'
          )}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <p className="text-[9px] text-slate-600 mt-0.5 text-right capitalize">{tier} plan</p>
    </div>
  );
};

// ─── History Panel ────────────────────────────────────────────────────────────
const HistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data: history, isLoading } = useAIHistory();
  const addMessage = useAIAgentStore((s) => s.addMessage);

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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-white">Chat History</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
        {isLoading ? (
          <p className="text-xs text-slate-500 text-center py-8">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No history yet</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => loadSession(s.items)}
              className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/30 hover:border-violet-500/30 transition-all group"
            >
              <p className="text-xs text-white truncate group-hover:text-violet-300 transition-colors">
                {s.items[0]?.prompt.slice(0, 60) || 'Untitled'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-slate-600">
                  {new Date(s.firstAt).toLocaleDateString()} · {s.items.length} msg
                </span>
              </div>
            </button>
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

  // Anchor panel above FAB position
  const btnSize = 56;
  const panelW = 420;
  const panelH = 580;
  const defaultFabX = window.innerWidth - btnSize - 24;
  const defaultFabY = window.innerHeight - btnSize - 96;
  const fabX = fabPosition?.x ?? defaultFabX;
  const fabY = fabPosition?.y ?? defaultFabY;

  // Clamp panel to viewport
  const rawLeft = fabX + btnSize / 2 - panelW / 2;
  const panelLeft = Math.max(8, Math.min(window.innerWidth - panelW - 8, rawLeft));
  const panelTop = Math.max(8, fabY - panelH - 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ai-chat-panel"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
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
            'border border-violet-500/20',
            'bg-[rgba(10,12,26,0.96)] backdrop-blur-2xl',
            'shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(139,92,246,0.12)]',
          )}
          id="ai-chat-panel"
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 flex-shrink-0 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
            {/* Status dot + icon */}
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-violet-400 w-[18px] h-[18px]" />
              </div>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[rgba(10,12,26,0.96)]',
                isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white">Code Assistant</p>
                <Sparkles className="w-3 h-3 text-violet-400" />
              </div>
              <p className="text-[10px] text-slate-500">
                {isThinking ? 'Thinking…' : 'Coding help'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Chat history"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                  showHistory ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                )}
                id="ai-history-button"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearSession}
                  title="Clear conversation"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  id="ai-clear-button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => minimizePanel(!isMinimizedPanel)}
                title={isMinimizedPanel ? 'Expand' : 'Minimize'}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                id="ai-minimize-button"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={closePanel}
                title="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
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
                animate={{ height: panelH - 100, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex flex-col overflow-hidden"
                style={{ height: panelH - 100 }}
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
