import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Session } from "../../shared/types";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { differenceInSeconds, format } from "date-fns";
import { haptics } from "../../shared/lib/haptics";
import { router } from "expo-router";

interface LiveSessionTileProps {
  session: Session;
}

export const LiveSessionTile: React.FC<LiveSessionTileProps> = ({ session }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (session.status === "Active") return;
    
    const tick = () => {
      const now = new Date();
      const scheduled = new Date(session.scheduledAt);
      const diff = differenceInSeconds(scheduled, now);
      setSecondsLeft(diff > 0 ? diff : 0);
    };
    
    tick();
    const intv = setInterval(tick, 1000);
    return () => clearInterval(intv);
  }, [session]);

  const isActive = session.status === "Active";

  const renderCountdown = () => {
    if (isActive) return <Text style={styles.liveText}>SESSION IS LIVE • JOIN NOW</Text>;
    
    if (secondsLeft <= 0) return <Text style={styles.liveText}>STARTING ANY MOMENT</Text>;

    const hrs = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;
    
    return (
      <View style={styles.countdownRow}>
        {hrs > 0 && <Text style={styles.counter}>{hrs.toString().padStart(2, '0')}H </Text>}
        <Text style={styles.counter}>{mins.toString().padStart(2, '0')}M </Text>
        <Text style={[styles.counter, { color: theme.colors.textDim }]}>{secs.toString().padStart(2, '0')}S</Text>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(600)} exiting={FadeOutUp}>
      <TouchableOpacity 
        activeOpacity={isActive ? 0.7 : 0.9}
        onPress={() => {
          if (isActive) {
            haptics.impact();
            router.push(`/(tabs)/sessions/${session.id}`);
          }
        }}
        disabled={!isActive}
      >
        <GlassView intensity={50} style={[styles.card, isActive && styles.cardLive]}>
          <View style={styles.header}>
            <View style={[styles.pulseDot, isActive ? styles.pulseLive : styles.pulseUpcoming]} />
            <Text style={[styles.statusTag, isActive ? styles.tagLive : styles.tagUpcoming]}>
              {isActive ? "LIVE NOW" : "UPCOMING SESSION"}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{session.groupName || "Matrix Group"}</Text>
              <Text style={styles.sessionNumber}>Session #{session.sessionNumber}</Text>
            </View>
            <View style={styles.timerBox}>
              {renderCountdown()}
            </View>
          </View>
        </GlassView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 24,
  },
  cardLive: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pulseLive: {
    backgroundColor: theme.colors.success,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  pulseUpcoming: {
    backgroundColor: theme.colors.warning,
  },
  statusTag: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  tagLive: {
    color: theme.colors.success,
  },
  tagUpcoming: {
    color: theme.colors.warning,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontFamily: theme.typography.h3.fontFamily,
    fontSize: theme.typography.h3.fontSize,
    color: theme.colors.text,
    marginBottom: 4,
  },
  sessionNumber: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 12,
    color: theme.colors.textDim,
  },
  timerBox: {
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  liveText: {
    fontFamily: theme.typography.label.fontFamily,
    fontSize: 10,
    color: theme.colors.success,
    letterSpacing: 1,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  counter: {
    fontFamily: theme.typography.label.fontFamily,
    fontSize: 14,
    color: theme.colors.warning,
    letterSpacing: 1,
    fontWeight: "900",
  }
});
