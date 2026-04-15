import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, User as UserIcon, Mic, MicOff } from "lucide-react";
import { useCallStore } from "../../store/callStore";
import { useSignalR } from "../../providers/SignalRProvider";
import { useWebRTC } from "../../hooks/useWebRTC";
import { sounds } from "../../lib/sounds";
import { cn } from "../../lib/utils";

// ═══════════════════════════════════════════════════════════════
// Call Overlay — Global full-screen incoming/outgoing/active call UI
// Mounted in Shell.tsx, visible from any page
// ═══════════════════════════════════════════════════════════════

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const CallOverlay: React.FC = () => {
  const { status, remoteName, remoteAvatar, isOutgoing, callStartedAt, remoteUserId, reset, isMuted, toggleMute } = useCallStore();
  const { invoke } = useSignalR();
  const [elapsed, setElapsed] = useState(0);

  // Mount the WebRTC engine
  useWebRTC();

  // Timer for active call duration
  useEffect(() => {
    if (status !== "active" || !callStartedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - callStartedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, callStartedAt]);

  // Auto-dismiss "ended" state after 2s
  useEffect(() => {
    if (status === "ended") {
      const timer = setTimeout(() => reset(), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, reset]);

  const handleAccept = useCallback(() => {
    if (remoteUserId) {
      invoke("AnswerCall", remoteUserId, true).catch(console.error);
      useCallStore.getState().accepted();
      sounds.stopRingtone();
    }
  }, [invoke, remoteUserId]);

  const handleReject = useCallback(() => {
    if (remoteUserId) {
      invoke("AnswerCall", remoteUserId, false).catch(console.error);
      useCallStore.getState().rejected();
      sounds.stopRingtone();
      sounds.playCallEnd();
    }
  }, [invoke, remoteUserId]);

  const handleEnd = useCallback(() => {
    if (remoteUserId) {
      invoke("EndCall", remoteUserId).catch(console.error);
      useCallStore.getState().ended();
      sounds.playCallEnd();
    }
  }, [invoke, remoteUserId]);

  const isVisible = status !== "idle";
  const initial = remoteName?.charAt(0).toUpperCase() || "?";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />

          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={cn(
              "absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[200px] transition-colors duration-1000",
              status === "ringing" ? "bg-emerald-500/20 animate-pulse" :
              status === "calling" ? "bg-blue-500/20 animate-pulse" :
              status === "active" ? "bg-emerald-500/10" :
              "bg-red-500/20"
            )} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full px-6">
            {/* Status label */}
            <motion.p
              key={status}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.3em]",
                status === "ringing" ? "text-emerald-400" :
                status === "calling" ? "text-blue-400" :
                status === "active" ? "text-emerald-500" :
                "text-red-400"
              )}
            >
              {status === "ringing" ? "Incoming Call" :
               status === "calling" ? "Calling..." :
               status === "active" ? "Call Active" :
               "Call Ended"}
            </motion.p>

            {/* Avatar */}
            <motion.div
              animate={status === "ringing" || status === "calling" ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative"
            >
              {/* Pulse rings */}
              {(status === "ringing" || status === "calling") && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute -inset-3 rounded-full border border-emerald-500/10 animate-ping" style={{ animationDuration: "3s" }} />
                </>
              )}

              <div className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-3 transition-all duration-500",
                status === "active" ? "border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]" :
                status === "ringing" ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]" :
                "border-white/10"
              )}>
                {remoteAvatar ? (
                  <img src={remoteAvatar} alt={remoteName || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                    <span className="text-3xl font-black text-white/60">{initial}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Name */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-sora font-black text-white tracking-tight">{remoteName || "Unknown"}</h2>
              {status === "active" && callStartedAt && (
                <p className="text-sm font-mono font-bold text-emerald-400 tabular-nums">{formatDuration(elapsed)}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-6 mt-4">
              {status === "ringing" && (
                <>
                  {/* Reject */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleReject}
                    className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-shadow"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </motion.button>

                  {/* Accept */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAccept}
                    className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] transition-shadow animate-pulse"
                  >
                    <Phone className="w-7 h-7" />
                  </motion.button>
                </>
              )}

              {status === "calling" && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-shadow"
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>
              )}

              {status === "active" && (
                <>
                  {/* Mute toggle */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      isMuted 
                        ? "bg-red-500/20 border-red-500 text-red-500" 
                        : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                    )}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </motion.button>

                  {/* End call */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleEnd}
                    className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-shadow"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </motion.button>
                </>
              )}

              {status === "ended" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 rounded-full bg-slate-800 text-red-400 flex items-center justify-center"
                >
                  <PhoneMissed className="w-7 h-7" />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallOverlay;
