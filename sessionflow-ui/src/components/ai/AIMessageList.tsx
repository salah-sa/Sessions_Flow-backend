import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Copy, Check, Terminal, Code2, Sparkles, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAIAgentStore, type AIMessage } from '../../store/stores';
import { cn } from '../../lib/utils';

// ─── Language display names ───────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  js: 'JavaScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  py: 'Python', python: 'Python', cs: 'C#', csharp: 'C#',
  java: 'Java', go: 'Go', rust: 'Rust', rb: 'Ruby', ruby: 'Ruby',
  sql: 'SQL', bash: 'Bash', sh: 'Shell', powershell: 'PowerShell',
  html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', yaml: 'YAML',
  xml: 'XML', dockerfile: 'Dockerfile', markdown: 'Markdown', md: 'Markdown',
  cpp: 'C++', c: 'C', swift: 'Swift', kotlin: 'Kotlin', dart: 'Dart',
  php: 'PHP', lua: 'Lua', r: 'R', graphql: 'GraphQL',
};

const getLangLabel = (lang: string) => LANG_LABELS[lang.toLowerCase()] ?? lang.toUpperCase();

// ─── Copy Button for Code Blocks ──────────────────────────────────────────────
const CopyButton: React.FC<{ text: string; variant?: 'block' | 'inline' }> = ({ text, variant = 'block' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [text]);

  if (variant === 'inline') {
    return (
      <button
        onClick={handleCopy}
        className={cn(
          'ml-1 px-1 py-0.5 rounded text-[9px] font-mono transition-all duration-200 inline-flex items-center gap-0.5',
          copied ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
        )}
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200',
        copied
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/60 border border-slate-600/40'
      )}
      title={copied ? 'Copied!' : 'Copy code'}
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

// ─── Markdown Renderer with Premium Code Blocks ────────────────────────────────
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    components={{
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      code({ node, className, children, ref, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        if (match) {
          const lineCount = codeString.split('\n').length;
          return (
            <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/60 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
              {/* ── Header bar: language + line count + copy ── */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                    {getLangLabel(match[1])}
                  </span>
                  <span className="text-[9px] text-slate-600 ml-1">
                    {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                  </span>
                </div>
                <CopyButton text={codeString} />
              </div>

              {/* ── Code body ── */}
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                showLineNumbers={lineCount > 3}
                lineNumberStyle={{
                  color: '#3b4252',
                  fontSize: '10px',
                  paddingRight: '12px',
                  minWidth: '2.5em',
                  userSelect: 'none',
                }}
                customStyle={{
                  margin: 0,
                  padding: '14px 16px',
                  borderRadius: 0,
                  fontSize: '12.5px',
                  lineHeight: '1.7',
                  background: '#0d1117',
                  overflowX: 'auto',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, monospace',
                  }
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        }

        // ── Inline code ──
        return (
          <code
            className="px-1.5 py-0.5 rounded-md bg-[#1e1e2e] text-violet-300 font-mono text-[12px] border border-violet-500/15"
            {...props}
          >
            {children}
          </code>
        );
      },
      // ── Lists ──
      ul: ({ children }) => <ul className="list-disc list-outside pl-5 space-y-1 my-2">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-outside pl-5 space-y-1 my-2">{children}</ol>,
      li: ({ children }) => <li className="text-slate-300 text-[13px] leading-relaxed pl-0.5">{children}</li>,
      // ── Headings ──
      h1: ({ children }) => <h1 className="text-[15px] font-bold text-white mt-4 mb-2 flex items-center gap-1.5">{children}</h1>,
      h2: ({ children }) => <h2 className="text-[14px] font-bold text-white mt-3 mb-1.5">{children}</h2>,
      h3: ({ children }) => <h3 className="text-[13px] font-semibold text-slate-200 mt-2.5 mb-1">{children}</h3>,
      // ── Paragraphs ──
      p: ({ children }) => <p className="text-[13px] text-slate-200 leading-[1.75] my-1.5">{children}</p>,
      // ── Bold ──
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      // ── Italic ──
      em: ({ children }) => <em className="text-slate-300 italic">{children}</em>,
      // ── Links ──
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 underline underline-offset-2 decoration-violet-500/40 hover:decoration-violet-400/60 transition-colors"
        >
          {children}
        </a>
      ),
      // ── Blockquote ──
      blockquote: ({ children }) => (
        <blockquote className="border-l-[3px] border-violet-500/40 pl-3.5 my-2.5 py-0.5 bg-violet-500/5 rounded-r-lg text-slate-400 italic">
          {children}
        </blockquote>
      ),
      // ── Horizontal rule ──
      hr: () => <hr className="border-none h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent my-4" />,
      // ── Table ──
      table: ({ children }) => (
        <div className="overflow-x-auto my-3 rounded-lg border border-slate-700/50">
          <table className="w-full text-[12px]">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-slate-800/80 text-slate-300">{children}</thead>,
      th: ({ children }) => <th className="px-3 py-2 text-left font-semibold border-b border-slate-700/50">{children}</th>,
      td: ({ children }) => <td className="px-3 py-2 text-slate-400 border-b border-slate-800/50">{children}</td>,
    }}
  >
    {content}
  </ReactMarkdown>
);

// ─── Typing Indicator ────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-3 justify-start">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.15)]">
      <Bot className="w-4 h-4 text-violet-400" />
    </div>
    <div className="px-5 py-3.5 rounded-2xl rounded-bl-md bg-[#141926] border border-slate-700/40">
      <div className="flex gap-1.5 items-center h-5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-violet-400/80"
            animate={{ y: ['0%', '-60%', '0%'], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─── Single Message Bubble ────────────────────────────────────────────────────
const MessageBubble: React.FC<{ msg: AIMessage; isLatest: boolean }> = ({ msg, isLatest }) => {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn('flex items-start gap-3 group', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Agent avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/25 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(139,92,246,0.12)]">
          <Bot className="w-4 h-4 text-violet-400" />
        </div>
      )}

      <div className={cn('max-w-[88%] flex flex-col gap-0.5', isUser && 'items-end')}>
        {/* Role label */}
        <span className={cn(
          'text-[10px] font-medium px-0.5 mb-0.5',
          isUser ? 'text-indigo-400/60' : 'text-violet-400/60'
        )}>
          {isUser ? 'You' : 'AI Assistant'}
        </span>

        <div
          className={cn(
            'rounded-2xl text-[13px] leading-relaxed overflow-hidden',
            isUser
              ? 'px-4 py-3 bg-gradient-to-br from-violet-600/20 to-indigo-600/15 border border-violet-500/25 text-white rounded-br-md'
              : 'px-4 py-3 bg-[#141926] border border-slate-700/35 text-slate-200 rounded-bl-md',
            msg.status === 'error' && 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          )}
        >
          {/* Agent messages → render markdown with code blocks */}
          {!isUser && msg.content ? (
            <MarkdownContent content={msg.content} />
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
          {/* Streaming cursor */}
          {!isUser && msg.status === 'sending' && msg.content && isLatest && (
            <motion.span
              className="inline-block w-[3px] h-[16px] bg-violet-400 ml-1 rounded-sm align-text-bottom"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-slate-600/80 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {msg.status === 'error' && ' · Failed'}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/25 flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-indigo-300">
          U
        </div>
      )}
    </motion.div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10 px-6 text-center">
    {/* Animated icon */}
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className="relative"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 border border-violet-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.12)]">
        <Code2 className="w-9 h-9 text-violet-400" />
      </div>
      <motion.div
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles className="w-2.5 h-2.5 text-violet-400" />
      </motion.div>
    </motion.div>

    <div>
      <p className="text-[15px] font-bold text-white tracking-tight">Code Assistant</p>
      <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed max-w-[260px]">
        Write, debug, and explain code. Supports C#, TypeScript, Python, SQL, and 50+ languages.
      </p>
    </div>

    {/* Quick action chips */}
    <div className="flex flex-wrap gap-2 justify-center mt-1">
      {[
        { icon: <Zap className="w-3 h-3" />, label: 'Write a React hook' },
        { icon: <Terminal className="w-3 h-3" />, label: 'Debug C# error' },
        { icon: <Code2 className="w-3 h-3" />, label: 'Explain async/await' },
      ].map(({ icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-200 cursor-default"
        >
          {icon}
          {label}
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
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar min-h-0">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id} msg={msg} isLatest={idx === messages.length - 1} />
          ))}
          <AnimatePresence>
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
