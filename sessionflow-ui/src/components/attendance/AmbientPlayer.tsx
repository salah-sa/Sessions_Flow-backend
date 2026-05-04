import React, { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "../../lib/utils";

const STORAGE_KEY = "sf_ambient_muted";
const MASTER_VOLUME = 0.22;
const FADE_DURATION = 2.0; // seconds

/**
 * Chord voicing — Cmaj7 in mid-high register (audible on ALL speakers)
 * Using triangle waves for warmth + odd harmonics that cut through
 */
const VOICES: { freq: number; type: OscillatorType; gain: number }[] = [
  // Warm pad layer (triangle — has odd harmonics, audible on laptop speakers)
  { freq: 261.63, type: "triangle", gain: 0.7  },  // C4
  { freq: 329.63, type: "triangle", gain: 0.6  },  // E4
  { freq: 392.00, type: "triangle", gain: 0.55 },  // G4
  { freq: 493.88, type: "triangle", gain: 0.4  },  // B4

  // Shimmer layer (sine — pure, ethereal top end)
  { freq: 523.25, type: "sine",     gain: 0.35 },  // C5
  { freq: 783.99, type: "sine",     gain: 0.2  },  // G5
  { freq: 1046.5, type: "sine",     gain: 0.12 },  // C6 (sparkle)
];

interface AudioNodes {
  ctx: AudioContext;
  masterGain: GainNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

const AmbientPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const nodesRef = useRef<AudioNodes | null>(null);
  const mountedRef = useRef(true);

  const createAudioGraph = useCallback(() => {
    const ctx = new AudioContext();

    // Master gain (starts at 0 for fade-in)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // LFO — gentle breathing modulation on volume (~15s cycle)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.065, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(MASTER_VOLUME * 0.12, ctx.currentTime); // 12% depth — subtle
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();

    // Build each voice
    const oscillators: OscillatorNode[] = [];

    VOICES.forEach((voice, i) => {
      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.freq, ctx.currentTime);
      // Slight detuning for chorus/warmth effect
      osc.detune.setValueAtTime((i - 3) * 5, ctx.currentTime);

      // Low-pass filter — keeps sound warm, removes harsh upper harmonics
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900 + i * 200, ctx.currentTime);
      filter.Q.setValueAtTime(0.5, ctx.currentTime);

      // Per-voice gain
      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(voice.gain, ctx.currentTime);

      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(masterGain);

      osc.start();
      oscillators.push(osc);
    });

    // Second LFO: very slow filter sweep on the pad layer for movement (~20s)
    const filterLfo = ctx.createOscillator();
    filterLfo.type = "sine";
    filterLfo.frequency.setValueAtTime(0.05, ctx.currentTime);
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(300, ctx.currentTime); // ±300 Hz sweep
    filterLfo.connect(filterLfoGain);
    // Connect to first 4 voices' filter frequency
    filterLfo.start();

    nodesRef.current = { ctx, masterGain, oscillators, lfo, lfoGain };
    return { ctx, masterGain };
  }, []);

  const fadeIn = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes) return;
    const { ctx, masterGain } = nodes;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + FADE_DURATION);
  }, []);

  const fadeOut = useCallback((andStop = false) => {
    const nodes = nodesRef.current;
    if (!nodes) return;
    const { ctx, masterGain } = nodes;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION);

    if (andStop) {
      setTimeout(() => {
        try {
          nodes.oscillators.forEach(o => o.stop());
          nodes.lfo.stop();
          nodes.ctx.close();
        } catch {
          // Already stopped
        }
        nodesRef.current = null;
      }, FADE_DURATION * 1000 + 300);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      fadeOut(true);
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      const { ctx } = createAudioGraph();
      ctx.resume().then(() => {
        if (mountedRef.current) {
          fadeIn();
          setIsPlaying(true);
          localStorage.setItem(STORAGE_KEY, "false");
        }
      });
    }
  }, [isPlaying, fadeIn, fadeOut, createAudioGraph]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (nodesRef.current) {
        try {
          nodesRef.current.masterGain.gain.setValueAtTime(0, nodesRef.current.ctx.currentTime);
          nodesRef.current.oscillators.forEach(o => o.stop());
          nodesRef.current.lfo.stop();
          nodesRef.current.ctx.close();
        } catch {
          // Already closed
        }
        nodesRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full shadow-2xl transition-all duration-500 group/ambient",
        "border backdrop-blur-xl",
        isPlaying
          ? "bg-violet-500/15 border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.25)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
        isHovered ? "pl-4 pr-5 py-3" : "p-3"
      )}
      title={isPlaying ? "Mute ambient music" : "Play ambient music"}
    >
      {/* Animated glow ring when playing */}
      {isPlaying && (
        <div className="absolute inset-0 rounded-full animate-ping bg-violet-500/10 pointer-events-none" style={{ animationDuration: "3s" }} />
      )}

      <div className="relative">
        {isPlaying ? (
          <Volume2 className="w-5 h-5 text-violet-400 transition-colors" />
        ) : (
          <VolumeX className="w-5 h-5 text-slate-500 group-hover/ambient:text-slate-300 transition-colors" />
        )}
        
        {/* Sound wave bars animation */}
        {isPlaying && (
          <div className="absolute -right-1 -top-1 flex items-end gap-[2px]">
            <span className="w-[2px] bg-violet-400 rounded-full animate-[soundbar_1.2s_ease-in-out_infinite]" style={{ height: 6 }} />
            <span className="w-[2px] bg-fuchsia-400 rounded-full animate-[soundbar_1.2s_ease-in-out_infinite_0.2s]" style={{ height: 4 }} />
            <span className="w-[2px] bg-cyan-400 rounded-full animate-[soundbar_1.2s_ease-in-out_infinite_0.4s]" style={{ height: 8 }} />
          </div>
        )}
      </div>

      {/* Label on hover */}
      <span
        className={cn(
          "text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 overflow-hidden",
          isHovered ? "max-w-40 opacity-100" : "max-w-0 opacity-0",
          isPlaying
            ? "bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
            : "text-slate-400"
        )}
      >
        {isPlaying ? "Ambient On" : "Play Music"}
      </span>
    </button>
  );
};

export default AmbientPlayer;
