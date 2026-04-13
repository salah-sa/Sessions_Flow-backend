import React, { useEffect } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate
} from "react-native-reanimated";
import { theme } from "../../shared/theme";
import { GlassView } from "./GlassView";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Tactical Radar HUD
 * Phase 68: Active Telemetry & Progress (Aero Glass)
 * ═══════════════════════════════════════════════════════════
 */

interface RadarHUDProps {
  presentCount: number;
  totalCount: number;
}

export const RadarHUD = ({ presentCount, totalCount }: RadarHUDProps) => {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1.2, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      true
    );
  }, []);

  const animatedSweeperStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.2], [0.3, 0]),
  }));

  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <GlassView intensity={20} style={styles.container}>
      <View style={styles.radarContainer}>
        {/* Concentric Rings */}
        <View style={[styles.ring, { width: "100%", height: "100%" }]} />
        <View style={[styles.ring, { width: "66%", height: "66%" }]} />
        <View style={[styles.ring, { width: "33%", height: "33%" }]} />
        
        {/* Axis Lines */}
        <View style={styles.axisH} />
        <View style={styles.axisV} />

        {/* Sweeper */}
        <Animated.View style={[styles.sweeper, animatedSweeperStyle]}>
          <View style={styles.sweeperGradient} />
        </Animated.View>

        {/* Outer Pulse */}
        <Animated.View style={[styles.outerPulse, animatedPulseStyle]} />

        {/* Central Metric */}
        <View style={styles.content}>
          <Text style={styles.percentageText}>{percentage}%</Text>
          <Text style={styles.subText}>INTEGRITY</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PRESENT</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{presentCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>REMAINING</Text>
          <Text style={styles.metricValue}>{totalCount - presentCount}</Text>
        </View>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 32,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  radarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  ring: {
    position: "absolute",
    borderRadius: 1000,
    borderWidth: 0.5,
    borderColor: "rgba(14, 165, 233, 0.1)",
  },
  axisH: {
    position: "absolute",
    width: "100%",
    height: 0.5,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  axisV: {
    position: "absolute",
    width: 0.5,
    height: "100%",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  sweeper: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 80,
  },
  sweeperGradient: {
    width: "50%",
    height: "50%",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderTopLeftRadius: 80,
    borderRightWidth: 1,
    borderRightColor: "rgba(14, 165, 233, 0.4)",
  },
  outerPulse: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  content: {
    alignItems: "center",
  },
  percentageText: {
    color: theme.colors.text,
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.sora,
    fontWeight: "900",
  },
  subText: {
    color: theme.colors.primary,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
  },
  metrics: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
  },
  divider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
  }
});
