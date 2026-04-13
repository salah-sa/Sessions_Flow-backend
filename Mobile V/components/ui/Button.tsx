/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Button Component
 * PARITY: Desktop `btn-primary` / `btn-ghost` / `btn-danger`
 * ═══════════════════════════════════════════════════════════
 * 
 * Desktop styling reference:
 *   btn-primary: bg-brand-500, 11px, font-black, uppercase,
 *                tracking-widest, shadow-lg, active:scale-95
 *   btn-ghost:   hover:bg-white/5, text-slate-400, 11px
 */

import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { theme } from "../../shared/theme";
import { useAnimatedPress } from "../../shared/hooks/useAnimatedPress";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  /** Icon element rendered before the title */
  icon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = ({
  title,
  onPress,
  loading,
  variant = "primary",
  size = "md",
  style,
  textStyle,
  disabled,
  icon,
}: ButtonProps) => {
  const { animatedStyle, pressHandlers } = useAnimatedPress({
    haptic: !disabled && !loading,
  });

  const handlePress = () => {
    if (loading || disabled) return;
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={pressHandlers.onPressIn}
      onPressOut={pressHandlers.onPressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        sizeStyles[size],
        variantStyles[variant],
        animatedStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" || variant === "ghost" ? theme.colors.primary : "#fff"}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              sizeTextStyles[size],
              variantTextStyles[variant],
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

// ── Variant Styles (match desktop btn-* classes) ──────────

const variantStyles: Record<string, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.2)", // brand-400/20
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  secondary: {
    backgroundColor: "rgba(30, 41, 59, 1)", // slate-800
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: "rgba(239, 68, 68, 0.1)", // red-500/10
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  success: {
    backgroundColor: "rgba(16, 185, 129, 0.1)", // emerald/10
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

const variantTextStyles: Record<string, TextStyle> = {
  primary: { color: "#FFFFFF" },
  secondary: { color: "#F1F5F9" }, // slate-100
  outline: { color: "#94A3B8" },   // slate-400
  ghost: { color: "#94A3B8" },
  danger: { color: "#EF4444" },
  success: { color: "#10B981" },
};

// ── Size Styles (match desktop sm/md/lg) ──────────────────

const sizeStyles: Record<string, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: 16, borderRadius: theme.radius.md },
  md: { height: 48, paddingHorizontal: 24, borderRadius: theme.radius.md },
  lg: { height: 56, paddingHorizontal: 32, borderRadius: theme.radius.lg },
};

const sizeTextStyles: Record<string, TextStyle> = {
  sm: { fontSize: 9 },
  md: { fontSize: 11 },  // Desktop: text-[10px] → bumped slightly for mobile readability
  lg: { fontSize: 12 },
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  disabled: {
    opacity: 0.3,
  },
  text: {
    fontWeight: "900",  // Desktop: font-black
    textTransform: "uppercase",
    letterSpacing: 2,   // Desktop: tracking-widest
  },
});
