import React, { useState } from "react";
import { useStudentDashboard } from "../queries/useStudentDashboard";
import { 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Activity, 
  CheckCircle, 
  GraduationCap, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  Navigation, 
  Crosshair, 
  RefreshCcw 
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge, Input } from "../components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";
import { useAuthStore } from "../store/stores";
import { cn } from "../lib/utils";
import WorldStudentMap from "../components/dashboard/WorldStudentMap";
import { useReverseGeocode, useIPGeolocation } from "../queries/useGeoQueries";
import { toast } from "sonner";

export const StudentDashboard: React.FC = () => {
  const { data, isLoading, error } = useStudentDashboard();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { studentLocation, setStudentLocation, setStudentLocationData } = useAuthStore();
  const [tempLocation, setTempLocation] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "detecting" | "denied" | "error">("idle");
  const { mutateAsync: reverseGeocode } = useReverseGeocode();
  const { mutateAsync: fetchIPGeo } = useIPGeolocation();

  const handleAutoDetect = async () => {
    setGeoStatus("detecting");
    
    const finalizeLocation = async (latitude: number, longitude: number, citySource: string) => {
      try {
        const city = citySource === 'auto' 
          ? await reverseGeocode({ lat: latitude, lng: longitude })
          : citySource;
        
        setStudentLocationData({
          city,
          lat: latitude,
          lng: longitude,
          source: 'auto',
          timestamp: Date.now()
        });
        toast.success(`Node synchronized: ${city}`);
        setGeoStatus("idle");
      } catch (err) {
        setStudentLocationData({
          city: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          lat: latitude,
          lng: longitude,
          source: 'auto',
          timestamp: Date.now()
        });
        setGeoStatus("idle");
      }
    };

    const tryIPFallback = async () => {
      try {
        const data = await fetchIPGeo();
        await finalizeLocation(data.lat, data.lng, data.city);
      } catch (err) {
        setGeoStatus("denied");
        toast.error("Geolocation failed. Please enter city manually.");
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
        // If denied or error, try IP fallback
        await tryIPFallback();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-[50vh] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ui-accent)] mb-4" />
        <p className="text-[var(--ui-accent)] font-bold uppercase tracking-[0.2em] text-xs animate-pulse">
          Synchronizing Neural Environment...
        </p>
      </div>
    );
  }

  // Mandatory Location Check - Cinematic Consent Flow
  if (!studentLocation) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-lg bg-var(--ui-sidebar-bg) border border-white/10 rounded-[32px] p-10 relative overflow-hidden shadow-[0_0_100px_rgba(var(--ui-accent-rgb),0.1)]"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-var(--ui-accent)/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 rounded-3xl bg-var(--ui-accent)/10 border border-white/10 flex items-center justify-center mx-auto mb-8 relative group">
               <Navigation className={cn("w-10 h-10 text-var(--ui-accent) transition-all duration-700", geoStatus === "detecting" && "animate-pulse scale-90")} />
               <div className="absolute inset-0 bg-var(--ui-accent)/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <h2 className="text-4xl font-sora font-black text-white uppercase tracking-tighter mb-4">
              Initialize Node
            </h2>
            <p className="text-slate-400 font-medium text-lg leading-relaxed mb-10 px-4">
              Set your geographic operational node to initialize dashboard telemetry and synchronize with local active sessions.
            </p>

            <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleAutoDetect}
                  disabled={geoStatus === "detecting"}
                  className={cn(
                    "h-16 w-full text-base font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all gap-3",
                    geoStatus === "denied" ? "bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20" : "bg-white text-black hover:bg-slate-200"
                  )}
                >
                  {geoStatus === "detecting" ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      <span>Syncing Neural Link...</span>
                    </>
                  ) : geoStatus === "denied" ? (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      <span>Access Denied - Retry?</span>
                    </>
                  ) : (
                    <>
                      <Crosshair className="w-5 h-5" />
                      <span>Auto-Detect Location</span>
                    </>
                  )}
                </Button>

               <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600"><span className="bg-var(--ui-sidebar-bg) px-4">Secure Override</span></div>
               </div>

               <div className="flex gap-3">
                 <div className="relative flex-1">
                   <Input 
                     value={tempLocation}
                     onChange={(e) => setTempLocation(e.target.value)}
                     placeholder="ENTER CITY MANUALLY..."
                     className="h-14 bg-white/5 border-white/5 focus:border-white/20 pl-6 rounded-xl font-bold tracking-widest uppercase text-xs"
                     onKeyDown={(e) => e.key === "Enter" && tempLocation.trim() && setStudentLocation(tempLocation.trim())}
                   />
                 </div>
                 <Button 
                   variant="outline"
                   disabled={!tempLocation.trim()}
                   onClick={() => setStudentLocation(tempLocation.trim())}
                   className="h-14 px-6 border-white/10 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                 >
                   <CheckCircle className="w-5 h-5" />
                 </Button>
               </div>
            </div>

            <p className="mt-10 text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
               <ShieldCheck className="w-3 h-3" />
               End-to-end encrypted telemetry link enabled
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="p-6 max-w-4xl mx-auto font-sans">
        <Card className="p-8 border-red-500/20 bg-red-500/5 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-lg font-sora font-black text-white uppercase tracking-widest">
            Identity Resolution Failed
          </h2>
          <p className="text-slate-400 mt-2">
            {(error as any)?.message || data?.error?.message || "Your student records could not be verified."}
          </p>
          <Button 
            className="mt-6 bg-red-500 hover:bg-red-400 text-white"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.data })}
          >
            Retry Validation
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;
  const { identity, progress, todaySession, nextSession, primaryAction, timeline } = data;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 lg:p-10 space-y-8 animate-fade-in font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Region */}
        <motion.div initial="hidden" animate="visible" variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden relative z-10 shadow-lg shadow-emerald-500/10">
                {identity.avatarUrl ? (
                  <img src={identity.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-emerald-400" />
                )}
              </div>
              <div className="absolute -inset-2 bg-emerald-500/20 blur-xl rounded-full opacity-50 animate-pulse" />
            </div>
            
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-4 mb-1">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                  Student Operator
                </p>
                <div className="h-4 px-2 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                  <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{studentLocation}</span>
                </div>
              </div>
              <h1 className="text-3xl lg:text-4xl font-sora font-black text-white uppercase tracking-tighter">
                {identity.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-bold tracking-wider">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" /> Node: {identity.groupName}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>Level {identity.level}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>ID: {identity.studentId}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Hub */}
          <motion.div initial="hidden" animate="visible" variants={itemVariants} className="col-span-1 lg:col-span-2 space-y-6">
            <div className="card-aero p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Priority Directive
                  </h3>
                  <h2 className="text-2xl font-sora font-black text-white">
                    {primaryAction?.label}
                  </h2>
                </div>

                {todaySession || nextSession ? (
                  <Button 
                    onClick={() => {
                      const session = todaySession || nextSession;
                      if (session) navigate(`/sessions/${session.id}`);
                    }}
                    className="h-12 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-500/20"
                  >
                    Enter Operations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-slate-500 font-black uppercase tracking-widest text-[11px] cursor-not-allowed"
                  >
                    No Active Nodes
                  </Button>
                )}
              </div>
            </div>

            {/* Universal Node Distribution Map */}
            <WorldStudentMap compact />

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Total Peer Load</p>
                    <p className="text-lg font-mono font-black text-white tabular-nums">108</p>
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Cross-Node Latency</p>
                    <p className="text-lg font-mono font-black text-emerald-500 tabular-nums">1.2ms</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sync Health</p>
                 <p className="text-lg font-mono font-black text-cyan-400 tabular-nums">99.9%</p>
              </div>
            </div>
          </motion.div>

          {/* Right Sidebar: Progress */}
          <motion.div initial="hidden" animate="visible" variants={itemVariants} className="col-span-1 space-y-6">
            <div className="card-aero p-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Course Trajectory</h3>
              
              <div className="flex items-end justify-between mb-2">
                <span className="text-4xl font-sora font-black text-white leading-none">{progress.percentage.toFixed(0)}<span className="text-xl text-emerald-500">%</span></span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{progress.completed} / {progress.total} Complete</span>
              </div>
              
              <div className="h-3 bg-var(--ui-surface) rounded-full overflow-hidden w-full p-0.5 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full relative"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px] animate-stripe" />
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remaining</p>
                  <p className="text-xl font-sora font-black text-white mt-1">{progress.remaining}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Edge</p>
                  <p className="text-xl font-sora font-black text-white mt-1">S{progress.total}</p>
                </div>
              </div>
            </div>

            {/* Timeline View inside sidebar or below map for better layout? Leaving it here as per original */}
            <div className="card-aero p-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" /> Recent Sessions
              </h3>
              
              <div className="space-y-4">
                {timeline.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group" onClick={() => navigate(`/sessions/${session.id}`)}>
                    <div className={cn("p-2 rounded-lg border", session.status === "Ended" ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-var(--ui-surface) border-slate-700 text-slate-400')}>
                      {session.status === "Ended" ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10px] font-black text-white uppercase tracking-wide truncate">Session #{session.number}</h4>
                      <p className="text-[8px] text-slate-500 mt-0.5">{format(new Date(session.scheduledAt), "MMM d")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
