import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, TrendingUp, Clock, ChevronRight, Zap, Target, Crown } from "lucide-react";
import { cn } from "../../lib/utils";
import { useDuelStats, useDuelLeaderboard, useDuelHistory, useCreateDuel, useJoinDuel } from "../../queries/useEntertainmentQueries";

type Tab = "play" | "leaderboard" | "history";

const BrainDuelPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("play");
  const { data: stats } = useDuelStats();
  const { data: leaderboard } = useDuelLeaderboard();
  const { data: history } = useDuelHistory();
  const createDuel = useCreateDuel();
  const joinDuel = useJoinDuel();
  const [subject, setSubject] = useState("general");

  const subjects = ["general", "math", "science", "language", "history"];
  const winRate = stats && stats.totalDuels > 0 ? Math.round((stats.wins / stats.totalDuels) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-cyan-600/8 via-blue-600/6 to-indigo-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-6 sm:px-8 shrink-0 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
            <Swords className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Brain Duel Arena</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Challenge Your Mind</h1>
          <p className="text-xs text-slate-500">Turn-based trivia battles. Create or join a duel!</p>
        </motion.div>
      </div>

      {/* Stats Bar */}
      {stats && stats.totalDuels > 0 && (
        <div className="px-4 sm:px-8 mb-4 relative z-10">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Rating", value: stats.rating, icon: <Zap className="w-3.5 h-3.5" />, color: "text-amber-400" },
              { label: "Wins", value: stats.wins, icon: <Trophy className="w-3.5 h-3.5" />, color: "text-emerald-400" },
              { label: "Win Rate", value: `${winRate}%`, icon: <Target className="w-3.5 h-3.5" />, color: "text-cyan-400" },
              { label: "Streak", value: stats.currentWinStreak, icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-violet-400" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                <div className={cn("flex items-center justify-center gap-1 mb-1", s.color)}>
                  {s.icon}
                  <span className="text-lg font-bold">{s.value}</span>
                </div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 sm:px-8 mb-4 relative z-10">
        <div className="flex gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
          {(["play", "leaderboard", "history"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize",
                tab === t ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          {tab === "play" && (
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-4">
              {/* Subject selector */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400">Choose Subject</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button key={s} onClick={() => setSubject(s)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border",
                        subject === s ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/10")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => createDuel.mutate(subject)} disabled={createDuel.isPending}
                  className="group p-6 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-600/10 border border-cyan-500/20 hover:border-cyan-500/30 transition-all text-left">
                  <Swords className="w-8 h-8 text-cyan-400 mb-3" />
                  <p className="text-sm font-bold text-white mb-1">Create Duel</p>
                  <p className="text-[10px] text-slate-500">Start a match & wait for an opponent</p>
                </button>
                <button onClick={() => joinDuel.mutate(undefined)} disabled={joinDuel.isPending}
                  className="group p-6 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/20 hover:border-violet-500/30 transition-all text-left">
                  <Target className="w-8 h-8 text-violet-400 mb-3" />
                  <p className="text-sm font-bold text-white mb-1">Quick Match</p>
                  <p className="text-[10px] text-slate-500">Join an existing open duel</p>
                </button>
              </div>

              {(createDuel.isSuccess || joinDuel.isSuccess) && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-sm font-semibold text-emerald-400">
                    {createDuel.isSuccess ? "Duel created! Waiting for opponent..." : "Joined! Duel is now active!"}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {tab === "leaderboard" && (
            <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-2">
              {leaderboard?.map((entry, i) => (
                <div key={entry.userId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                    i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-slate-500")}>
                    {i < 3 ? <Crown className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Player {entry.userId.slice(0, 6)}</p>
                    <p className="text-[10px] text-slate-500">{entry.wins}W / {entry.losses}L</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-cyan-400">{entry.rating}</p>
                    <p className="text-[9px] text-slate-500">ELO</p>
                  </div>
                </div>
              ))}
              {(!leaderboard || leaderboard.length === 0) && (
                <div className="text-center py-12 text-slate-500 text-sm">No duels completed yet. Be the first!</div>
              )}
            </motion.div>
          )}

          {tab === "history" && (
            <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-2">
              {history?.map((m) => (
                <div key={m.id} className={cn("flex items-center gap-3 p-3 rounded-xl border",
                  m.isWinner ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10")}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                    m.isWinner ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                    {m.isWinner ? <Trophy className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white capitalize">{m.subject} Duel</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(m.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", m.isWinner ? "text-emerald-400" : "text-red-400")}>
                      {m.isChallenger ? m.challengerScore : m.opponentScore} - {m.isChallenger ? m.opponentScore : m.challengerScore}
                    </p>
                    <p className="text-[9px] text-slate-500">{m.isWinner ? "Victory" : "Defeat"}</p>
                  </div>
                </div>
              ))}
              {(!history || history.length === 0) && (
                <div className="text-center py-12 text-slate-500 text-sm">No duels yet. Start your first battle!</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BrainDuelPage;
