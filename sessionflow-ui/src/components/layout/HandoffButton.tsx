import React, { useEffect, useRef, useCallback } from "react";
import { Smartphone, Monitor, Laptop, Send, Check, X, Loader2, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";
import { useHandoffStore, type DeviceInfo, type HandoffOffer } from "../../store/handoffStore";

// ── Device detection ────────────────────────────────────────
function detectDevice(): { label: string; browser: string } {
  const ua = navigator.userAgent;
  const browser = /Firefox/i.test(ua) ? "Firefox"
    : /Edg/i.test(ua) ? "Edge"
    : /Chrome/i.test(ua) ? "Chrome"
    : /Safari/i.test(ua) ? "Safari" : "Browser";

  const isMobile = /Mobi|Android/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const label = isMobile ? "Mobile" : isTablet ? "Tablet" : "Desktop";

  return { label, browser };
}

function getDeviceIcon(label: string) {
  if (label.includes("Mobile")) return Smartphone;
  if (label.includes("Tablet")) return Laptop;
  return Monitor;
}

export const HandoffButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { on, invoke } = useSignalR();
  const { devices, pendingOffer, isOpen, setDevices, setPendingOffer, setIsOpen, toggle } = useHandoffStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Register this device and listen for updates
  useEffect(() => {
    invoke("GetMyDevices").then((d: DeviceInfo[]) => {
      if (Array.isArray(d)) setDevices(d);
    }).catch(() => {});

    const unsubs = [
      on(Events.HANDOFF_DEVICES_UPDATED, (data: { devices: DeviceInfo[] }) => {
        if (data?.devices) setDevices(data.devices);
      }),
      on(Events.HANDOFF_OFFER, (data: HandoffOffer) => {
        setPendingOffer(data);
        toast("Session handoff received!", {
          description: `From ${data.fromDevice}`,
          action: {
            label: "Accept",
            onClick: () => acceptHandoff(data),
          },
        });
      }),
    ];

    return () => unsubs.forEach(u => u?.());
  }, [on, invoke]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const sendHandoff = useCallback(async (targetConnectionId: string) => {
    const state = JSON.stringify({
      route: location.pathname + location.search,
      scrollY: window.scrollY,
      timestamp: Date.now(),
    });

    try {
      await invoke("OfferHandoff", targetConnectionId, state);
      toast.success("Session sent to device");
      setIsOpen(false);
    } catch {
      toast.error("Failed to send session");
    }
  }, [invoke, location]);

  const acceptHandoff = useCallback((offer: HandoffOffer) => {
    try {
      const state = JSON.parse(offer.stateJson);
      if (state.route) {
        navigate(state.route);
        setTimeout(() => window.scrollTo(0, state.scrollY || 0), 200);
      }
      invoke("AcceptHandoff", offer.fromConnectionId).catch(() => {});
      setPendingOffer(null);
      toast.success("Session received!");
    } catch {
      toast.error("Failed to restore session");
    }
  }, [navigate, invoke]);

  const otherDevices = devices.filter(d => !d.isCurrent);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={toggle}
        className="relative w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
      >
        <Wifi className="w-4 h-4" />
        {otherDevices.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--ui-accent)] text-[8px] font-black text-white flex items-center justify-center">
            {otherDevices.length}
          </span>
        )}
      </button>

      {/* Pending Offer Toast */}
      <AnimatePresence>
        {pendingOffer && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-14 w-72 p-4 rounded-2xl border border-[var(--ui-accent)]/20 bg-[var(--ui-sidebar-bg)] shadow-2xl z-50"
          >
            <h4 className="text-[10px] font-black text-[var(--ui-accent)] uppercase tracking-widest mb-2">
              Session Handoff
            </h4>
            <p className="text-[10px] text-slate-400 mb-3">
              Incoming from <strong className="text-white">{pendingOffer.fromDevice}</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => acceptHandoff(pendingOffer)}
                className="flex-1 h-9 rounded-lg bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[9px] font-black uppercase tracking-widest text-[var(--ui-accent)] flex items-center justify-center gap-1.5"
              >
                <Check className="w-3 h-3" /> Accept
              </button>
              <button
                onClick={() => {
                  invoke("RejectHandoff", pendingOffer.fromConnectionId).catch(() => {});
                  setPendingOffer(null);
                }}
                className="h-9 px-4 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black text-slate-500 flex items-center justify-center gap-1.5"
              >
                <X className="w-3 h-3" /> Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device Dropdown */}
      <AnimatePresence>
        {isOpen && !pendingOffer && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute right-0 top-14 w-72 rounded-2xl border border-white/5 bg-[var(--ui-sidebar-bg)] shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/5">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
                Connected Devices
              </h4>
            </div>

            <div className="p-2">
              {otherDevices.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    No other devices connected
                  </p>
                </div>
              ) : (
                otherDevices.map((d, idx) => {
                  const Icon = getDeviceIcon(d.deviceLabel);
                  return (
                    <motion.div
                      key={d.connectionId}
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider">{d.deviceLabel}</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{d.browser}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendHandoff(d.connectionId)}
                        className="h-7 px-3 rounded-lg bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[8px] font-black uppercase tracking-widest text-[var(--ui-accent)] opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                      >
                        <Send className="w-2.5 h-2.5" />
                        Send
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest text-center">
                {detectDevice().label} • {detectDevice().browser}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HandoffButton;
