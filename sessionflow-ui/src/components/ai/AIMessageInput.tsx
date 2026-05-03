import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { useAIAgentStore, type AIMessage } from '../../store/stores';
import { aiAgentService } from '../../api/aiAgentService';
import { cn } from '../../lib/utils';

const MAX_CHARS = 2000;

export const AIMessageInput: React.FC = () => {
  const isThinking = useAIAgentStore((s) => s.isThinking);
  const sessionId = useAIAgentStore((s) => s.sessionId);
  const messages = useAIAgentStore((s) => s.messages);
  const addMessage = useAIAgentStore((s) => s.addMessage);
  const updateMessageStatus = useAIAgentStore((s) => s.updateMessageStatus);
  const setThinking = useAIAgentStore((s) => s.setThinking);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (v.length <= MAX_CHARS) {
      setValue(v);
      // Auto-resize (1–5 lines)
      const ta = textareaRef.current;
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
      }
    }
  };

  const sendMessage = useCallback(async () => {
    const content = value.trim();
    if (!content || isThinking) return;
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Optimistic: add user message
    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    addMessage(userMsg);
    setThinking(true);

    // Placeholder agent message (will be filled by streaming)
    const agentId = crypto.randomUUID();
    const agentMsg: AIMessage = {
      id: agentId,
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    addMessage(agentMsg);

    // Prepare history (last 12 turns, excluding the placeholder)
    const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

    try {
      const finalText = await aiAgentService.streamMessage(
        { content, sessionId, history },
        (accumulated) => {
          // Progressive update — typewriter effect
          updateMessageStatus(agentId, 'sending', accumulated);
        }
      );
      // Mark as complete
      updateMessageStatus(agentId, 'sent', finalText || 'No response received.');
    } catch {
      updateMessageStatus(agentId, 'error', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setThinking(false);
    }
  }, [value, isThinking, sessionId, messages, addMessage, updateMessageStatus, setThinking]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const remaining = MAX_CHARS - value.length;
  const hasContent = value.trim().length > 0;

  return (
    <div className="px-4 pb-4 pt-2 border-t border-white/[0.04] flex-shrink-0 bg-gradient-to-t from-[#080c16] to-transparent">
      <div className={cn(
        'flex items-end gap-2 rounded-2xl border p-2.5 transition-all duration-300',
        'bg-[#0f1420]',
        isThinking
          ? 'border-slate-700/30'
          : 'border-slate-700/40 focus-within:border-violet-500/40 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.08),0_0_20px_rgba(139,92,246,0.06)]'
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          disabled={isThinking}
          placeholder={isThinking ? 'Generating response…' : 'Ask me to write, debug, or explain code…'}
          rows={1}
          className={cn(
            'flex-1 bg-transparent text-[13px] text-white placeholder-slate-600 resize-none outline-none',
            'leading-relaxed py-1.5 px-2 min-h-[36px] max-h-[120px]',
            'font-[Inter,system-ui,sans-serif]',
            isThinking && 'opacity-40 cursor-not-allowed'
          )}
          id="ai-message-input"
          aria-label="Message to AI assistant"
        />
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {value.length > MAX_CHARS * 0.85 && (
            <span className={cn(
              'text-[9px] font-mono tabular-nums',
              remaining < 100 ? 'text-rose-400' : 'text-slate-600'
            )}>
              {remaining}
            </span>
          )}
          <motion.button
            onClick={sendMessage}
            disabled={!hasContent || isThinking}
            whileHover={hasContent && !isThinking ? { scale: 1.05 } : {}}
            whileTap={hasContent && !isThinking ? { scale: 0.95 } : {}}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300',
              hasContent && !isThinking
                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.4)] hover:shadow-[0_0_24px_rgba(139,92,246,0.6)]'
                : isThinking
                  ? 'bg-slate-800 text-violet-400 cursor-not-allowed'
                  : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
            )}
            aria-label="Send message"
            id="ai-send-button"
          >
            {isThinking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizonal className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-1">
        <p className="text-[9px] text-slate-700">
          <kbd className="px-1 py-0.5 rounded bg-slate-800/60 text-slate-600 font-mono text-[8px]">Shift+Enter</kbd>
          <span className="ml-1">new line</span>
        </p>
        <p className="text-[9px] text-slate-700">
          Powered by <span className="text-violet-500/60 font-medium">SessionFlow AI</span>
        </p>
      </div>
    </div>
  );
};
