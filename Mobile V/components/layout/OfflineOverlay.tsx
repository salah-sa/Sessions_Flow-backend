import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";

export const OfflineOverlay: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // NetInfo states could flutter, so debounce the offline trigger
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        // We consider offline if isConnected is strictly false.
        setIsOffline(state.isConnected === false);
      }, 1000); // 1-second debounce to prevent airplane toggle flutter
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(1000)} 
      exiting={FadeOut.duration(500)}
      style={StyleSheet.absoluteFill}
    >
      <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
        <View style={styles.content}>
          <View style={styles.iconRing}>
            <Ionicons name="cloud-offline" size={48} color={theme.colors.error} />
          </View>
          <Text style={styles.title}>NO MATRIX GRID SIGNAL</Text>
          <Text style={styles.subtitle}>
            You are completely disconnected. The interface is operating off cached residues.
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    zIndex: 1000,
  },
  content: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  title: {
    fontFamily: theme.typography.h2.fontFamily,
    fontSize: theme.typography.h3.fontSize,
    color: theme.colors.error,
    letterSpacing: 2,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textDim,
    textAlign: "center",
    lineHeight: 22,
  }
});
