import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Minus, X, Trash2, Sparkles } from 'lucide-react';
import { useAIAgentStore } from '../../store/stores';
import { AIMessageList } from './AIMessageList';
import { AIMessageInput } from './AIMessageInput';
import { cn } from '../../lib/utils';

export const AIChatPanel: React.FC = () => {
  const isOpen = useAIAgentStore((s) => s.isOpen);
  const isMinimizedPanel = useAIAgentStore((s) => s.isMinimizedPanel);
  const isThinking = useAIAgentStore((s) => s.isThinking);
  const fabPosition = useAIAgentStore((s) => s.fabPosition);
  const closePanel = useAIAgentStore((s) => s.closePanel);
  const minimizePanel = useAIAgentStore((s) => s.minimizePanel);
  const clearSession = useAIAgentStore((s) => s.clearSession);
  const messages = useAIAgentStore((s) => s.messages);

  // Anchor panel above FAB position
  const btnSize = 56;
  const panelW = 380;
  const panelH = 540;
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
                <p className="text-sm font-bold text-white">SessionFlow AI</p>
                <Sparkles className="w-3 h-3 text-violet-400" />
              </div>
              <p className="text-[10px] text-slate-500">
                {isThinking ? 'Thinking…' : 'Ready to help'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
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

          {/* ── Body (collapsible) ── */}
          <AnimatePresence>
            {!isMinimizedPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: panelH - 60, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex flex-col overflow-hidden"
                style={{ height: panelH - 60 }}
              >
                <AIMessageList />
                <AIMessageInput />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
