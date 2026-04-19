import React, { useState } from "react";
import { 
  Loader2, 
  AlertTriangle, 
  Navigation, 
  Crosshair, 
  ArrowRight, 
  ShieldCheck 
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button, Input } from "../ui";
import { useAuthStore } from "../../store/stores";
import { cn } from "../../lib/utils";
import { useReverseGeocode, useIPGeolocation, useForwardGeocode } from "../../queries/useGeoQueries";
import { useUpdateStudentLocation } from "../../queries/useStudentLocationQueries";
import { toast } from "sonner";

export const GeoAuthorization: React.FC = () => {
  const { t } = useTranslation();
  const { studentLocation, setStudentLocationData, user, updateUser } = useAuthStore();
  const [tempLocation, setTempLocation] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "detecting" | "denied" | "error">("idle");
  
  const { mutateAsync: reverseGeocode } = useReverseGeocode();
  const { mutateAsync: fetchIPGeo } = useIPGeolocation();
  const { mutateAsync: forwardGeocode } = useForwardGeocode();
  const { mutate: updateBackendLocation } = useUpdateStudentLocation();

  // Don't show if location is already set in store or backend
  const hasResolvedLocation = !!(studentLocation || (user?.latitude && user?.longitude));
  if (hasResolvedLocation) return null;

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
        
        // Update user object to sync with backend "truth" and stop the overlay
        if (user) {
          updateUser({ ...user, latitude, longitude, city });
        }
        
        toast.success(t("dashboard.geo.sync_success", { city }));
        setGeoStatus("idle");
      } catch (err) {
        const fallbackCity = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        const locationData = {
          city: fallbackCity,
          lat: latitude,
          lng: longitude,
          source: 'auto' as const,
          timestamp: Date.now()
        };
        setStudentLocationData(locationData);
        updateBackendLocation({ lat: latitude, lng: longitude, city: fallbackCity });
        
        if (user) {
          updateUser({ ...user, latitude, longitude, city: fallbackCity });
        }
        
        setGeoStatus("idle");
      }
    };

    const tryIPFallback = async () => {
      try {
        const data = await fetchIPGeo();
        await finalizeLocation(data.lat, data.lng, data.city);
      } catch (err) {
        setGeoStatus("denied");
        toast.error(t("dashboard.geo.failed_manual"));
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

  const handleManualSync = async () => {
    const loc = tempLocation.trim();
    if (!loc) return;

    try {
      const coords = await forwardGeocode(loc);
      const locationData = {
        city: loc,
        lat: coords.lat,
        lng: coords.lng,
        source: 'auto' as const,
        timestamp: Date.now()
      };
      setStudentLocationData(locationData);
      updateBackendLocation({ lat: coords.lat, lng: coords.lng, city: loc });
      
      if (user) {
        updateUser({ ...user, latitude: coords.lat, longitude: coords.lng, city: loc });
      }
      
      toast.success(t("dashboard.geo.sync_success", { city: loc }));
    } catch (err) {
      // Fallback if forward geocode fails
      setStudentLocationData({
        city: loc,
        lat: 0,
        lng: 0,
        source: 'auto',
        timestamp: Date.now()
      });
      updateBackendLocation({ lat: null as any, lng: null as any, city: loc });
      
      if (user) {
        updateUser({ ...user, city: loc });
      }
      
      toast.success(t("dashboard.geo.manual_sync", { city: loc }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-[var(--ui-sidebar-bg)] border border-white/5 rounded-[40px] p-8 sm:p-12 relative overflow-hidden shadow-[0_0_150px_rgba(var(--ui-accent-rgb),0.15)]"
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--ui-accent)]/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 overflow-hidden" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 overflow-hidden" />
        
        <div className="relative z-10 text-center">
          <motion.div 
            animate={geoStatus === "detecting" ? { rotate: 360 } : {}}
            transition={geoStatus === "detecting" ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-[var(--ui-accent)]/20 to-transparent border border-white/10 flex items-center justify-center mx-auto mb-8 sm:mb-10 relative group"
          >
             <Navigation className={cn("w-10 h-10 sm:w-12 sm:h-12 text-[var(--ui-accent)] transition-all duration-700", geoStatus === "detecting" && "scale-75")} />
             <div className="absolute -inset-4 bg-[var(--ui-accent)]/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>

          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 sm:mb-6 uppercase tracking-tight leading-none">
            {user?.role === 'Engineer' ? 'Authorize' : 'Initialize'} <span className="text-[var(--ui-accent)]">Node</span>
          </h2>
          <p className="text-slate-400 font-bold text-base sm:text-lg leading-relaxed mb-8 sm:mb-12 px-2 sm:px-6 uppercase tracking-tight">
            {user?.role === 'Engineer' 
              ? "Establish your administrative coordinates to activate secure distribution mapping and cluster synchronization."
              : "Establish your geographic coordinates to activate dashboard telemetry and synchronize with local operational clusters."
            }
          </p>

          <div className="flex flex-col gap-4 sm:gap-5">
              <Button 
                onClick={handleAutoDetect}
                disabled={geoStatus === "detecting"}
                className={cn(
                  "h-16 sm:h-20 w-full text-base sm:text-lg font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl active:scale-95 transition-all gap-4 border-0 relative overflow-hidden",
                  geoStatus === "denied" 
                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20" 
                    : "bg-white text-black hover:bg-slate-100 ring-1 ring-white/20 shadow-glow shadow-white/20"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                {geoStatus === "detecting" ? (
                  <>
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                    <span>Linking...</span>
                  </>
                ) : geoStatus === "denied" ? (
                  <>
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Permission Denied</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Sync Telemetry</span>
                  </>
                )}
              </Button>

              <div className="relative py-4 sm:py-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]"><span className="bg-[var(--ui-sidebar-bg)] px-4 sm:px-6">Manual Override</span></div>
             </div>

             <div className="flex gap-4">
               <div className="relative flex-1 group">
                 <div className="absolute inset-0 bg-[var(--ui-accent)]/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                 <Input 
                   value={tempLocation}
                   onChange={(e) => setTempLocation(e.target.value)}
                   placeholder="CITY / REGION..."
                   className="h-14 sm:h-16 bg-white/[0.03] border-white/5 focus:border-[var(--ui-accent)]/30 focus:bg-white/[0.05] pl-6 sm:pl-8 rounded-2xl font-mono font-bold uppercase text-xs sm:text-sm tracking-wider transition-all placeholder:text-slate-700"
                   onKeyDown={(e) => e.key === "Enter" && handleManualSync()}
                 />
               </div>
               <Button 
                 variant="outline"
                 disabled={!tempLocation.trim()}
                 onClick={handleManualSync}
                 className="h-14 sm:h-16 px-6 sm:px-8 border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-white/20 rounded-2xl text-[var(--ui-accent)] transition-all shadow-glow shadow-[var(--ui-accent)]/10"
               >
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
               </Button>
             </div>
          </div>

          <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Secure Node Authorization Active</span>
            </div>
            <p className="text-[8px] sm:text-[9px] font-bold text-slate-700 uppercase tracking-tighter max-w-xs mx-auto leading-relaxed">
              By authorizing, you consent to telemetry synchronization for operational distribution mapping and local cluster optimization.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
