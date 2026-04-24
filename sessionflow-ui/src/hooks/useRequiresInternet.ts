import { useCallback } from "react";
import { useAppStore } from "../store/stores";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/**
 * Hook to guard features that require internet connectivity.
 * Returns a checker function that shows the professional modal popup if offline or weak.
 */
export function useRequiresInternet() {
  const { t } = useTranslation();
  const isOnline = useAppStore((s) => s.isOnline);
  const networkQuality = useAppStore((s) => s.networkQuality);

  const checkConnectivity = useCallback(() => {
    if (!isOnline || networkQuality === "offline") {
      toast.error(t("connection.required_for_action", "This action requires an active internet connection. Please check your network and try again."));
      return false;
    }
    
    if (networkQuality === "weak") {
      toast.warning(t("connection.weak_warning", "Connection is weak. This action might take longer than usual."));
      return true;
    }

    return true;
  }, [isOnline, networkQuality, t]);

  return { isOnline, networkQuality, checkConnectivity };
}
