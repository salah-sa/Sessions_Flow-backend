import { create } from "zustand";

interface NotificationPopupState {
  notification: {
    id: string;
    groupId: string;
    senderName: string;
    text: string;
    avatarUrl?: string;
  } | null;
  notify: (groupId: string, senderName: string, text: string, avatarUrl?: string) => void;
  clear: () => void;
}

export const useNotificationPopupStore = create<NotificationPopupState>((set) => ({
  notification: null,
  notify: (groupId, senderName, text, avatarUrl) => set({
    notification: { id: crypto.randomUUID(), groupId, senderName, text, avatarUrl }
  }),
  clear: () => set({ notification: null })
}));
