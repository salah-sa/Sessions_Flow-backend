import { create } from "zustand";

interface NotificationItem {
  id: string;
  groupId: string;
  senderName: string;
  text: string;
  avatarUrl?: string;
  timestamp: number;
}

interface NotificationPopupState {
  // Stack of notifications (newest first)
  notifications: NotificationItem[];
  // Legacy single-notification compat
  notification: NotificationItem | null;

  notify: (groupId: string, senderName: string, text: string, avatarUrl?: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
  clearAll: () => void;
}

const MAX_VISIBLE = 3; // Max stacked notifications shown at once

export const useNotificationPopupStore = create<NotificationPopupState>((set, get) => ({
  notifications: [],
  notification: null,

  notify: (groupId, senderName, text, avatarUrl) => {
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      groupId,
      senderName,
      text,
      avatarUrl,
      timestamp: Date.now(),
    };

    set((s) => {
      // Keep only the most recent MAX_VISIBLE notifications
      const updated = [item, ...s.notifications].slice(0, MAX_VISIBLE);
      return {
        notifications: updated,
        notification: updated[0] || null, // Compat with single-notification consumers
      };
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      get().dismiss(item.id);
    }, 5000);
  },

  dismiss: (id) =>
    set((s) => {
      const updated = s.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        notification: updated[0] || null,
      };
    }),

  clear: () => set({ notifications: [], notification: null }),
  clearAll: () => set({ notifications: [], notification: null }),
}));
