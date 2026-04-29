import { useEffect } from "react";
import { useSignalR } from "../providers/SignalRProvider";
import { toast } from "sonner";
import { getHost } from "../lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";
import { useMuteStore } from "../store/muteStore";
import { Events } from "../lib/eventContracts";

// ═══════════════════════════════════════════════════════════
// Real-Time Hooks
// ═══════════════════════════════════════════════════════════
// Note: The old usePresence hook has been replaced by the
// global usePresenceStore + useHeartbeat system.
// See: store/presenceStore.ts + hooks/useHeartbeat.ts
//
// Presence events are now handled globally in SignalRProvider.
// This hook only handles page-level toast notifications.
// ═══════════════════════════════════════════════════════════

import { sounds } from "../lib/sounds";

// Notifications Hook — uses query invalidation + mute filtering
export const useRealtimeNotifications = () => {
  const { on } = useSignalR();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub1 = on("SessionReminder", async (title: string, message: string) => {
      // Invalidate the notification cache — React Query will refetch if mounted
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.info(title, { description: message });
      sounds.playNotification();
      
      const host = await getHost();
      if (host) {
        host.showToast(title, message);
      }
    });

    const unsub2 = on(Events.NOTIFICATION_CREATED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      sounds.playNotification();
    });

    const unsub3 = on(Events.MESSAGE_RECEIVE, () => {
      // Tactical feedback for incoming communication
      sounds.playPop();
    });

    // Note: Presence events (UserOnline, UserOffline, PresenceSnapshot)
    // are now handled globally in SignalRProvider — no need to duplicate here.

    const unsub4 = on(Events.WALLET_BALANCE_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
    });

    const unsub5 = on(Events.WALLET_TRANSACTION_RECEIVED, (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      toast.success("Funds Received!", { description: `You received EGP ${payload.amountEgp} from ${payload.fromPhone}.` });
      sounds.playNotification();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [on, queryClient]);
};
