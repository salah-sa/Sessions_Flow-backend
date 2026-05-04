import React, { useState } from "react";
import { Heart, Pin, Copy, Flame, Trophy, BookOpen, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTodayQuote, useToggleQuoteLike, usePinQuote, useQuoteCollection } from "../../queries/useEntertainmentQueries";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

const GRADIENT_PALETTES = [
  "from-violet-600 via-fuchsia-500 to-pink-500",
  "from-cyan-600 via-blue-500 to-indigo-500",
  "from-emerald-600 via-teal-500 to-cyan-500",
  "from-amber-600 via-orange-500 to-rose-500",
  "from-rose-600 via-pink-500 to-purple-500",
];

const QuoteDojoPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useTodayQuote();
  const likeMutation = useToggleQuoteLike();
  const pinMutation = usePinQuote();
  const { data: collection } = useQuoteCollection();
  const [showCollection, setShowCollection] = useState(false);
  const [copied, setCopied] = useState(false);

  const quote = data?.quote;
  const streak = data?.streak;
  const isLiked = streak?.likedQuoteIds?.includes(quote?.id ?? "") ?? false;
  const isPinned = streak?.pinnedQuoteId === quote?.id;

  // Deterministic gradient based on day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const gradient = GRADIENT_PALETTES[dayOfYear % GRADIENT_PALETTES.length];

  const handleCopy = () => {
    if (!quote) return;
    navigator.clipboard.writeText(`"${quote.text}" — ${quote.author}`);
    setCopied(true);
    toast.success("Quote copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      {/* Background glow */}
      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br opacity-10 blur-[120px] rounded-full pointer-events-none -z-0", gradient)} />

      {/* Header */}
      <div className="px-4 py-6 sm:px-8 flex items-center justify-between gap-4 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/entertainment")} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Quote Dojo
            </h1>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Daily wisdom & motivation</p>
          </div>
        </div>

        {/* Streak badge */}
        {streak && streak.currentStreak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{streak.currentStreak}</span>
            <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest">day streak</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
        ) : !quote ? (
          <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            No quotes available yet.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Main Quote Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("relative rounded-3xl p-8 sm:p-12 bg-gradient-to-br overflow-hidden", gradient)}
            >
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6 opacity-30 select-none">"</div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="text-xl sm:text-2xl font-serif text-white leading-relaxed mb-8"
                >
                  {quote.text}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="text-sm font-bold text-white/70 uppercase tracking-widest"
                >
                  — {quote.author}
                </motion.p>
              </div>

              {/* Category pill */}
              <div className="absolute top-4 right-4 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[8px] font-bold text-white/70 uppercase tracking-widest">
                {quote.category}
              </div>
            </motion.div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => likeMutation.mutate(quote.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all",
                  isLiked
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
                )}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                {isLiked ? "Liked" : "Like"}
              </button>

              <button
                onClick={() => pinMutation.mutate(quote.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all",
                  isPinned
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30"
                )}
              >
                <Pin className="w-4 h-4" />
                {isPinned ? "Pinned" : "Pin"}
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border bg-white/5 border-white/10 text-sm font-semibold text-slate-400 hover:text-white transition-all"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Streak info */}
            {streak && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                  <p className="text-2xl font-bold text-amber-400">{streak.currentStreak}</p>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Current Streak</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                  <p className="text-2xl font-bold text-violet-400">{streak.longestStreak}</p>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Best Streak</p>
                </div>
              </div>
            )}

            {/* Collection toggle */}
            <button
              onClick={() => setShowCollection(!showCollection)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm font-semibold text-slate-400 hover:text-white transition-all"
            >
              <BookOpen className="w-4 h-4" />
              {showCollection ? "Hide Collection" : `My Collection (${collection?.length ?? 0})`}
            </button>

            {/* Collection grid */}
            <AnimatePresence>
              {showCollection && collection && collection.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {collection.map((q) => (
                    <div key={q.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                      <p className="text-sm text-slate-300 italic mb-2">"{q.text}"</p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">— {q.author}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteDojoPage;
