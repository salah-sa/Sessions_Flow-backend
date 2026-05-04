import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";
import { cn } from "../../lib/utils";
import { toggleReaction } from "../../api/newFeatures";
import { useAuthStore } from "../../store/stores";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "😮"];

interface ReactionBarProps {
  messageId: string;
  groupId: string;
  reactions?: Record<string, string[]>;
  isMe: boolean;
  onReactionsUpdate: (messageId: string, reactions: Record<string, string[]>) => void;
}

const ReactionBar: React.FC<ReactionBarProps> = ({ messageId, groupId, reactions = {}, isMe, onReactionsUpdate }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const handleReact = async (emoji: string) => {
    setIsAnimating(emoji);
    setShowPicker(false);

    // Optimistic update
    const currentUsers = reactions[emoji] || [];
    const hasReacted = userId && currentUsers.includes(userId);
    const optimistic = { ...reactions };

    if (hasReacted) {
      optimistic[emoji] = currentUsers.filter(id => id !== userId);
      if (optimistic[emoji].length === 0) delete optimistic[emoji];
    } else if (userId) {
      optimistic[emoji] = [...currentUsers, userId];
    }
    onReactionsUpdate(messageId, optimistic);

    try {
      const result = await toggleReaction(groupId, messageId, emoji);
      onReactionsUpdate(messageId, result.reactions);
    } catch {
      // Revert on error
      onReactionsUpdate(messageId, reactions);
    }

    setTimeout(() => setIsAnimating(null), 400);
  };

  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  return (
    <div className="flex flex-col gap-1">
      {/* Existing reactions */}
      {reactionEntries.length > 0 && (
        <div className={cn("flex flex-wrap gap-1", isMe && "justify-end")}>
          {reactionEntries.map(([emoji, users]) => {
            const iReacted = userId ? users.includes(userId) : false;
            return (
              <motion.button
                key={emoji}
                onClick={() => handleReact(emoji)}
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-200",
                  iReacted
                    ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/30 text-[var(--ui-accent)]"
                    : "bg-white/[0.04] border-white/10 text-slate-400 hover:bg-white/[0.08]"
                )}
              >
                <motion.span
                  animate={isAnimating === emoji ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {emoji}
                </motion.span>
                <span className="text-[9px] font-bold tabular-nums">{users.length}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Add reaction trigger */}
      <div className={cn("relative", isMe && "self-end")}>
        <button
          onClick={() => setShowPicker(p => !p)}
          className="opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-full text-slate-600 hover:text-[var(--ui-accent)] hover:bg-white/5 transition-all"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className={cn(
                "absolute z-50 flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-[#0c0c14]/95 backdrop-blur-xl border border-white/10 shadow-2xl",
                isMe ? "end-0 bottom-full mb-1" : "start-0 bottom-full mb-1"
              )}
            >
              {QUICK_EMOJIS.map(e => (
                <motion.button
                  key={e}
                  onClick={() => handleReact(e)}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.8 }}
                  className="text-lg p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReactionBar;
