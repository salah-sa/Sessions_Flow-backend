/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Resilience Layer
 * Phase 88: Global Error Boundary Expansion
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "./GlassView";

interface Props {
  error: Error;
  retry: () => void;
}

export function ErrorFallback({ error, retry }: Props) {
  return (
    <View style={styles.container}>
      <GlassView intensity={40} style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        </View>
        
        <Text style={styles.title}>KERNEL PANIC DETECTED</Text>
        <Text style={styles.message}>
          The application encountered a critical synchronization failure or runtime anomaly.
        </Text>
        
        <GlassView intensity={10} style={styles.errorLog}>
          <Text style={styles.errorText} numberOfLines={3}>
            {error.message}
          </Text>
        </GlassView>

        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <Text style={styles.retryText}>INITIALIZE RECOVERY</Text>
        </TouchableOpacity>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    padding: 32,
    borderRadius: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 3,
    marginBottom: 12,
  },
  message: {
    fontSize: 12,
    color: theme.colors.textDim,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  errorLog: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  errorText: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 10,
    color: "#ef4444",
    opacity: 0.8,
  },
  retryBtn: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 2,
  }
});
