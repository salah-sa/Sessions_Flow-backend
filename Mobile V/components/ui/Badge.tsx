import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../shared/theme";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Badge System
 * Phase 33: Global Indicator Language
 * ═══════════════════════════════════════════════════════════
 */

interface BadgeProps {
  count?: number;
  label?: string;
  variant?: "primary" | "error" | "success" | "warning" | "outline" | "dim" | "info";
  dot?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const Badge = ({ count, label, variant = "primary", dot, style, children }: BadgeProps) => {
  const getBGColor = () => {
    switch (variant) {
      case "error": return theme.colors.error;
      case "success": return theme.colors.success;
      case "warning": return theme.colors.warning;
      case "outline": return "transparent";
      case "info": return theme.colors.secondary;
      case "dim": return "rgba(255,255,255,0.05)";
      default: return theme.colors.primary;
    }
  };

  const getStyles = () => {
    let base: any = [styles.badge, { backgroundColor: getBGColor() }];
    if (variant === "outline") {
      base.push({ borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" });
    }
    return [base, style];
  };

  if (dot) {
    return (
      <View style={[styles.dot, { backgroundColor: getBGColor() }, style]} />
    );
  }

  return (
    <View style={getStyles()}>
      {children ? children : (
        <Text style={styles.text}>
          {label || (count !== undefined ? (count > 99 ? "99+" : count) : "")}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  text: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.bg,
  }
});
