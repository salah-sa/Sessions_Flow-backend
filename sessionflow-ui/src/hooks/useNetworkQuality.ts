import { useState, useEffect } from "react";

export type NetworkQuality = "strong" | "weak" | "offline";

interface NetworkInformation extends EventTarget {
  readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  readonly downlink: number;
  readonly rtt: number;
  onchange: EventListener;
}

export function useNetworkQuality() {
  const [quality, setQuality] = useState<NetworkQuality>(() => {
    if (!navigator.onLine) return "offline";
    // For initial state, try to look at Network Info API immediately if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g" || connection.downlink < 1.5) return "weak";
    }
    return "strong";
  });

  const [details, setDetails] = useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
  }>({
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
  });

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setQuality("offline");
        return;
      }

      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const { effectiveType, downlink, rtt } = connection;
        setDetails({ effectiveType, downlink, rtt });

        // Tighter thresholds for "weak" connection:
        // - Effective type is 3G or lower
        // - Downlink is less than 1.5 Mbps
        // - RTT is greater than 400ms
        if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g" || downlink < 1.5 || rtt > 400) {
          setQuality("weak");
        } else {
          setQuality("strong");
        }
      } else {
        // Fallback for browsers without Network Information API
        if (navigator.onLine) {
           // We'll let the heartbeat ping settle it
        } else {
           setQuality("offline");
        }
      }
    };

    const handleOnline = () => updateStatus();
    const handleOffline = () => setQuality("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener("change", updateStatus);
    }

    // Periodic check for effective network status via ping
    const interval = setInterval(async () => {
      if (!navigator.onLine) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const start = Date.now();
        // Lightweight HEAD request to check latency
        await fetch("/favicon.ico", { 
          method: "HEAD", 
          cache: "no-store",
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        const latency = Date.now() - start;
        
        // Thresholds based on real-world perception
        if (latency > 800) {
          setQuality("weak");
        } else {
           // If we are here, latency is good. 
           // Only update to strong if the connection API isn't telling us otherwise
           if (connection) {
             const { effectiveType, downlink, rtt } = connection;
             if (!(effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g" || downlink < 1.5 || rtt > 400)) {
               setQuality("strong");
             }
           } else {
             setQuality("strong");
           }
        }
      } catch (e) {
        clearTimeout(timeoutId);
        // If fetch fails but navigator thinks we are online, it's likely offline or blocked
        if (navigator.onLine) {
          setQuality("weak"); // Could be an intermittent failure, or slow DNS
        } else {
          setQuality("offline");
        }
      }
    }, 15000);

    updateStatus();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateStatus);
      }
      clearInterval(interval);
    };
  }, []);

  return { quality, ...details };
}
