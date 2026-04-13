/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Network Recovery Hook
 * Phase 102: Connectivity-Aware Auto-Healing
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useChatStore, useAppStore } from '../shared/store/stores';
import { useSendMessage } from '../shared/queries/useChatQueries';
import { logger } from '../shared/lib/logger';

export function useNetworkRecovery() {
  const { pendingMessages, removeFromQueue, updatePendingMessage } = useChatStore();
  const setOnline = useAppStore(s => s.setOnline);
  const sendMessageMutation = useSendMessage();
  const isRetrying = useRef(false);

  const retryFailedMessages = async () => {
    if (isRetrying.current || pendingMessages.length === 0) return;
    
    isRetrying.current = true;
    logger.track("QUEUE_RETRY_START", { count: pendingMessages.length });

    // Process failed messages one by one to avoid overwhelming server
    for (const msg of pendingMessages) {
      if (msg.status === "error") {
        try {
          updatePendingMessage(msg.id, { status: "pending" });
          await sendMessageMutation.mutateAsync({
            groupId: msg.groupId,
            message: msg.text,
            id: msg.id
          });
          removeFromQueue(msg.id);
          logger.track("QUEUE_RETRY_SUCCESS", { messageId: msg.id });
        } catch (err) {
          updatePendingMessage(msg.id, { status: "error" });
          logger.error("QUEUE_RETRY_FAIL", err, { messageId: msg.id });
          // Stop processing queue if we hit another error (likely still offline or server down)
          break;
        }
      }
    }
    
    isRetrying.current = false;
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = !!state.isConnected && !!state.isInternetReachable;
      setOnline(isConnected);

      if (isConnected) {
        logger.track("NETWORK_RESTORED");
        retryFailedMessages();
      } else {
        logger.warn("NETWORK_LOST");
      }
    });

    return () => unsubscribe();
  }, [pendingMessages]);

  return { retryFailedMessages };
}
