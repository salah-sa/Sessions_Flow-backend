import { create } from "zustand";

export type CallStatus = "idle" | "calling" | "ringing" | "active" | "ended";

interface CallState {
  status: CallStatus;
  remoteUserId: string | null;
  remoteName: string | null;
  remoteAvatar: string | null;
  isOutgoing: boolean;
  callStartedAt: number | null;
  remoteSdp: string | null;
  remoteSdpType: "offer" | "answer" | null;
  iceCandidates: string[];

  // Actions
  startCall: (targetUserId: string, targetName: string, targetAvatar?: string) => void;
  receiveCall: (callerId: string, callerName: string, callerAvatar?: string) => void;
  accepted: () => void;
  rejected: () => void;
  ended: () => void;
  reset: () => void;
  setRemoteSdp: (sdp: string, type: "offer" | "answer") => void;
  addIceCandidate: (candidate: string) => void;
}

export const useCallStore = create<CallState>((set) => ({
  status: "idle",
  remoteUserId: null,
  remoteName: null,
  remoteAvatar: null,
  isOutgoing: false,
  callStartedAt: null,
  remoteSdp: null,
  remoteSdpType: null,
  iceCandidates: [],

  startCall: (targetUserId, targetName, targetAvatar) =>
    set({
      status: "calling",
      remoteUserId: targetUserId,
      remoteName: targetName,
      remoteAvatar: targetAvatar || null,
      isOutgoing: true,
      callStartedAt: null,
      remoteSdp: null,
      remoteSdpType: null,
      iceCandidates: [],
    }),

  receiveCall: (callerId, callerName, callerAvatar) =>
    set({
      status: "ringing",
      remoteUserId: callerId,
      remoteName: callerName,
      remoteAvatar: callerAvatar || null,
      isOutgoing: false,
      callStartedAt: null,
      remoteSdp: null,
      remoteSdpType: null,
      iceCandidates: [],
    }),

  accepted: () =>
    set({ status: "active", callStartedAt: Date.now() }),

  rejected: () => {
    set({ status: "ended" });
    setTimeout(() => useCallStore.getState().reset(), 3000);
  },
  
  ended: () => {
    set({ status: "ended" });
    setTimeout(() => useCallStore.getState().reset(), 3000);
  },

  reset: () =>
    set({
      status: "idle",
      remoteUserId: null,
      remoteName: null,
      remoteAvatar: null,
      isOutgoing: false,
      callStartedAt: null,
      remoteSdp: null,
      remoteSdpType: null,
      iceCandidates: [],
    }),

  setRemoteSdp: (sdp, type) =>
    set({ remoteSdp: sdp, remoteSdpType: type }),

  addIceCandidate: (candidate) =>
    set((s) => ({ iceCandidates: [...s.iceCandidates, candidate] })),
}));
