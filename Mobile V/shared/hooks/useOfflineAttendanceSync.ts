/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Offline Sync Hook
 * Module 6: Hardware & Offline Intelligence
 * Phase 55: Durable Execution & Auto-Flush
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { useAppStore, useSessionStore } from "../store/stores";
import { useSessionMutations } from "../queries/useSessionQueries";

export function useOfflineAttendanceSync() {
  const isOnline = useAppStore((s) => s.isOnline);
  const { pendingAttendance, clearPendingAttendance } = useSessionStore();
  const { updateAttendanceMutation } = useSessionMutations();

  useEffect(() => {
    const flushQueue = async () => {
      if (isOnline && pendingAttendance.length > 0) {
        console.log(`[OfflineSync] Flushing ${pendingAttendance.length} records...`);
        
        // Group by sessionId to minimize API calls
        const grouped = pendingAttendance.reduce((acc, curr) => {
          if (!acc[curr.sessionId]) acc[curr.sessionId] = [];
          acc[curr.sessionId].push(...curr.records);
          return acc;
        }, {} as Record<string, any[]>);

        try {
          for (const [sessionId, records] of Object.entries(grouped)) {
            await updateAttendanceMutation.mutateAsync({ id: sessionId, records });
          }
          clearPendingAttendance();
        } catch (err) {
          console.error("[OfflineSync] Flush failed:", err);
        }
      }
    };

    flushQueue();
  }, [isOnline, pendingAttendance.length]);
}
