import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAIAgentStore, type AIMessage } from '../../store/stores';
import { cn } from '../../lib/utils';

// ─── Copy Button for Code Blocks ──────────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-200 z-10',
        'bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm',
        'border border-slate-600/50',
        copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
      )}
      title={copied ? 'Copied!' : 'Copy code'}
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ─── Markdown Renderer with Code Blocks ────────────────────────────────────────
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    components={{
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      code({ node, className, children, ref, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        if (match) {
          return (
            <div className="relative group/code my-2 rounded-lg overflow-hidden border border-slate-700/60">
              {/* Language badge + Copy button */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/40">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {match[1]}
                </span>
                <CopyButton text={codeString} />
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '12px 16px',
                  borderRadius: 0,
                  fontSize: '12px',
                  lineHeight: '1.6',
                  background: 'rgba(15, 23, 42, 0.8)',
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        }

        // Inline code
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 font-mono text-xs border border-violet-500/20"
            {...props}
          >
            {children}
          </code>
        );
      },
      // Styled list elements
      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1.5">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1.5">{children}</ol>,
      li: ({ children }) => <li className="text-slate-300 text-sm leading-relaxed">{children}</li>,
      // Styled headings
      h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5">{children}</h1>,
      h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-2.5 mb-1">{children}</h2>,
      h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
      // Paragraphs
      p: ({ children }) => <p className="text-sm text-slate-200 leading-relaxed my-1">{children}</p>,
      // Bold/Strong
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      // Links
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
          {children}
        </a>
      ),
      // Blockquote
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-violet-500/40 pl-3 my-2 text-slate-400 italic">
          {children}
        </blockquote>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

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

      <div className={cn('max-w-[85%] flex flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl text-sm leading-relaxed overflow-hidden',
            isUser
              ? 'px-4 py-2.5 bg-violet-600/25 border border-violet-500/30 text-white rounded-br-sm'
              : 'px-4 py-2.5 bg-slate-800/60 border border-slate-700/40 text-slate-200 rounded-bl-sm',
            msg.status === 'error' && 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          )}
        >
          {/* Agent messages → render markdown with code blocks */}
          {!isUser && msg.content ? (
            <MarkdownContent content={msg.content} />
          ) : (
            msg.content
          )}
          {/* Streaming cursor */}
          {!isUser && msg.status === 'sending' && msg.content && (
            <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
          )}
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
      <p className="text-sm font-semibold text-white">SessionFlow Code Assistant</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
        Ask me to write, debug, or explain any code. I support C#, TypeScript, Python, SQL, and more.
      </p>
    </div>
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {['Write a React hook', 'Fix this C# error', 'Explain async/await'].map((hint) => (
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
