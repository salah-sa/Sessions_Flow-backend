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
  pendingIceCandidates: string[]; // Candidates to buffer before PC is ready
  localStream: MediaStream | null;
  isMuted: boolean;

  // Actions
  startCall: (targetUserId: string, targetName: string, targetAvatar?: string) => void;
  receiveCall: (callerId: string, callerName: string, callerAvatar?: string) => void;
  accepted: () => void;
  rejected: () => void;
  ended: () => void;
  reset: () => void;
  setRemoteSdp: (sdp: string, type: "offer" | "answer") => void;
  addIceCandidate: (candidate: string) => void;
  clearPendingIceCandidates: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
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
  pendingIceCandidates: [],
  localStream: null,
  isMuted: false,

  startCall: (targetUserId, targetName, targetAvatar) => {
    if (useCallStore.getState().status !== "idle") return;
    
    // Clear any pending reset from previous call
    const win = (window as any);
    if (win.__callResetTimeout) {
      clearTimeout(win.__callResetTimeout);
      win.__callResetTimeout = null;
    }

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
      pendingIceCandidates: [],
      isMuted: false,
    });
  },

  receiveCall: (callerId, callerName, callerAvatar) => {
    if (useCallStore.getState().status !== "idle") return;

    // Clear any pending reset from previous call
    const win = (window as any);
    if (win.__callResetTimeout) {
      clearTimeout(win.__callResetTimeout);
      win.__callResetTimeout = null;
    }

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
      pendingIceCandidates: [],
      isMuted: false,
    });
  },

  accepted: () =>
    set({ status: "active", callStartedAt: Date.now() }),

  rejected: () => {
    set({ status: "ended" });
    const win = (window as any);
    if (win.__callResetTimeout) clearTimeout(win.__callResetTimeout);
    win.__callResetTimeout = setTimeout(() => useCallStore.getState().reset(), 3000);
  },
  
  ended: () => {
    // Immediate track cleanup
    const { localStream } = useCallStore.getState();
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }

    set({ status: "ended" });
    const win = (window as any);
    if (win.__callResetTimeout) clearTimeout(win.__callResetTimeout);
    win.__callResetTimeout = setTimeout(() => useCallStore.getState().reset(), 3000);
  },

  reset: () => {
    const { localStream } = useCallStore.getState();
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    
    const win = (window as any);
    win.__callResetTimeout = null;

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
      pendingIceCandidates: [],
      localStream: null,
      isMuted: false,
    });
  },

  setRemoteSdp: (sdp, type) =>
    set({ remoteSdp: sdp, remoteSdpType: type }),

  addIceCandidate: (candidate) =>
    set((s) => ({ 
      iceCandidates: [...s.iceCandidates, candidate],
      pendingIceCandidates: [...s.pendingIceCandidates, candidate]
    })),

  clearPendingIceCandidates: () =>
    set({ pendingIceCandidates: [] }),

  setLocalStream: (stream) =>
    set({ localStream: stream }),

  toggleMute: () =>
    set((s) => {
      if (s.localStream) {
        const audioTrack = s.localStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
      }
      return { isMuted: !s.isMuted };
    }),
}));
