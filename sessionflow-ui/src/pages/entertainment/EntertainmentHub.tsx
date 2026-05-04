import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lightbulb, Flame, Gamepad2, Lock, PawPrint, Palette, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  route: string;
  available: boolean;
  tag?: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: "quotes",
    title: "Quote Dojo",
    description: "Start your day with powerful wisdom. Build a streak and collect your favorites.",
    icon: <Sparkles className="w-6 h-6" />,
    gradient: "from-amber-600 to-rose-500",
    route: "/entertainment/quotes",
    available: true,
    tag: "Daily",
  },
  {
    id: "riddles",
    title: "Riddle Labyrinth",
    description: "Solve daily brain teasers, unlock hints, and compete on the weekly leaderboard.",
    icon: <Lightbulb className="w-6 h-6" />,
    gradient: "from-violet-600 to-indigo-500",
    route: "/entertainment/riddles",
    available: true,
    tag: "Daily",
  },
  {
    id: "roaster",
    title: "Procrastination Roaster",
    description: "A witty companion that roasts your idle time and nudges you back to work.",
    icon: <Flame className="w-6 h-6" />,
    gradient: "from-orange-600 to-red-500",
    route: "#",
    available: true,
    tag: "Active",
  },
  // Phase 2
  {
    id: "duel",
    title: "Brain Duel Arena",
    description: "Turn-based trivia battles with ELO ranking. Challenge friends or find a random match!",
    icon: <Swords className="w-6 h-6" />,
    gradient: "from-cyan-600 to-blue-500",
    route: "/entertainment/duel",
    available: true,
    tag: "New",
  },
  {
    id: "beast",
    title: "Focus Beast",
    description: "Raise a virtual pet that evolves as you study. Idle too long and it takes damage!",
    icon: <PawPrint className="w-6 h-6" />,
    gradient: "from-emerald-600 to-teal-500",
    route: "/entertainment/beast",
    available: true,
    tag: "New",
  },
  {
    id: "memes",
    title: "Meme Forge",
    description: "Create study-themed memes from templates, share them, and vote on the best ones.",
    icon: <Palette className="w-6 h-6" />,
    gradient: "from-pink-600 to-rose-500",
    route: "/entertainment/memes",
    available: true,
    tag: "New",
  },
];

const EntertainmentHub: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-violet-600/8 via-fuchsia-600/6 to-pink-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-8 sm:px-8 text-center shrink-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
            <Gamepad2 className="w-4 h-4 text-violet-400" />
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Entertainment Zone</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            Take a Break, Stay Sharp
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Fun, safe, and brain-boosting activities to recharge your focus.
          </p>
        </motion.div>
      </div>

      {/* Feature Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              onClick={() => feature.available && feature.route !== "#" && navigate(feature.route)}
              disabled={!feature.available || feature.route === "#"}
              className={cn(
                "group relative text-left p-6 rounded-2xl border transition-all duration-300 overflow-hidden",
                feature.available && feature.route !== "#"
                  ? "bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05] cursor-pointer"
                  : "bg-white/[0.01] border-white/[0.03] opacity-50 cursor-default"
              )}
            >
              {/* Hover glow */}
              {feature.available && feature.route !== "#" && (
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500 rounded-full",
                  feature.gradient
                )} />
              )}

              <div className="relative z-10">
                {/* Tag */}
                {feature.tag && (
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest mb-3",
                    feature.available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                  )}>
                    {feature.tag}
                  </span>
                )}

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
                  feature.available ? feature.gradient : "from-slate-700 to-slate-800",
                  "text-white"
                )}>
                  {feature.available ? feature.icon : <Lock className="w-5 h-5" />}
                </div>

                {/* Text */}
                <h3 className="text-lg font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntertainmentHub;
