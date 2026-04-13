import { 
  withRepeat, 
  withTiming, 
  withSequence, 
  withSpring, 
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp
} from "react-native-reanimated";

// ── Shared timing configurations ─────────────────────────────
export const springConfig = {
  damping: 15,
  stiffness: 120,
  mass: 1,
};

export const timingConfig = {
  duration: 300,
  easing: Easing.out(Easing.exp),
};

// ── Entering & Exiting Layout Animations (Reanimated v3) ────
export const layoutAnimations = {
  fadeIn: FadeIn.duration(300),
  fadeOut: FadeOut.duration(200),
  slideUp: FadeInDown.springify().damping(15).stiffness(120),
  slideDown: FadeInUp.springify().damping(15).stiffness(120),
  slideLeft: FadeInRight.springify().damping(15).stiffness(120),
  slideRight: FadeInLeft.springify().damping(15).stiffness(120),
  exitSlideDown: FadeOutDown.duration(200),
  exitSlideUp: FadeOutUp.duration(200),
};

// ── Value-based Animations (for useSharedValue + useAnimatedStyle) ──

/**
 * Creates a breathing effect (scale up to 1.05 and down)
 */
export const breatheAnimation = (duration = 2000) => {
  return withRepeat(
    withSequence(
      withTiming(1.05, { duration, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) })
    ),
    -1, // Infinite
    true // Reverse
  );
};

/**
 * Creates a glowing pulse effect (opacity 0.4 to 1)
 */
export const pulseGlowAnimation = (duration = 1500) => {
  return withRepeat(
    withSequence(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.4, { duration, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    true
  );
};

/**
 * Creates an energetic ping effect like the live indicator
 */
export const livePingAnimation = (duration = 1000) => {
  return withRepeat(
    withSequence(
      withTiming(1.2, { duration: duration * 0.4, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: duration * 0.6, easing: Easing.in(Easing.ease) })
    ),
    -1,
    true
  );
};

export const hoverScale = (isHovered: boolean) => {
  return withSpring(isHovered ? 1.02 : 1, springConfig);
};

export const pressScale = (isPressed: boolean) => {
  return withSpring(isPressed ? 0.95 : 1, springConfig);
};
