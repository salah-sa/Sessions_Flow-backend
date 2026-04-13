/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Connection Status Banner
 * PARITY: 1:1 mirror of desktop ConnectionBanner.tsx
 * Shows reconnecting/degraded/offline status with animations
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "../../shared/store/stores";
import { theme } from "../../shared/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { 
  FadeInUp, 
  FadeOutUp,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue 
} from "react-native-reanimated";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

export const ConnectionBanner: React.FC = () => {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const connectionMode = useAppStore((s) => s.connectionMode);
  const insets = useSafeAreaInsets();

  // Pulse animation for reconnecting state
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (connectionStatus === "Reconnecting") {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 800 }),
        -1,
        true
      );
    } else {
      opacity.value = 1;
    }
  }, [connectionStatus]);

  const animatedPulse = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Only show when NOT fully connected
  if (connectionStatus === "Connected" && connectionMode === "full") {
    return null;
  }

  const config = getBannerConfig(connectionStatus, connectionMode);

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(300)}
      style={[
        styles.banner, 
        { paddingTop: insets.top + 4, backgroundColor: config.bg }
      ]}
    >
      <Animated.View style={[styles.content, animatedPulse]}>
        <Ionicons name={config.icon as any} size={14} color={config.color} />
        <Text style={[styles.text, { color: config.color }]}>
          {config.message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

function getBannerConfig(status: string, mode: string) {
  if (status === "Reconnecting") {
    return {
      bg: "rgba(245, 158, 11, 0.15)",
      color: "#F59E0B",
      icon: "wifi-outline",
      message: "RECONNECTING TO SERVER...",
    };
  }
  if (mode === "degraded") {
    return {
      bg: "rgba(239, 68, 68, 0.15)",
      color: "#EF4444",
      icon: "alert-circle-outline",
      message: "DEGRADED MODE — LIMITED FUNCTIONALITY",
    };
  }
  if (mode === "hybrid") {
    return {
      bg: "rgba(59, 130, 246, 0.15)",
      color: "#3B82F6",
      icon: "sync-outline",
      message: "SYNCING — SOME DATA MAY BE STALE",
    };
  }
  return {
    bg: "rgba(239, 68, 68, 0.15)",
    color: "#EF4444",
    icon: "cloud-offline-outline",
    message: "OFFLINE — CACHED DATA ONLY",
  };
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
