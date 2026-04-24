import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSignalR } from "../../providers/SignalRProvider";

export function SystemUpdatePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateData, setUpdateData] = useState<{ version: string; notes: string[] } | null>(null);
  const { connection } = useSignalR();

  useEffect(() => {
    if (!connection) return;

    const handler = (payload: { version: string; notes: string[] }) => {
      setUpdateData(payload);
      setIsOpen(true);
    };

    connection.on("SystemUpdateAvailable", handler);
    return () => {
      connection.off("SystemUpdateAvailable", handler);
    };
  }, [connection]);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!updateData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}> 
      {/* Prevent closing by clicking outside or pressing escape by not doing anything in onOpenChange */}
      <DialogContent className="sm:max-w-[500px] bg-ui-bg border-ui-accent/40 text-white shadow-[0_0_50px_rgba(var(--ui-accent-rgb),0.3)]" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ui-accent text-xl">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            System Update Required
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-base mt-2">
            A new version of SessionFlow ({updateData.version}) has just been released! Please refresh your application to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-black/40 border border-white/5 rounded-xl p-4 my-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Release Notes:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-200">
            {updateData.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button 
            onClick={handleRefresh} 
            className="w-full sm:w-auto bg-ui-accent text-white hover:bg-ui-accent/90 py-6 text-lg font-bold"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
