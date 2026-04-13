import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Haptic Feedback Utility
 * Phase 24: Tactile User Interface
 * ═══════════════════════════════════════════════════════════
 */

export const haptics = {
  /**
   * Selection feedback (subtle tick)
   */
  selection: () => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync();
  },

  /**
   * Impact feedback
   */
  impact: (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(style);
  },

  /**
   * Notification feedback (success, warning, error)
   */
  notification: (type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(type);
  },

  /**
   * Convenient success haptic
   */
  success: () => haptics.notification(Haptics.NotificationFeedbackType.Success),

  /**
   * Convenient error haptic
   */
  error: () => haptics.notification(Haptics.NotificationFeedbackType.Error),

  /**
   * Convenient warning haptic
   */
  warning: () => haptics.notification(Haptics.NotificationFeedbackType.Warning),
};
