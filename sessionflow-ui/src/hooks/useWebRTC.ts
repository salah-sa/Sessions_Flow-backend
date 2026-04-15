import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "../store/callStore";
import { useSignalR } from "../providers/SignalRProvider";

/**
 * useWebRTC — The media engine hook for SessionFlow Voice Calls.
 * Manages RTCPeerConnection, MediaStreams, and signaling handshake.
 */
export const useWebRTC = () => {
  const { 
    status, 
    remoteUserId, 
    remoteSdp, 
    remoteSdpType, 
    pendingIceCandidates,
    setLocalStream,
    clearPendingIceCandidates
  } = useCallStore();
  
  const { invoke } = useSignalR();
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Initialize PeerConnection
  const initPC = useCallback(async () => {
    if (pcRef.current) return;

    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    // ICE Candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserId) {
        invoke("SendIceCandidate", remoteUserId, JSON.stringify(event.candidate))
          .catch(console.error);
      }
    };

    // Remote Track handling
    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received", event.streams[0]);
      if (!remoteAudioRef.current) {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.style.display = "none";
        document.body.appendChild(audio);
        remoteAudioRef.current = audio;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    // PC State Logging
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Handle failure if needed, although endCall/reset usually handles this.
      }
    };

    // 2. Local Media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (err) {
      console.error("[WebRTC] Failed to get user media:", err);
      // Fallback: continue without local audio if user denies (one-way call)
    }

    return pc;
  }, [remoteUserId, invoke, setLocalStream]);

  // 3. Cleanup logic
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
  }, []);

  // 4. Lifecycle Management
  useEffect(() => {
    if (status === "active") {
      initPC().then(async (pc) => {
        if (!pc || !remoteUserId) return;

        const { isOutgoing } = useCallStore.getState();

        if (isOutgoing) {
          // Caller Flow: Create Offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await invoke("SendOffer", remoteUserId, JSON.stringify(offer));
        }
      });
    }

    if (status === "ended" || status === "idle") {
      cleanup();
    }

    return () => {
      if (status === "ended") cleanup();
    };
  }, [status, remoteUserId, initPC, cleanup, invoke]);

  // 5. Handle Incoming SDP (Offers/Answers)
  useEffect(() => {
    const handleSDP = async () => {
      if (!pcRef.current || !remoteSdp || !remoteSdpType || !remoteUserId) return;

      const pc = pcRef.current;
      const sdp = JSON.parse(remoteSdp);

      if (remoteSdpType === "offer") {
        console.log("[WebRTC] Received Offer");
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await invoke("SendAnswer", remoteUserId, JSON.stringify(answer));
      } else if (remoteSdpType === "answer") {
        console.log("[WebRTC] Received Answer");
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    handleSDP();
  }, [remoteSdp, remoteSdpType, remoteUserId, invoke]);

  // 6. Handle Buffered ICE Candidates
  useEffect(() => {
    if (!pcRef.current || pendingIceCandidates.length === 0 || !pcRef.current.remoteDescription) return;

    const pc = pcRef.current;
    pendingIceCandidates.forEach(async (candStr) => {
      try {
        const candidate = new RTCIceCandidate(JSON.parse(candStr));
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("[WebRTC] Error adding ICE candidate", e);
      }
    });
    clearPendingIceCandidates();
  }, [pendingIceCandidates, clearPendingIceCandidates]);

  return null;
};
