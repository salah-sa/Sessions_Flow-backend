import { useEffect, useState } from "react";
import { Button } from "../ui";
import { AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";
import { useSignalR } from "../../providers/SignalRProvider";
import { useLatestBroadcast } from "../../queries/useSystemQueries";

export function SystemUpdatePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateData, setUpdateData] = useState<{ version: string; notes: string[] } | null>(null);
  const [isStartupMode, setIsStartupMode] = useState(false);
  const { on, off } = useSignalR();
  
  const { data: latestBroadcast } = useLatestBroadcast();

  // Check on startup if there is a new update that hasn't been acknowledged
  useEffect(() => {
    if (latestBroadcast && latestBroadcast.version) {
      const lastSeen = localStorage.getItem("lastSeenUpdateVersion");
      if (lastSeen !== latestBroadcast.version) {
        setUpdateData({ version: latestBroadcast.version, notes: latestBroadcast.notes || [] });
        setIsStartupMode(true);
        setIsOpen(true);
      }
    }
  }, [latestBroadcast]);

  // Listen for real-time broadcasts
  useEffect(() => {
    const handler = (payload: { version: string; notes: string[] }) => {
      setUpdateData(payload);
      setIsStartupMode(false);
      setIsOpen(true);
    };

    const unsubscribe = on("SystemUpdateAvailable", handler);
    return () => {
      if (unsubscribe) unsubscribe();
      off("SystemUpdateAvailable", handler);
    };
  }, [on, off]);

  const handleAcknowledge = () => {
    if (updateData?.version) {
      localStorage.setItem("lastSeenUpdateVersion", updateData.version);
    }
    
    if (isStartupMode) {
      setIsOpen(false);
    } else {
      window.location.reload();
    }
  };

  if (!updateData || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="relative w-full max-w-[500px] bg-ui-bg border border-ui-accent/40 rounded-2xl p-8 shadow-[0_0_80px_rgba(var(--ui-accent-rgb),0.2)]">
        
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-ui-accent/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-ui-accent animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isStartupMode ? "What's New in SessionFlow" : "System Update Required"}
          </h2>
          <p className="text-slate-300 text-sm max-w-sm">
            {isStartupMode 
              ? `Version ${updateData.version} has been released. Here are the latest changes.`
              : `A new version of SessionFlow (${updateData.version}) has just been released! Please refresh your application to continue.`}
          </p>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-xl p-5 mb-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Release Notes:</h4>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-200">
            {updateData.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={handleAcknowledge} 
            className="w-full bg-ui-accent text-white py-6 text-lg font-bold rounded-xl"
            variant="glow"
          >
            {isStartupMode ? (
              <>
                <CheckCircle className="w-5 h-5 mr-3" />
                Continue to App
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-3 animate-spin-slow" />
                Refresh Application
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
