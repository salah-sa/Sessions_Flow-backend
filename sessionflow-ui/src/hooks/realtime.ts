import { useEffect } from "react";
import { useSignalR } from "../providers/SignalRProvider";
import { toast } from "sonner";
import { getHost } from "../lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";
import { useMuteStore } from "../store/muteStore";
import { usePresenceStore } from "../store/presenceStore";

// ═══════════════════════════════════════════════════════════
// Real-Time Hooks
// ═══════════════════════════════════════════════════════════
// Note: The old usePresence hook has been replaced by the
// global usePresenceStore + useHeartbeat system.
// See: store/presenceStore.ts + hooks/useHeartbeat.ts
// ═══════════════════════════════════════════════════════════

// Notifications Hook — uses query invalidation + mute filtering
export const useRealtimeNotifications = () => {
  const { on } = useSignalR();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub1 = on("SessionReminder", async (title: string, message: string) => {
      // Invalidate the notification cache — React Query will refetch if mounted
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.info(title, { description: message });
      const host = await getHost();
      if (host) {
        host.showToast(title, message);
      }
    });

    const unsub2 = on("NewNotification", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    const unsub3 = on("NewMessage", (groupId: string, senderName: string, text: string) => {
      // Mute filter — check if this group is muted before showing toast
      const isMuted = useMuteStore.getState().isMuted(groupId);
      if (isMuted) return; // Silent — badge update handled elsewhere

      toast(`${senderName} in group chat:`, {
        description: text,
        action: {
          label: "View",
          onClick: () => {
            // Navigate to chat — handled by router
          },
        },
      });
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
