import React, { useRef, useCallback } from 'react';
import { SendHorizonal } from 'lucide-react';
import { useAIAgentStore, type AIMessage } from '../../store/stores';
import { aiAgentService } from '../../api/aiAgentService';
import { cn } from '../../lib/utils';

const MAX_CHARS = 500;

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
      // Auto-resize (1–4 lines)
      const ta = textareaRef.current;
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
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

  return (
    <div className="px-4 pb-4 pt-2 border-t border-white/5 flex-shrink-0">
      <div className={cn(
        'flex items-end gap-2 rounded-2xl border p-2 transition-all duration-200',
        'bg-slate-900/80',
        isThinking
          ? 'border-slate-700/40'
          : 'border-slate-700/60 focus-within:border-violet-500/50 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]'
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          disabled={isThinking}
          placeholder={isThinking ? 'AI is thinking…' : 'Ask me anything… (Enter to send)'}
          rows={1}
          className={cn(
            'flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none outline-none',
            'leading-relaxed py-1.5 px-2 min-h-[36px] max-h-24',
            isThinking && 'opacity-50 cursor-not-allowed'
          )}
          id="ai-message-input"
          aria-label="Message to AI assistant"
        />
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {value.length > MAX_CHARS * 0.8 && (
            <span className={cn('text-[9px]', remaining < 50 ? 'text-rose-400' : 'text-slate-600')}>
              {remaining}
            </span>
          )}
          <button
            onClick={sendMessage}
            disabled={!value.trim() || isThinking}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
              value.trim() && !isThinking
                ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            )}
            aria-label="Send message"
            id="ai-send-button"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-[9px] text-slate-700 text-center mt-1.5">
        Shift+Enter for new line · Powered by SessionFlow AI
      </p>
    </div>
  );
};
