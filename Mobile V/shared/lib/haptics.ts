import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Haptic Feedback Utility
 * Phase 24: Tactile User Interface
 * ═══════════════════════════════════════════════════════════
 */

export const haptics = {
  selection: () => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync();
  },

  impact: (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(style);
  },

  notification: (type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(type);
  },

  success: () => haptics.notification(Haptics.NotificationFeedbackType.Success),
  error: () => haptics.notification(Haptics.NotificationFeedbackType.Error),
  warning: () => haptics.notification(Haptics.NotificationFeedbackType.Warning),

  // Aliases for convenience
  light: () => haptics.impact(Haptics.ImpactFeedbackStyle.Light),
  medium: () => haptics.impact(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => haptics.impact(Haptics.ImpactFeedbackStyle.Heavy),
};
