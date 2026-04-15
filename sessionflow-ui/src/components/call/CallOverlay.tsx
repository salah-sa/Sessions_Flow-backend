import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, Mic, MicOff, Volume2 } from "lucide-react";
import { useCallStore } from "../../store/callStore";
import { useSignalR } from "../../providers/SignalRProvider";
import { useWebRTC } from "../../hooks/useWebRTC";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
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

  // Timer for active call duration
  useEffect(() => {
    if (status !== "active" || !callStartedAt) return;
    setElapsed(0);
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

  // Outgoing call timeout (60s)
  useEffect(() => {
    if (status === "calling") {
      const timer = setTimeout(() => {
        handleEnd();
        toast.error("Call timed out: User did not answer.");
      }, 60_000);
      return () => clearTimeout(timer);
    }
  }, [status, handleEnd]);


  const isVisible = status !== "idle";
  const initial = remoteName?.charAt(0).toUpperCase() || "?";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />

          {/* Animated ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: status === "active" ? [1, 1.1, 1] : [1, 1.2, 1],
                opacity: status === "active" ? [0.15, 0.25, 0.15] : [0.2, 0.35, 0.2],
              }}
              transition={{ repeat: Infinity, duration: status === "active" ? 4 : 2, ease: "easeInOut" }}
              className={cn(
                "absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[180px]",
                status === "ringing" ? "bg-emerald-500/30" :
                status === "calling" ? "bg-blue-500/25" :
                status === "active" ? "bg-emerald-500/15" :
                "bg-red-500/25"
              )}
            />
          </div>

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full px-6"
          >
            {/* Status label */}
            <motion.div
              key={status}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              {status === "active" && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                />
              )}
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.3em]",
                status === "ringing" ? "text-emerald-400" :
                status === "calling" ? "text-blue-400" :
                status === "active" ? "text-emerald-500" :
                "text-red-400"
              )}>
                {status === "ringing" ? "Incoming Call" :
                 status === "calling" ? "Connecting..." :
                 status === "active" ? "Call Connected" :
                 "Call Ended"}
              </span>
            </motion.div>

            {/* Avatar */}
            <div className="relative">
              {/* Pulse rings for ringing/calling */}
              {(status === "ringing" || status === "calling") && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                    className={cn(
                      "absolute inset-0 rounded-full border-2",
                      status === "ringing" ? "border-emerald-500/40" : "border-blue-500/40"
                    )}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.3 }}
                    className={cn(
                      "absolute inset-0 rounded-full border",
                      status === "ringing" ? "border-emerald-500/20" : "border-blue-500/20"
                    )}
                  />
                </>
              )}

              {/* Active call audio wave indicator */}
              {status === "active" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [3, 8 + Math.random() * 8, 3] }}
                      transition={{ repeat: Infinity, duration: 0.8 + Math.random() * 0.4, delay: i * 0.1 }}
                      className="w-1 rounded-full bg-emerald-500/60"
                    />
                  ))}
                </div>
              )}

              <motion.div
                animate={status === "ringing" ? { scale: [1, 1.03, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <div className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500",
                  status === "active" ? "ring-4 ring-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)]" :
                  status === "ringing" ? "ring-4 ring-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]" :
                  status === "calling" ? "ring-4 ring-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)]" :
                  "ring-2 ring-white/10"
                )}>
                  {remoteAvatar ? (
                    <img src={remoteAvatar} alt={remoteName || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <span className="text-4xl font-black text-white/50">{initial}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Name + Duration */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-sora font-black text-white tracking-tight">{remoteName || "Unknown"}</h2>
              {status === "active" && callStartedAt && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-mono font-bold text-emerald-400 tabular-nums"
                >
                  {formatDuration(elapsed)}
                </motion.p>
              )}
              {status === "calling" && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-xs font-bold text-blue-400/80 uppercase tracking-widest"
                >
                  Waiting for answer...
                </motion.div>
              )}
              {status === "ringing" && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest flex items-center gap-2 justify-center"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Ringing...
                </motion.div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-5 mt-4">
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
                    className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] transition-shadow relative overflow-hidden"
                  >
                    <motion.div
                      animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-full bg-emerald-400"
                    />
                    <Phone className="w-7 h-7 relative z-10" />
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
                        ? "bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                        : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30"
                    )}
                    title={isMuted ? "Unmute" : "Mute"}
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
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-full bg-slate-800/80 text-red-400 flex items-center justify-center ring-2 ring-red-500/20"
                >
                  <PhoneMissed className="w-7 h-7" />
                </motion.div>
              )}
            </div>

            {/* Mute indicator label */}
            <AnimatePresence>
              {status === "active" && isMuted && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/80 flex items-center gap-1.5"
                >
                  <MicOff className="w-3 h-3" />
                  Microphone Muted
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallOverlay;
