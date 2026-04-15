import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "../store/callStore";
import { useSignalR } from "../providers/SignalRProvider";

// ═══════════════════════════════════════════════════════════
// useWebRTC — WebRTC Voice Call Media Engine
// ═══════════════════════════════════════════════════════════
// Owns the RTCPeerConnection lifecycle.
// Reacts to callStore state transitions to:
//  1. Create PeerConnection + acquire mic   (status → active)
//  2. Exchange SDP offer/answer             (remoteSdp changes)
//  3. Trickle ICE candidates                (iceCandidates changes)
//  4. Tear down everything                  (status → ended/idle)
//
// IMPORTANT: All store reads inside async/event callbacks use
// useCallStore.getState() to avoid stale closures.
// ═══════════════════════════════════════════════════════════

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = () => {
  const { invoke } = useSignalR();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isNegotiatingRef = useRef(false);

  // ─── Helpers ──────────────────────────────────────────────

  /** Ensure a hidden <audio> element exists for remote playback */
  const ensureAudioElement = useCallback((): HTMLAudioElement => {
    if (!remoteAudioRef.current) {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.style.display = "none";
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    return remoteAudioRef.current;
  }, []);

  /** Full cleanup — close PC, stop tracks, remove audio element */
  const cleanup = useCallback(() => {
    console.log("[WebRTC] Cleanup");
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    isNegotiatingRef.current = false;
  }, []);

  // ─── Create PeerConnection ───────────────────────────────

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // If one already exists, close it first to avoid leaks
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // ICE candidates → send to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const { remoteUserId } = useCallStore.getState();
        if (remoteUserId) {
          invoke("SendIceCandidate", remoteUserId, JSON.stringify(event.candidate))
            .catch((err) => console.error("[WebRTC] ICE send error:", err));
        }
      }
    };

    // Remote track → attach to audio element
    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received:", event.track.kind);
      const audio = ensureAudioElement();
      audio.srcObject = event.streams[0];
      // Force play (some browsers need explicit call after user gesture)
      audio.play().catch((err) => console.warn("[WebRTC] Audio play blocked:", err));
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === "failed") {
        console.error("[WebRTC] Connection failed — ending call");
        useCallStore.getState().ended();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
    };

    return pc;
  }, [invoke, ensureAudioElement]);

  // ─── 1. Lifecycle: status → active ────────────────────────

  const status = useCallStore((s) => s.status);

  useEffect(() => {
    if (status !== "active") return;

    let cancelled = false;

    const startMedia = async () => {
      try {
        const pc = createPeerConnection();

        // Acquire microphone
        let localStream: MediaStream;
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          console.error("[WebRTC] Mic access denied:", err);
          return;
        }

        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        useCallStore.getState().setLocalStream(localStream);
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        // Caller creates the offer
        const { isOutgoing, remoteUserId } = useCallStore.getState();
        if (isOutgoing && remoteUserId) {
          console.log("[WebRTC] Creating offer (caller)");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await invoke("SendOffer", remoteUserId, JSON.stringify(offer));
          console.log("[WebRTC] Offer sent");
        }
        // Receiver waits for the offer to arrive via store
      } catch (err) {
        console.error("[WebRTC] startMedia error:", err);
      }
    };

    startMedia();

    return () => {
      cancelled = true;
    };
  }, [status, createPeerConnection, invoke]);

  // ─── 2. Handle incoming SDP (offer from caller / answer from receiver) ──

  const remoteSdp = useCallStore((s) => s.remoteSdp);
  const remoteSdpType = useCallStore((s) => s.remoteSdpType);

  useEffect(() => {
    if (!remoteSdp || !remoteSdpType) return;
    if (isNegotiatingRef.current) return;

    const pc = pcRef.current;
    if (!pc) {
      console.warn("[WebRTC] SDP arrived but no PeerConnection exists");
      return;
    }

    isNegotiatingRef.current = true;

    const handleSDP = async () => {
      try {
        const sdp = JSON.parse(remoteSdp);

        if (remoteSdpType === "offer") {
          // Receiver path
          console.log("[WebRTC] Setting remote offer");
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Drain any buffered ICE candidates that arrived before remote description was set
          const { pendingIceCandidates } = useCallStore.getState();
          for (const candStr of pendingIceCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
            } catch (e) {
              console.warn("[WebRTC] Buffered ICE add error:", e);
            }
          }
          useCallStore.getState().clearPendingIceCandidates();

          console.log("[WebRTC] Creating answer (receiver)");
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const { remoteUserId } = useCallStore.getState();
          if (remoteUserId) {
            await invoke("SendAnswer", remoteUserId, JSON.stringify(answer));
            console.log("[WebRTC] Answer sent");
          }

        } else if (remoteSdpType === "answer") {
          // Caller path
          console.log("[WebRTC] Setting remote answer");
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Drain buffered ICE
          const { pendingIceCandidates } = useCallStore.getState();
          for (const candStr of pendingIceCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
            } catch (e) {
              console.warn("[WebRTC] Buffered ICE add error:", e);
            }
          }
          useCallStore.getState().clearPendingIceCandidates();
        }
      } catch (err) {
        console.error("[WebRTC] SDP handling error:", err);
      } finally {
        isNegotiatingRef.current = false;
      }
    };

    handleSDP();
  }, [remoteSdp, remoteSdpType, invoke]);

  // ─── 3. Handle new ICE candidates (after remote description is set) ───

  const pendingIceCandidates = useCallStore((s) => s.pendingIceCandidates);

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription || pendingIceCandidates.length === 0) return;

    const drainCandidates = async () => {
      for (const candStr of pendingIceCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
        } catch (e) {
          console.warn("[WebRTC] ICE candidate add error:", e);
        }
      }
      useCallStore.getState().clearPendingIceCandidates();
    };

    drainCandidates();
  }, [pendingIceCandidates]);

  // ─── 4. Cleanup on call end ──────────────────────────────

  useEffect(() => {
    if (status === "ended" || status === "idle") {
      cleanup();
    }
  }, [status, cleanup]);

  // ─── 5. Unmount safety ──────────────────────────────────

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return null;
};
