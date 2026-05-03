import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useAIAgentStore, type AIMessage } from '../../store/stores';
import { cn } from '../../lib/utils';

// ─── Typing Indicator ────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-3 justify-start">
    <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
      <Bot className="w-3.5 h-3.5 text-violet-400" />
    </div>
    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-800/60 border border-slate-700/40">
      <div className="flex gap-1.5 items-center h-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400"
            animate={{ y: ['0%', '-50%', '0%'] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─── Single Message Bubble ────────────────────────────────────────────────────
const MessageBubble: React.FC<{ msg: AIMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn('flex items-end gap-3 group', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Agent avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-violet-400" />
        </div>
      )}

      <div className={cn('max-w-[80%] flex flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-violet-600/25 border border-violet-500/30 text-white rounded-br-sm'
              : 'bg-slate-800/60 border border-slate-700/40 text-slate-200 rounded-bl-sm',
            msg.status === 'error' && 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          )}
        >
          {msg.content}
        </div>
        {/* Timestamp on hover */}
        <span className="text-[10px] text-slate-600 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {msg.status === 'error' && ' · Failed'}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-300">
          U
        </div>
      )}
    </motion.div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 px-6 text-center">
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"
    >
      <Bot className="w-8 h-8 text-violet-400" />
    </motion.div>
    <div>
      <p className="text-sm font-semibold text-white">SessionFlow AI</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
        Ask me anything about sessions, groups, students, or how to use the platform.
      </p>
    </div>
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {['How do I add a group?', 'Show me session stats', 'What is a wallet?'].map((hint) => (
        <span key={hint} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 cursor-default">
          {hint}
        </span>
      ))}
    </div>
  </div>
);

// ─── Message List ─────────────────────────────────────────────────────────────
export const AIMessageList: React.FC = () => {
  const messages = useAIAgentStore((s) => s.messages);
  const isThinking = useAIAgentStore((s) => s.isThinking);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar min-h-0">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <AnimatePresence>
            {/* Show typing dots only before streaming begins (empty placeholder) */}
            {isThinking && !(messages.length > 0 && messages[messages.length - 1].role === 'agent' && messages[messages.length - 1].content) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
};
