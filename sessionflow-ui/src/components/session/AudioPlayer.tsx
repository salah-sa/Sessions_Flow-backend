import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, Volume2, Crown, Download, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useSessionRecordings } from "../../queries/usePhase4Queries";
import type { SessionRecording } from "../../api/premiumFeatures";

interface AudioPlayerProps {
  sessionId: string;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ sessionId }) => {
  const { data, isLoading } = useSessionRecordings(sessionId);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const recordings = data?.recordings || [];
  const activeRec = recordings[activeIdx];

  // ── Waveform visualization (fake waveform from playback) ──
  const drawStaticWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const barCount = Math.floor(w / 4);
    const barWidth = 2;
    const gap = 2;
    const progress = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < barCount; i++) {
      // Procedural "waveform" height from hash
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const barH = (Math.abs(seed % 1) * 0.7 + 0.3) * (h * 0.8);
      const x = i * (barWidth + gap);
      const y = (h - barH) / 2;

      const isPast = (i / barCount) <= progress;
      ctx.fillStyle = isPast ? "rgba(139, 92, 246, 0.6)" : "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(x, y, barWidth, barH);
    }
  }, [currentTime, duration]);

  useEffect(() => {
    drawStaticWaveform();
  }, [drawStaticWaveform]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => setCurrentTime(audio.currentTime);
    const handleDuration = () => setDuration(audio.duration || 0);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleDuration);
    audio.addEventListener("ended", handleEnd);

    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleDuration);
      audio.removeEventListener("ended", handleEnd);
    };
  }, [activeIdx]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !activeRec) return;
    if (isPlaying) { audio.pause(); } else { audio.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const handleSpeedCycle = () => {
    const nextIdx = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length;
    const newSpeed = SPEEDS[nextIdx];
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/5 bg-black/20">
        <Volume2 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No recordings available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      {activeRec && <audio ref={audioRef} src={activeRec.mediaUrl} preload="metadata" />}

      {/* Player */}
      <div className="p-5 rounded-2xl border border-white/5 bg-black/20">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Session Recording</span>
        </div>

        {/* Waveform */}
        <canvas
          ref={canvasRef}
          className="w-full h-16 rounded-xl cursor-pointer mb-3"
          onClick={handleScrub}
        />

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}
              className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={togglePlay}
              className="w-11 h-11 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20 transition-all">
              {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 ml-0.5" />}
            </button>
            <button onClick={handleSpeedCycle}
              className="h-9 px-3 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-black text-slate-400 hover:text-white transition-all">
              {speed}×
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Recording List */}
      {recordings.length > 1 && (
        <div className="space-y-1">
          {recordings.map((rec, idx) => (
            <button
              key={rec.id}
              onClick={() => { setActiveIdx(idx); setIsPlaying(false); }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                activeIdx === idx
                  ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/15"
                  : "bg-transparent border-transparent hover:bg-white/[0.02]"
              )}
            >
              <Volume2 className={cn("w-3.5 h-3.5 shrink-0", activeIdx === idx ? "text-[var(--ui-accent)]" : "text-slate-600")} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">Recording {idx + 1}</p>
                <p className="text-[8px] font-bold text-slate-600">{new Date(rec.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                <Clock className="w-2.5 h-2.5" />
                {Math.ceil(rec.duration / 60)}m
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
