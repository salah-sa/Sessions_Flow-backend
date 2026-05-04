import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSoundZoneStore, type SoundZone } from "../store/soundZoneStore";

// ── Route → Zone mapping ────────────────────────────────────
function routeToZone(pathname: string): SoundZone {
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/sessions")) return "session";
  if (pathname.startsWith("/wallet")) return "wallet";
  return "dashboard";
}

// ── Context ─────────────────────────────────────────────────
interface SoundZoneContextValue {
  playOneShot: (sound: "click" | "chime" | "ding" | "notify") => void;
}

const SoundZoneContext = createContext<SoundZoneContextValue>({
  playOneShot: () => {},
});

export const useSoundZone = () => useContext(SoundZoneContext);

// ── Provider ────────────────────────────────────────────────
export const SoundZoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const location = useLocation();
  const { zones, masterVolume, isMuted } = useSoundZoneStore();
  const currentZone = routeToZone(location.pathname);

  // Lazy-init AudioContext on first user gesture
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Generate a simple tone (no audio file dependency)
  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = "sine") => {
    if (isMuted) return;
    const zone = routeToZone(location.pathname);
    if (!zones[zone]) return;

    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(masterVolume * 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext not available
    }
  }, [isMuted, zones, masterVolume, getCtx, location.pathname]);

  // One-shot sound effects
  const playOneShot = useCallback((sound: "click" | "chime" | "ding" | "notify") => {
    switch (sound) {
      case "click": playTone(800, 0.08, "square"); break;
      case "chime": playTone(1200, 0.3, "sine"); break;
      case "ding": playTone(660, 0.2, "triangle"); break;
      case "notify": playTone(440, 0.15, "sine"); break;
    }
  }, [playTone]);

  return (
    <SoundZoneContext.Provider value={{ playOneShot }}>
      {children}
    </SoundZoneContext.Provider>
  );
};

export default SoundZoneProvider;
