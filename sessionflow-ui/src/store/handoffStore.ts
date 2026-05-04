import { create } from "zustand";

export interface DeviceInfo {
  connectionId: string;
  deviceLabel: string;
  browser: string;
  isCurrent: boolean;
}

export interface HandoffOffer {
  fromDevice: string;
  fromConnectionId: string;
  stateJson: string;
}

interface HandoffState {
  devices: DeviceInfo[];
  pendingOffer: HandoffOffer | null;
  isOpen: boolean;

  setDevices: (d: DeviceInfo[]) => void;
  setPendingOffer: (o: HandoffOffer | null) => void;
  setIsOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useHandoffStore = create<HandoffState>()((set) => ({
  devices: [],
  pendingOffer: null,
  isOpen: false,

  setDevices: (devices) => set({ devices }),
  setPendingOffer: (pendingOffer) => set({ pendingOffer }),
  setIsOpen: (isOpen) => set({ isOpen }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
