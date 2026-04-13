import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    { 
      name: "sf-mute-storage",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
