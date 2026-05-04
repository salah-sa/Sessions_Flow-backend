import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Zap, Star, Shield, Pencil, Check, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useFocusBeast, useFeedBeast, useRenameBeast } from "../../queries/useEntertainmentQueries";

const STAGE_INFO: Record<string, { bg: string; glow: string; desc: string }> = {
  egg:       { bg: "from-slate-700 to-slate-800",   glow: "from-slate-500/10", desc: "Your beast awaits birth. Start studying to hatch it!" },
  hatchling: { bg: "from-yellow-700 to-amber-800",  glow: "from-yellow-500/10", desc: "A tiny creature emerges! Keep going to help it grow." },
  juvenile:  { bg: "from-blue-700 to-indigo-800",   glow: "from-blue-500/10", desc: "Growing stronger! Your beast is becoming a real companion." },
  warrior:   { bg: "from-red-700 to-rose-800",      glow: "from-red-500/10", desc: "A fierce warrior! Your dedication is paying off." },
  legend:    { bg: "from-violet-700 to-purple-800",  glow: "from-violet-500/10", desc: "LEGENDARY! Your beast has reached its ultimate form!" },
};

const FocusBeastPage: React.FC = () => {
  const { data: beast, isLoading } = useFocusBeast();
  const feedBeast = useFeedBeast();
  const renameBeast = useRenameBeast();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [feedAmount, setFeedAmount] = useState(10);

  if (isLoading) return <div className="h-full flex items-center justify-center text-slate-500">Loading your beast...</div>;
  if (!beast) return null;

  const info = STAGE_INFO[beast.stage] || STAGE_INFO.egg;
  const healthPct = beast.maxHealth > 0 ? (beast.health / beast.maxHealth) * 100 : 0;
  const xpToNext = 500 - (beast.experience % 500);
  const xpPct = ((beast.experience % 500) / 500) * 100;

  const handleRename = () => {
    if (newName.trim()) renameBeast.mutate(newName.trim());
    setEditing(false);
    setNewName("");
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      <div className={cn("absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-br blur-[140px] rounded-full pointer-events-none", info.glow)} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar relative z-10">
        <div className="max-w-md mx-auto space-y-6">

          {/* Beast Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={cn("rounded-2xl p-8 text-center bg-gradient-to-br border border-white/10 relative overflow-hidden", info.bg)}>

            {/* Avatar */}
            <motion.div className="text-7xl mb-4"
              animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
              {beast.avatar}
            </motion.div>

            {/* Name */}
            <div className="flex items-center justify-center gap-2 mb-1">
              {editing ? (
                <div className="flex items-center gap-1">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={beast.name}
                    className="bg-black/30 border border-white/20 rounded-lg px-3 py-1 text-sm text-white w-32 text-center outline-none" autoFocus />
                  <button onClick={handleRename} className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditing(false)} className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white">{beast.name}</h2>
                  <button onClick={() => { setEditing(true); setNewName(beast.name); }} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-white/50" />
                  </button>
                </>
              )}
            </div>

            <p className="text-xs text-white/60 capitalize mb-1">Stage: {beast.stage}</p>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white/80">
              <Star className="w-3 h-3" /> Level {beast.level}
            </div>

            <p className="text-[11px] text-white/50 mt-3 max-w-xs mx-auto">{info.desc}</p>
          </motion.div>

          {/* Health Bar */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <Heart className="w-3.5 h-3.5" /> Health
              </div>
              <span className="text-xs text-slate-400">{beast.health}/{beast.maxHealth}</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${healthPct}%` }} transition={{ duration: 0.8 }}
                className={cn("h-full rounded-full", healthPct > 60 ? "bg-emerald-500" : healthPct > 30 ? "bg-amber-500" : "bg-red-500")} />
            </div>
          </div>

          {/* XP Bar */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400">
                <Zap className="w-3.5 h-3.5" /> Experience
              </div>
              <span className="text-xs text-slate-400">{xpToNext} XP to next level</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Total: {beast.experience} XP · {beast.totalFocusMinutes} min focused</p>
          </div>

          {/* Feed Section */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Shield className="w-3.5 h-3.5" /> Feed Your Beast
            </div>
            <p className="text-[11px] text-slate-500">Log your focus time to earn XP and heal your beast.</p>
            <div className="flex gap-2">
              {[5, 10, 15, 25, 30].map((m) => (
                <button key={m} onClick={() => setFeedAmount(m)}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all border",
                    feedAmount === m ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/5 text-slate-500")}>
                  {m}m
                </button>
              ))}
            </div>
            <button onClick={() => feedBeast.mutate(feedAmount)} disabled={feedBeast.isPending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {feedBeast.isPending ? "Feeding..." : `Feed ${feedAmount} Minutes (+${feedAmount * 10} XP)`}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Idle Damage Today", value: beast.idleDamageToday, color: "text-red-400" },
              { label: "Total Focus", value: `${beast.totalFocusMinutes}m`, color: "text-cyan-400" },
              { label: "Total XP", value: beast.experience, color: "text-violet-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusBeastPage;
