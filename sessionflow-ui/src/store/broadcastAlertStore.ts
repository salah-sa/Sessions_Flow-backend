import { create } from "zustand";

export interface BroadcastAlert {
  id: string;
  subject: string;
  message: string;
  channel: string;
  receivedAt: number;
}

interface BroadcastAlertState {
  alerts: BroadcastAlert[];
  push: (subject: string, message: string, channel: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useBroadcastAlertStore = create<BroadcastAlertState>((set) => ({
  alerts: [],

  push: (subject, message, channel) => {
    const alert: BroadcastAlert = {
      id: crypto.randomUUID(),
      subject,
      message,
      channel,
      receivedAt: Date.now(),
    };
    set((s) => ({ alerts: [alert, ...s.alerts] }));
  },

  dismiss: (id) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  dismissAll: () => set({ alerts: [] }),
}));
