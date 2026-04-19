import React, { useState } from "react";
import { Navigation, Crosshair, Loader2, ShieldCheck, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui";
import { cn } from "../../lib/utils";
import { useReverseGeocode, useIPGeolocation } from "../../queries/useGeoQueries";
import { useUpdateStudentLocation } from "../../queries/useStudentLocationQueries";
import { useAuthStore } from "../../store/stores";
import { toast } from "sonner";

export const GeoConsentBanner: React.FC = () => {
  const { studentLocation, setStudentLocationData, user } = useAuthStore();
  const [geoStatus, setGeoStatus] = useState<"idle" | "detecting" | "error">("idle");
  const { mutateAsync: reverseGeocode } = useReverseGeocode();
  const { mutateAsync: fetchIPGeo } = useIPGeolocation();
  const { mutate: updateBackendLocation } = useUpdateStudentLocation();

  // Don't show if location is already set in store or backend
  if (studentLocation || user?.latitude) return null;

  const handleAutoDetect = async () => {
    setGeoStatus("detecting");
    
    const finalizeLocation = async (latitude: number, longitude: number, citySource: string) => {
      try {
        const city = citySource === 'auto' 
          ? await reverseGeocode({ lat: latitude, lng: longitude })
          : citySource;
        
        const locationData = {
          city,
          lat: latitude,
          lng: longitude,
          source: 'auto' as const,
          timestamp: Date.now()
        };

        setStudentLocationData(locationData);
        updateBackendLocation({ lat: latitude, lng: longitude, city });
        
        toast.success(`Node synchronized: ${city}`);
        setGeoStatus("idle");
      } catch (err) {
        const fallbackCity = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        setStudentLocationData({
          city: fallbackCity,
          lat: latitude,
          lng: longitude,
          source: 'auto',
          timestamp: Date.now()
        });
        updateBackendLocation({ lat: latitude, lng: longitude, city: fallbackCity });
        setGeoStatus("idle");
      }
    };

    const tryIPFallback = async () => {
      try {
        const data = await fetchIPGeo();
        await finalizeLocation(data.lat, data.lng, data.city);
      } catch (err) {
        setGeoStatus("error");
        toast.error("Geolocation failed. Please update location in settings.");
      }
    };

    if (!navigator.geolocation) {
      await tryIPFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await finalizeLocation(position.coords.latitude, position.coords.longitude, 'auto');
      },
      async (error) => {
        console.error("Geo Error:", error);
        await tryIPFallback();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-8"
      >
        <div className="relative group overflow-hidden bg-gradient-to-r from-[var(--ui-accent)]/10 via-[var(--ui-accent)]/5 to-transparent border border-[var(--ui-accent)]/20 rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Animated Background Pulse */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--ui-accent)]/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/4 animate-pulse" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-[22px] bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/10">
              <Navigation className={cn("w-8 h-8 text-[var(--ui-accent)] transition-all duration-1000", geoStatus === "detecting" && "animate-spin-slow scale-75")} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                Operational <span className="text-[var(--ui-accent)]">Telemetry</span> Missing
              </h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
                Establish node coordinates to activate global distribution mapping.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500/60" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.1em]">Identity Handshake Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <Button
              onClick={handleAutoDetect}
              disabled={geoStatus === "detecting"}
              className={cn(
                "!h-14 !px-8 !rounded-2xl !bg-white !text-black !font-black !uppercase !tracking-widest !text-[11px] hover:!bg-slate-100 active:!scale-95 transition-all w-full md:w-auto",
                geoStatus === "detecting" && "opacity-50"
              )}
            >
              {geoStatus === "detecting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-3 text-[var(--ui-accent)]" />
                  Synchronizing...
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 me-3" />
                  Sync Node Location
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
