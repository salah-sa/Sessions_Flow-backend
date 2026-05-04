import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Square, Crown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { transcriptionApi } from "../../api/premiumFeatures";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";

interface TranscriptionOverlayProps {
  sessionId: string;
  onTranscript: (text: string) => void;
}

export const TranscriptionOverlay: React.FC<TranscriptionOverlayProps> = ({ sessionId, onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);
  const { on } = useSignalR();

  // Listen for real-time partial transcription
  useEffect(() => {
    const unsub = on(Events.SESSION_TRANSCRIPTION, (data: { sessionId: string; partialText: string; isFinal: boolean }) => {
      if (data.sessionId !== sessionId) return;
      setPartialText(data.partialText);
      if (data.isFinal) {
        onTranscript(data.partialText);
        setPartialText("");
        setIsRecording(false);
        setIsProcessing(false);
      }
    });
    return () => unsub?.();
  }, [on, sessionId, onTranscript]);

  // ── Waveform Visualization ────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);

      ctx.clearRect(0, 0, w, h);

      // Gradient line
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, "rgba(139, 92, 246, 0.6)");
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 1)");
      gradient.addColorStop(1, "rgba(139, 92, 246, 0.6)");

      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = w / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = "rgba(139, 92, 246, 0.4)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw();
  }, []);

  // ── Start Recording ───────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });

      // Setup analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(animRef.current);
        analyserRef.current = null;

        if (chunksRef.current.length === 0) return;
        setIsProcessing(true);

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const result = await transcriptionApi.upload(sessionId, audioBlob);
          if (result.text) {
            onTranscript(result.text);
          }
        } catch {
          toast.error("Transcription failed");
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start(1000); // Chunk every 1s
      recorderRef.current = recorder;
      setIsRecording(true);
      drawWaveform();
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Mic Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
          isRecording
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
            : isProcessing
              ? "bg-white/[0.03] border-white/5 text-slate-600 cursor-wait"
              : "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <Square className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Waveform + Status */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="overflow-hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20"
          >
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <canvas
              ref={canvasRef}
              className="flex-1 h-6"
              style={{ minWidth: 100 }}
            />
            <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest shrink-0">REC</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partial transcription preview */}
      <AnimatePresence>
        {(partialText || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full mt-2 left-0 right-0 min-w-[250px] p-3 rounded-xl bg-black/80 border border-white/5 z-50"
          >
            {isProcessing && !partialText ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-[var(--ui-accent)]" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Processing audio...</span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-300 font-medium leading-relaxed italic">
                {partialText}<span className="animate-pulse text-[var(--ui-accent)]">|</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TranscriptionOverlay;
