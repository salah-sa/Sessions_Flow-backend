/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Realtime Notification Hooks
 * PARITY: 1:1 mirror of desktop hooks/realtime.ts
 * Adaptations: Uses mobile ToastProvider instead of sonner,
 *              haptics for notification feedback
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { useSignalR } from "../providers/SignalRProvider";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../shared/queries/keys";
import { useMuteStore } from "../shared/store/muteStore";
import { usePresenceStore } from "../shared/store/presenceStore";
import { haptics } from "../shared/lib/haptics";
import { useToast } from "../providers/ToastProvider";

// ═══════════════════════════════════════════════════════════
// Real-Time Hooks
// ═══════════════════════════════════════════════════════════
// Note: The old usePresence hook has been replaced by the
// global usePresenceStore + useHeartbeat system.
// See: store/presenceStore.ts + hooks/useHeartbeat.ts
// ═══════════════════════════════════════════════════════════

/**
 * Notifications Hook — uses query invalidation + mute filtering
 * PARITY: Identical logic to desktop useRealtimeNotifications
 */
export const useRealtimeNotifications = () => {
  const { on } = useSignalR();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  useEffect(() => {
    const unsub1 = on("SessionReminder", async (title: string, message: string) => {
      // Invalidate the notification cache — React Query will refetch if mounted
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      // Mobile: use haptic feedback for notification
      haptics.impact();
      // TODO: Integrate expo-notifications for system-level notifications
    });

    const unsub2 = on("NewNotification", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    const unsub3 = on("NewMessage", (groupId: string, senderName: string, text: string) => {
      // Mute filter — check if this group is muted before notifying
      const isMuted = useMuteStore.getState().isMuted(groupId);
      if (isMuted) return; // Silent — badge update handled elsewhere

      // Mobile: haptic feedback for new message
      haptics.selection();
      // Toast notification display
      showToast(`New message from ${senderName || "Unknown"}`, "info");
    });

    // ── Layer 1 Presence Signals ──────────────────────────
    const unsub4 = on("UserOnline", (userId: string) => {
      usePresenceStore.getState().setServerOnline(userId);
    });

    const unsub5 = on("UserOffline", (userId: string) => {
      usePresenceStore.getState().setServerOffline(userId);
    });

    const unsub6 = on("PresenceSnapshot", (snapshot: any[]) => {
      // snapshot: { userId: string; isOnline: boolean; lastSeen: number }[]
      usePresenceStore.getState().reconcile(snapshot);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [on, queryClient]);
};
