import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Sound Zone Definitions ──────────────────────────────────
export type SoundZone = "dashboard" | "chat" | "session" | "wallet" | "notification";

interface SoundZoneState {
  zones: Record<SoundZone, boolean>;
  masterVolume: number;
  isMuted: boolean;

  toggleZone: (zone: SoundZone) => void;
  setMasterVolume: (vol: number) => void;
  toggleMute: () => void;
  setZones: (zones: Record<SoundZone, boolean>) => void;
}

export const useSoundZoneStore = create<SoundZoneState>()(
  persist(
    (set) => ({
      zones: {
        dashboard: true,
        chat: true,
        session: true,
        wallet: true,
        notification: true,
      },
      masterVolume: 0.5,
      isMuted: false,

      toggleZone: (zone) =>
        set((s) => ({
          zones: { ...s.zones, [zone]: !s.zones[zone] },
        })),

      setMasterVolume: (vol) => set({ masterVolume: Math.max(0, Math.min(1, vol)) }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setZones: (zones) => set({ zones }),
    }),
    { name: "sessionflow-sound-zones" }
  )
);
