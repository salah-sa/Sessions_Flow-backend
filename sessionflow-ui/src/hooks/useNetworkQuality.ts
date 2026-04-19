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

  useEffect(() => {
    const measureLatency = async () => {
      if (!navigator.onLine) {
        setQuality("offline");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const start = performance.now();
        
        // Ping Google's standard 204 No Content URL to test REAL internet egress latency
        // Note: fetch will fail CORS if we don't do mode: 'no-cors'
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
          setQuality("excellent");
        } else if (latency < 400) {
          setQuality("good");
        } else {
          setQuality("weak");
        }

      } catch (e) {
        clearTimeout(timeoutId);
        if (navigator.onLine) {
          setQuality("weak"); 
        } else {
          setQuality("offline");
        }
      }
    };

    const handleOnline = () => {
        setQuality("good");
        measureLatency();
    }
    const handleOffline = () => setQuality("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    measureLatency();

    // Periodic check
    const intervalId = setInterval(() => {
      checkCountRef.current++;
      // Every 15 seconds ping the external server
      measureLatency();
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return { quality, ...details };
}
