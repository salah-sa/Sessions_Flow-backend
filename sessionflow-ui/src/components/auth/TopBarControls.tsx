import React from "react";
import { X, Minus, Maximize2 } from "lucide-react";
import { toast } from "sonner";

export const TopBarControls: React.FC<{ theme?: "dark" | "light" }> = ({ theme = "dark" }) => {

  const handleExitApp = async () => {
    try {
      const win = window as any;
      if (win.chrome && win.chrome.webview) {
        await win.chrome.webview.hostObjects.sessionFlowHost.exitApp();
      } else {
        window.close(); // Fallback
      }
    } catch (err) {
      console.error("Failed to exit app", err);
      toast.error("Could not exit app from here.");
    }
  };

  const handleMinimize = async () => {
    try {
      const win = window as any;
      if (win.chrome && win.chrome.webview) {
        if (win.chrome.webview.hostObjects.sessionFlowHost.minimizeWindow) {
            await win.chrome.webview.hostObjects.sessionFlowHost.minimizeWindow();
        } else {
            console.warn("Minimize not implemented in host bridge.");
        }
      }
    } catch (err) {
      console.error("Failed to minimize", err);
    }
  };

  const handleMaximize = async () => {
    try {
      const win = window as any;
      if (win.chrome && win.chrome.webview) {
        if (win.chrome.webview.hostObjects.sessionFlowHost.maximizeWindow) {
            await win.chrome.webview.hostObjects.sessionFlowHost.maximizeWindow();
        }
      }
    } catch (err) {
      console.error("Failed to maximize", err);
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      dir="ltr"
      className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between z-[100]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* App title (left side) */}
      <div className="flex items-center gap-2 px-4 pointer-events-none">
        <span className={`text-[12px] font-semibold tracking-wide ${isDark ? "text-white/30" : "text-black/30"}`}>
          SessionFlow
        </span>
      </div>

      {/* Window controls (right side) */}
      <div
        className="flex h-full pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className={`w-12 h-full flex items-center justify-center transition-all duration-150 ${
            isDark
              ? "text-white/50 hover:bg-white/10 hover:text-white"
              : "text-black/50 hover:bg-black/10 hover:text-black"
          }`}
          title="Minimize"
        >
          <Minus className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          onClick={handleMaximize}
          className={`w-12 h-full flex items-center justify-center transition-all duration-150 ${
            isDark
              ? "text-white/50 hover:bg-white/10 hover:text-white"
              : "text-black/50 hover:bg-black/10 hover:text-black"
          }`}
          title="Maximize"
        >
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          onClick={handleExitApp}
          className={`w-12 h-full flex items-center justify-center transition-all duration-150 ${
            isDark
              ? "text-white/50 hover:bg-red-500 hover:text-white"
              : "text-black/50 hover:bg-red-500 hover:text-white"
          }`}
          title="Close"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
