import React, { useState, useRef } from "react";
import { Lightbulb, Send, Trophy, ArrowLeft, Lock, Sparkles, HelpCircle, Check, X, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTodayRiddle, useSubmitRiddleAnswer, useRevealRiddleHint, useRiddleLeaderboard } from "../../queries/useEntertainmentQueries";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

const DIFFICULTY_LABELS = ["Easy", "Medium", "Hard"];
const DIFFICULTY_COLORS = ["text-emerald-400", "text-amber-400", "text-rose-400"];

const RiddleLabyrinthPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useTodayRiddle();
  const { data: leaderboard } = useRiddleLeaderboard();
  const answerMutation = useSubmitRiddleAnswer();
  const hintMutation = useRevealRiddleHint();

  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(null);
  const [revealedHint, setRevealedHint] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const riddle = data?.riddle;
  const attempt = data?.attempt;
  const isSolved = attempt?.solved ?? false;
  const isLocked = (attempt?.wrongAttempts ?? 0) >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riddle || !answer.trim() || isSolved || isLocked) return;

    answerMutation.mutate(
      { riddleId: riddle.id, answer: answer.trim() },
      {
        onSuccess: (res) => {
          if (res.correct) {
            setShowResult("correct");
            toast.success(`Correct! +${res.score} points 🎉`);
          } else {
            setShowResult("wrong");
            setTimeout(() => setShowResult(null), 1500);
          }
          setAnswer("");
        },
        onError: (err: any) => {
          toast.error(err.message || "Something went wrong");
        },
      }
    );
  };

  const handleHint = () => {
    if (!riddle) return;
    hintMutation.mutate(riddle.id, {
      onSuccess: (res) => {
        if (res.hint) {
          setRevealedHint(res.hint);
          toast.info("Hint revealed! (Score reduced)");
        } else {
          toast.warning("No more hints available");
        }
      },
    });
  };

  const scorePreview = (attempt?.hintsUsed ?? 0) === 0 ? 100 : (attempt?.hintsUsed ?? 0) === 1 ? 75 : (attempt?.hintsUsed ?? 0) === 2 ? 50 : 25;

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/10 via-violet-600/10 to-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-0" />

      {/* Header */}
      <div className="px-4 py-6 sm:px-8 flex items-center justify-between gap-4 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/entertainment")} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-violet-400" />
              Riddle Labyrinth
            </h1>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Daily brain challenge</p>
          </div>
        </div>

        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
            showLeaderboard
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-amber-400"
          )}
        >
          <Trophy className="w-4 h-4" />
          Leaderboard
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          </div>
        ) : showLeaderboard ? (
          /* Leaderboard View */
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-lg font-bold text-white mb-4">Weekly Top Solvers</h2>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-12">No solvers this week yet. Be the first!</div>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={entry.userId} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                    i === 0 ? "bg-amber-500/20 text-amber-400" :
                    i === 1 ? "bg-slate-400/20 text-slate-300" :
                    i === 2 ? "bg-orange-500/20 text-orange-400" :
                    "bg-white/5 text-slate-500"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{entry.displayName || `User ${entry.userId.slice(0, 6)}`}</p>
                    <p className="text-[10px] text-slate-500">{entry.riddlesSolved} riddles solved</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-violet-400">{entry.totalScore}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : !riddle ? (
          <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            No riddle available today. Check back tomorrow!
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Riddle Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl p-8 bg-gradient-to-br from-indigo-950/50 to-violet-950/50 border border-indigo-500/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
              <div className="relative z-10">
                {/* Difficulty + score preview */}
                <div className="flex items-center justify-between mb-6">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", DIFFICULTY_COLORS[riddle.difficulty - 1])}>
                    {DIFFICULTY_LABELS[riddle.difficulty - 1]}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {isSolved ? `Score: ${attempt?.score}` : `Max: ${scorePreview} pts`}
                  </span>
                </div>

                {/* Riddle text */}
                <p className="text-lg sm:text-xl text-white leading-relaxed font-medium mb-8 text-center">
                  {riddle.text}
                </p>

                {/* Solved badge */}
                <AnimatePresence>
                  {isSolved && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-emerald-400">Solved! +{attempt?.score} pts</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Locked badge */}
                {isLocked && !isSolved && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-rose-400" />
                    </div>
                    <p className="text-sm font-bold text-rose-400">Locked — too many attempts</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Answer form */}
            {!isSolved && !isLocked && (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className={cn(
                      "w-full px-5 py-4 rounded-xl bg-white/5 border text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 transition-all",
                      showResult === "wrong"
                        ? "border-rose-500/50 focus:ring-rose-500/30 animate-[shake_0.5s_ease-in-out]"
                        : "border-white/10 focus:ring-violet-500/30"
                    )}
                    autoComplete="off"
                  />
                  {showResult === "wrong" && (
                    <X className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-400 animate-pulse" />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!answer.trim() || answerMutation.isPending}
                  className="px-6 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Hints + Status */}
            {!isSolved && !isLocked && (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleHint}
                  disabled={hintMutation.isPending || (attempt?.hintsUsed ?? 0) >= riddle.hintCount}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm font-semibold text-amber-400 hover:bg-amber-500/15 transition-all disabled:opacity-30"
                >
                  <HelpCircle className="w-4 h-4" />
                  Hint ({attempt?.hintsUsed ?? 0}/{riddle.hintCount})
                </button>

                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  <span>Attempts: {attempt?.wrongAttempts ?? 0}/5</span>
                </div>
              </div>
            )}

            {/* Revealed hint */}
            <AnimatePresence>
              {revealedHint && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-5 py-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-300/80">{revealedHint}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiddleLabyrinthPage;
