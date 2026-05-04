import React, { useState } from "react";
import { Heart, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useMoodMutations } from "../../queries/usePhase3Queries";

interface MoodPulseCardProps {
  sessionId: string;
}

const MOODS = [
  { emoji: "😊", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😟", label: "Low" },
  { emoji: "😫", label: "Struggling" },
];

export const MoodPulseCard: React.FC<MoodPulseCardProps> = ({ sessionId }) => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const { submitMoodMutation } = useMoodMutations();

  const handleSelect = async (emoji: string) => {
    setSelectedEmoji(emoji);
    try {
      await submitMoodMutation.mutateAsync({ sessionId, emoji });
      setSubmitted(true);
    } catch {
      setSelectedEmoji(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent backdrop-blur-xl relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="voting"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Heart className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  Mood Check
                </h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  How are you feeling about this session?
                </p>
              </div>
            </div>

            {/* Emoji Selection */}
            <div className="flex items-center justify-between gap-2">
              {MOODS.map((mood, idx) => (
                <motion.button
                  key={mood.emoji}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                  onClick={() => handleSelect(mood.emoji)}
                  disabled={submitMoodMutation.isPending}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 flex-1",
                    selectedEmoji === mood.emoji
                      ? "bg-purple-500/10 border-purple-500/30 scale-110 ring-2 ring-purple-500/20"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:scale-105"
                  )}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">
                    {mood.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="thankyou"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Thanks!</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Your mood has been recorded
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MoodPulseCard;
