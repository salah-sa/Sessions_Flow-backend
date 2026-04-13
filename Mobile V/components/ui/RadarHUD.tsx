import React, { useEffect } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate,
  useDerivedValue,
  withSpring,
  useAnimatedProps
} from "react-native-reanimated";
import { theme } from "../../shared/theme";
import { GlassView } from "./GlassView";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Tactical Radar HUD
 * Phase 44: SVG Saturation & Grid Telemetry
 * ═══════════════════════════════════════════════════════════
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadarHUDProps {
  presentCount: number;
  totalCount: number;
}

export const RadarHUD = ({ presentCount, totalCount, attendanceRecords = [] }: RadarHUDProps & { attendanceRecords?: any[] }) => {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const progress = useSharedValue(0);

  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1.15, { duration: 2500, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      true
    );
  }, []);

  const percentage = totalCount > 0 ? (presentCount / totalCount) : 0;

  useEffect(() => {
    progress.value = withSpring(percentage, { damping: 15, stiffness: 60 });
  }, [percentage]);

  const animatedSweeperStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.15], [0.4, 0]),
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  })) as any;

  return (
    <GlassView intensity={20} style={styles.container}>
      <View style={styles.radarWrapper}>
        <View style={styles.radarContainer}>
          {/* Concentric Decorative Rings */}
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

          {/* Simulated Targets (Students) */}
          <View style={StyleSheet.absoluteFill}>
            {attendanceRecords.slice(0, 12).map((record, i) => {
               const angle = (i * 137.5) % 360;
               const rad = 20 + ((i * 17) % 30);
               const isAbsent = record.status === "Absent";
               
               // Calculate x, y from center (0,0 is center of absoluteFill)
               const radInRadians = (angle * Math.PI) / 180;
               const x = Math.cos(radInRadians) * rad;
               const y = Math.sin(radInRadians) * rad;

               return (
                 <View 
                   key={record.studentId || i}
                   style={[
                     styles.targetDot,
                     isAbsent ? styles.targetAbsent : styles.targetPresent,
                     { transform: [{ translateX: x }, { translateY: y }] }
                   ]}
                 />
               );
            })}
          </View>

          <Animated.View style={[styles.outerPulse, animatedPulseStyle]} />

          <View style={styles.content}>
            <Text style={styles.percentageText}>{Math.round(percentage * 100)}%</Text>
            <Text style={styles.subText}>GRID SATURATION</Text>
          </View>
        </View>

        {/* SVG Progress Ring Overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G rotation="-90" origin={`${size/2}, ${size/2}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.colors.primary}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
                fill="none"
              />
            </G>
          </Svg>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PRESENT</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{presentCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>TOTAL PERSONNEL</Text>
          <Text style={styles.metricValue}>{totalCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>REMAINING</Text>
          <Text style={styles.metricValue}>{Math.max(0, totalCount - presentCount)}</Text>
        </View>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 36,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  radarWrapper: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  radarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  ring: {
    position: "absolute",
    borderRadius: 1000,
    borderWidth: 0.5,
    borderColor: "rgba(14, 165, 233, 0.08)",
  },
  axisH: {
    position: "absolute",
    width: "100%",
    height: 0.5,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
  },
  axisV: {
    position: "absolute",
    width: 0.5,
    height: "100%",
    backgroundColor: "rgba(14, 165, 233, 0.08)",
  },
  sweeper: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 75,
  },
  sweeperGradient: {
    width: "50%",
    height: "50%",
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    borderTopLeftRadius: 75,
    borderRightWidth: 1,
    borderRightColor: "rgba(14, 165, 233, 0.4)",
  },
  outerPulse: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  content: {
    alignItems: "center",
    zIndex: 10,
  },
  percentageText: {
    color: theme.colors.text,
    fontSize: 32,
    fontFamily: theme.typography.fontFamily.sora,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subText: {
    color: theme.colors.primary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: -2,
  },
  metrics: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.sora,
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignSelf: "center",
  },
  targetDot: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  targetPresent: {
    backgroundColor: theme.colors.success,
    shadowColor: theme.colors.success,
  },
  targetAbsent: {
    backgroundColor: "red",
    shadowColor: "red",
  }
});
