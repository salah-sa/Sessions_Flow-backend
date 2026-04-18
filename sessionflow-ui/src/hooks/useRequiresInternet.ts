import { useCallback } from "react";
import { useAppStore } from "../store/stores";
import { useTranslation } from "react-i18next";

/**
 * Hook to guard features that require internet connectivity.
 * Returns a checker function that shows the professional modal popup if offline or weak.
 */
export function useRequiresInternet() {
  const { t } = useTranslation();
  const isOnline = useAppStore((s) => s.isOnline);
  const networkQuality = useAppStore((s) => s.networkQuality);
  const setConnectionPopup = useAppStore((s) => s.setConnectionPopup);

  const checkConnectivity = useCallback(() => {
    if (!isOnline || networkQuality === "offline") {
      setConnectionPopup(true);
      return false;
    }
    
    // If weak, we still allow but can show a warning if needed. 
    // In this case, the user explicitly asked to "show a message indicating that the user needs to be connected or check connection"
    // So we'll trigger the popup for weak too if they try to do a guarded action.
    if (networkQuality === "weak") {
      setConnectionPopup(true);
      // We return true because they CAN still try to send, but we've warned them via the popup
      return true;
    }

    return true;
  }, [isOnline, networkQuality, setConnectionPopup]);

  return { isOnline, networkQuality, checkConnectivity };
}
