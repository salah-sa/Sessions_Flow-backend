import { create } from "zustand";
import { persist } from "zustand/middleware";

// ═══════════════════════════════════════════════════════════
// Per-Group Notification Mute Store
// ═══════════════════════════════════════════════════════════
// Persisted to localStorage. Survives page refresh.
// Muted groups receive silent badge updates only — no sound, no toast.

interface MuteState {
  mutedGroupIds: string[];
  toggleMute: (groupId: string) => void;
  isMuted: (groupId: string) => boolean;
}

export const useMuteStore = create<MuteState>()(
  persist(
    (set, get) => ({
      mutedGroupIds: [],

      toggleMute: (groupId) =>
        set((s) => {
          const exists = s.mutedGroupIds.includes(groupId);
          return {
            mutedGroupIds: exists
              ? s.mutedGroupIds.filter((id) => id !== groupId)
              : [...s.mutedGroupIds, groupId],
          };
        }),

      isMuted: (groupId) => get().mutedGroupIds.includes(groupId),
    }),
    { name: "sf-mute-storage" }
  )
);
