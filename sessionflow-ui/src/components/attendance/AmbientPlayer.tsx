import React, { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "../../lib/utils";

const STORAGE_KEY = "sf_ambient_muted";
const MASTER_VOLUME = 0.06;
const FADE_DURATION = 1.5; // seconds

// Chord frequencies: Cmaj7 spread voicing — warm, calm, non-intrusive
const CHORD_FREQUENCIES = [
  130.81,  // C3
  164.81,  // E3
  196.00,  // G3
  246.94,  // B3
  261.63,  // C4
];

interface AudioNodes {
  ctx: AudioContext;
  masterGain: GainNode;
  oscillators: OscillatorNode[];
  filters: BiquadFilterNode[];
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

const AmbientPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const nodesRef = useRef<AudioNodes | null>(null);
  const mountedRef = useRef(true);

  // Check localStorage for saved preference
  const savedMuted = typeof window !== "undefined"
    ? localStorage.getItem(STORAGE_KEY) !== "false" // Default: muted (true)
    : true;

  const createAudioGraph = useCallback(() => {
    const ctx = new AudioContext();

    // Master gain (starts at 0 for fade-in)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // LFO for gentle breathing effect on volume
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // Very slow ~12s cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(MASTER_VOLUME * 0.3, ctx.currentTime); // Subtle modulation depth

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();

    const oscillators: OscillatorNode[] = [];
    const filters: BiquadFilterNode[] = [];

    CHORD_FREQUENCIES.forEach((freq, i) => {
      // Each voice: slightly detuned for warmth
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime((i - 2) * 4, ctx.currentTime); // Slight spread

      // Individual low-pass filter per voice
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350 + i * 60, ctx.currentTime); // Graduated warmth
      filter.Q.setValueAtTime(0.7, ctx.currentTime);

      // Per-voice gain (quieter for higher partials)
      const voiceGain = ctx.createGain();
      const vol = i < 2 ? 1.0 : i < 4 ? 0.6 : 0.35;
      voiceGain.gain.setValueAtTime(vol, ctx.currentTime);

      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(masterGain);

      osc.start();
      oscillators.push(osc);
      filters.push(filter);
    });

    // Add a second layer: very quiet triangle wave at sub-bass for depth
    const subOsc = ctx.createOscillator();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(65.41, ctx.currentTime); // C2 sub
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.15, ctx.currentTime);
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = "lowpass";
    subFilter.frequency.setValueAtTime(120, ctx.currentTime);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start();
    oscillators.push(subOsc);
    filters.push(subFilter);

    nodesRef.current = { ctx, masterGain, oscillators, filters, lfo, lfoGain };

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
      }, FADE_DURATION * 1000 + 200);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      // Fade out and stop
      fadeOut(true);
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      // Create graph and fade in
      const { ctx } = createAudioGraph();
      // Resume in case of browser autoplay suspension
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
