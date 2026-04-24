import { useState, useEffect, useRef } from "react";

export type NetworkQuality = "excellent" | "good" | "weak" | "offline";

interface NetworkInformation extends EventTarget {
  readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  readonly downlink: number;
  readonly rtt: number;
  onchange: EventListener;
}

export function useNetworkQuality() {
  const [quality, setQuality] = useState<NetworkQuality>(() => {
    return navigator.onLine ? "good" : "offline";
  });

  const [details, setDetails] = useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
    latency: number;
  }>({
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
    latency: 0,
  });

  const checkCountRef = useRef(0);
  const qualityRef = useRef<NetworkQuality>(navigator.onLine ? "good" : "offline");

  // Helper to update quality only when it changes
  const updateQuality = (newQuality: NetworkQuality) => {
    if (qualityRef.current !== newQuality) {
      qualityRef.current = newQuality;
      setQuality(newQuality);
    }
  };

  useEffect(() => {
    const measureLatency = async () => {
      if (!navigator.onLine) {
        updateQuality("offline");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const start = performance.now();
        
        await fetch("https://www.google.com/generate_204", { 
          method: "HEAD", 
          cache: "no-store",
          mode: "no-cors",
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        const latency = performance.now() - start;
        
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        let downlink = 0;
        let rtt = 0;
        let effectiveType = "unknown";

        if (connection) {
          downlink = connection.downlink;
          rtt = connection.rtt;
          effectiveType = connection.effectiveType;
        }

        setDetails({ effectiveType, downlink, rtt, latency });

        if (latency < 100) {
          updateQuality("excellent");
        } else if (latency < 400) {
          updateQuality("good");
        } else {
          updateQuality("weak");
        }

      } catch (e) {
        clearTimeout(timeoutId);
        if (navigator.onLine) {
          updateQuality("weak"); 
        } else {
          updateQuality("offline");
        }
      }
    };

    const handleOnline = () => {
        updateQuality("good");
        measureLatency();
    }
    const handleOffline = () => updateQuality("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    measureLatency();

    // Periodic check
    const intervalId = setInterval(() => {
      checkCountRef.current++;
      // Every 30 seconds ping the external server
      measureLatency();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return { quality, ...details };
}
