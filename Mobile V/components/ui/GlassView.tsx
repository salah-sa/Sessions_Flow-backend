/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — GlassView Component
 * Phase 6: Interaction System Parity
 * ═══════════════════════════════════════════════════════════
 * 
 * Desktop Parity:
 * - base: `card-base` (rgba(15,23,42,0.6) + backdrop blur)
 * - aero: `card-aero` (rgba(15,23,42,0.75) + emerald border + glow)
 */

import React from "react";
import { View, StyleSheet, ViewProps, ViewStyle, StyleProp, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import Animated from "react-native-reanimated";
import { theme } from "../../shared/theme";
import { useAnimatedPress } from "../../shared/hooks/useAnimatedPress";

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: "light" | "dark" | "default";
  borderRadius?: number;
  variant?: "base" | "aero";
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  interactive?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassView = ({ 
  children, 
  intensity = 30, 
  tint = "dark", 
  borderRadius = theme.radius.xl, // Desktop defaults to xl/2xl
  variant = "base",
  style,
  contentContainerStyle,
  onPress,
  interactive = false,
  ...props 
}: GlassViewProps) => {
  const isInteractive = onPress !== undefined || interactive;
  
  const { animatedStyle, pressHandlers } = useAnimatedPress({
    haptic: true,
    scale: 0.98,
  });

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const { 
    padding, paddingHorizontal, paddingVertical, 
    paddingTop, paddingBottom, paddingLeft, paddingRight,
    ...outerStyle 
  } = flattenedStyle as any;

  const innerExtractedStyle = {
    padding, paddingHorizontal, paddingVertical, 
    paddingTop, paddingBottom, paddingLeft, paddingRight
  };

  const content = (
    <View style={[
      styles.outer, 
      variant === "base" ? styles.baseVariant : styles.aeroVariant,
      { borderRadius },
      outerStyle
    ]} {...props}>
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={[styles.blur, { borderRadius }]}
      >
        <View style={[styles.inner, innerExtractedStyle, contentContainerStyle]}>
          {children}
        </View>
      </BlurView>
    </View>
  );

  if (isInteractive) {
    return (
      <AnimatedPressable 
        onPress={onPress}
        onPressIn={pressHandlers.onPressIn}
        onPressOut={pressHandlers.onPressOut}
        style={animatedStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  outer: {
    overflow: "hidden",
  },
  baseVariant: {
    backgroundColor: "rgba(15,23,42,0.6)", // Desktop card-base
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  aeroVariant: {
    backgroundColor: "rgba(15,23,42,0.75)", // Desktop card-aero
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.15)", // Desktop emerald accent
    // shadow-[0_0_12px_rgba(16,185,129,0.15)]
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  blur: {
    flex: 1,
  },
  inner: {
    // Padding is dynamically injected from `style` prop or contentContainerStyle
  }
});
