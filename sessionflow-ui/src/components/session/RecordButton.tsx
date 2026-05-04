import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { recordingApi } from "../../api/premiumFeatures";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";

interface RecordButtonProps {
  sessionId: string;
  sessionStatus: "active" | "ended" | string;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ sessionId, sessionStatus }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const { on, invoke } = useSignalR();

  // Listen for other engineer's recording state
  useEffect(() => {
    const unsubs = [
      on(Events.SESSION_RECORDING_STARTED, (d: any) => {
        if (d?.sessionId === sessionId) {
          toast.info(`Recording started by ${d.engineerName}`);
        }
      }),
      on(Events.SESSION_RECORDING_STOPPED, (d: any) => {
        if (d?.sessionId === sessionId) {
          toast.info(`Recording stopped by ${d.engineerName}`);
        }
      }),
    ];
    return () => unsubs.forEach(u => u?.());
  }, [on, sessionId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);

        if (chunks.length === 0) return;

        toast.loading("Uploading recording...");
        const blob = new Blob(chunks, { type: "audio/webm" });
        try {
          await recordingApi.upload(sessionId, blob);
          await recordingApi.stop(sessionId);
          toast.dismiss();
          toast.success("Recording saved");
        } catch {
          toast.dismiss();
          toast.error("Upload failed");
        }
      };

      await recordingApi.start(sessionId);
      recorder.start(5000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  if (sessionStatus !== "active") return null;

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          "h-10 rounded-xl flex items-center gap-2 px-4 border transition-all font-black text-[9px] uppercase tracking-widest",
          isRecording
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
            : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-white hover:bg-white/5"
        )}
      >
        {isRecording ? (
          <>
            <Square className="w-3 h-3" />
            Stop
          </>
        ) : (
          <>
            <Circle className="w-3 h-3 fill-rose-400 text-rose-400" />
            Record
          </>
        )}
      </button>

      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="overflow-hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20"
          >
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-rose-400 tabular-nums">{formatTime(elapsed)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecordButton;
