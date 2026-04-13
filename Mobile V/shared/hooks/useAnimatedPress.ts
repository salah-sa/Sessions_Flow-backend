/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — useAnimatedPress Hook
 * Phase 6: Global Interaction System
 * ═══════════════════════════════════════════════════════════
 * 
 * Provides spring-based press feedback + optional haptic for any 
 * Pressable component. Mirrors desktop `active:scale-95` behavior
 * with physics-based animation via Reanimated.
 * 
 * Usage:
 *   const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress();
 *   <Animated.View style={[styles.card, animatedStyle]}>
 *     <Pressable onPressIn={onPressIn} onPressOut={onPressOut} ... />
 *   </Animated.View>
 */

import { useCallback } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { motion } from "../theme";
import { haptics } from "../lib/haptics";

interface UseAnimatedPressOptions {
  /** Scale target on press. Default: 0.95 (matches desktop active:scale-95) */
  scale?: number;
  /** Spring config override */
  spring?: { damping?: number; stiffness?: number };
  /** Enable haptic feedback on press. Default: true */
  haptic?: boolean;
}

export function useAnimatedPress(options?: UseAnimatedPressOptions) {
  const {
    scale = motion.press.scale,
    spring = motion.spring.snappy,
    haptic = true,
  } = options ?? {};

  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value, spring) }],
  }));

  const onPressIn = useCallback(() => {
    pressed.value = scale;
    if (haptic) {
      haptics.light();
    }
  }, [scale, haptic]);

  const onPressOut = useCallback(() => {
    pressed.value = 1;
  }, []);

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
    /** Convenience: spread onto Pressable */
    pressHandlers: { onPressIn, onPressOut },
  };
}
