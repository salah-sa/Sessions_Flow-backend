import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Megaphone, Bell, Mail, Zap } from "lucide-react";
import { useBroadcastAlertStore } from "../../store/broadcastAlertStore";
import { cn } from "../../lib/utils";

/**
 * BroadcastAlertModal
 *
 * Center-screen modal that appears when an admin sends a broadcast.
 * Stacks multiple broadcasts and lets the user dismiss each individually.
 * Triggered by the "broadcast:message" SignalR event (Events.BROADCAST_MESSAGE).
 */
const BroadcastAlertModal: React.FC = () => {
  const alerts = useBroadcastAlertStore((s) => s.alerts);
  const dismiss = useBroadcastAlertStore((s) => s.dismiss);
  const dismissAll = useBroadcastAlertStore((s) => s.dismissAll);

  if (alerts.length === 0) return null;

  // Show only the most recent one on top
  const top = alerts[0];

  const ChannelIcon =
    top.channel === "Email" ? Mail : top.channel === "Both" ? Zap : Bell;

  const channelLabel =
    top.channel === "Email"
      ? "Email"
      : top.channel === "Both"
      ? "Email & In-App"
      : "In-App";

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="broadcast-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={() => dismiss(top.id)}
      >
        {/* Modal card — stop propagation so clicking inside doesn't close */}
        <motion.div
          key={top.id}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Glow accent strip */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-purple-400 to-pink-500" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-0.5">
                  System Broadcast
                </p>
                <h2 className="text-white font-bold text-base leading-snug line-clamp-2">
                  {top.subject}
                </h2>
              </div>
            </div>

            <button
              onClick={() => dismiss(top.id)}
              aria-label="Dismiss broadcast"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Message body */}
          <div className="px-6 pb-5">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {top.message}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <ChannelIcon className="w-3.5 h-3.5" />
              <span>Sent via {channelLabel}</span>
              {alerts.length > 1 && (
                <span className="ml-2 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-slate-400">
                  +{alerts.length - 1} more
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {alerts.length > 1 && (
                <button
                  onClick={dismissAll}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Dismiss all
                </button>
              )}
              <button
                onClick={() => dismiss(top.id)}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BroadcastAlertModal;
