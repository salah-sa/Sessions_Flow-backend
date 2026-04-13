/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Design System Tokens
 * PARITY: 1:1 mirror of desktop index.css design tokens
 * ═══════════════════════════════════════════════════════════
 * 
 * Desktop uses oklch() colors — RN requires hex equivalents.
 * Brand palette mapped from oklch(0.5 0.22 240) = #3B82F6 (Electric Blue)
 * Accent mapped from oklch(0.7 0.2 160) = #10B981 (Emerald)
 */

import { Platform } from "react-native";

// ── Brand Palette (oklch → hex mapping) ─────────────────
const brand = {
  50:  "#EFF6FF",  // oklch(0.97 0.01 240)
  100: "#DBEAFE",  // oklch(0.91 0.03 240)
  200: "#BFDBFE",  // oklch(0.82 0.07 240)
  300: "#93C5FD",  // oklch(0.7 0.12 240)
  400: "#60A5FA",  // oklch(0.6 0.18 240)
  500: "#3B82F6",  // oklch(0.5 0.22 240) — MAIN BRAND
  600: "#2563EB",  // oklch(0.4 0.2 240)
  700: "#1D4ED8",  // oklch(0.3 0.15 240)
  800: "#1E3A5F",  // oklch(0.2 0.1 240)
  900: "#0F1D30",  // oklch(0.1 0.05 240)
} as const;

// ── Semantic Color Tokens ───────────────────────────────
const darkColors = {
  // Core
  bg: "#020617",         // --color-ui-bg: slate-950
  surface: "rgba(15, 23, 42, 0.75)", // --color-ui-surface
  bgElevated: "#0F172A", // --color-ui-elevated: slate-900
  bgInput: "#1E293B",    // --color-ui-input: slate-800
  text: "#F8FAFC",       // slate-50
  textDim: "#94A3B8",    // slate-400
  textMuted: "#64748B",  // slate-500

  // Brand
  primary: brand[500],   // Electric Blue #3B82F6
  primaryDim: "rgba(59, 130, 246, 0.15)",
  secondary: brand[400],

  // Accents
  accent: "#10B981",     // Emerald — oklch(0.7 0.2 160)
  accentDim: "rgba(16, 185, 129, 0.15)",
  accentCyan: "#06D6A0", // oklch(0.7 0.2 190)

  // Borders
  border: "rgba(255, 255, 255, 0.05)", // --glass-border
  borderLight: "rgba(255, 255, 255, 0.08)",
  borderBrand: "rgba(59, 130, 246, 0.2)",
  borderAccent: "rgba(16, 185, 129, 0.15)",

  // Status
  success: "#10B981",    // Emerald
  warning: "#F59E0B",    // Amber
  error: "#EF4444",      // Red
  info: brand[500],

  // Card
  cardBg: "rgba(255, 255, 255, 0.02)",
  cardAeroBg: "rgba(16, 185, 129, 0.03)",
  cardAeroBorder: "rgba(16, 185, 129, 0.1)",

  // Glass
  glassBg: "rgba(15, 23, 42, 0.6)",
  glassBorder: "rgba(255, 255, 255, 0.05)",
};

type ColorScheme = typeof darkColors;

// ── Light Theme Inversions (matches .theme-light CSS) ───
const lightColors: ColorScheme = {
  bg: "#F8FAFC",
  surface: "rgba(255, 255, 255, 0.75)",
  bgElevated: "#FFFFFF",
  bgInput: "#F1F5F9",
  text: "#0F172A",
  textDim: "#64748B",
  textMuted: "#94A3B8",

  primary: brand[500],
  primaryDim: "rgba(59, 130, 246, 0.1)",
  secondary: brand[400],

  accent: "#10B981",
  accentDim: "rgba(16, 185, 129, 0.1)",
  accentCyan: "#06D6A0",

  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.06)",
  borderBrand: "rgba(59, 130, 246, 0.15)",
  borderAccent: "rgba(16, 185, 129, 0.1)",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: brand[500],

  cardBg: "rgba(255, 255, 255, 0.7)",
  cardAeroBg: "rgba(16, 185, 129, 0.05)",
  cardAeroBorder: "rgba(16, 185, 129, 0.15)",

  glassBg: "rgba(255, 255, 255, 0.6)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
};

// ── Typography (matches desktop font families + scale) ──
const typography = {
  fontFamily: {
    sans: Platform.select({ ios: "Inter_400Regular", android: "Inter_400Regular", default: "Inter" }),
    sora: Platform.select({ ios: "Sora_700Bold", android: "Sora_700Bold", default: "Sora" }),
    brand: "Orbitron", // Desktop uses font-brand for logo/branding text
    cairo: "Cairo",    // RTL Arabic font
  },
  // Heading presets — match desktop `h1-h6 { font-sora font-bold }`
  h1: { fontFamily: "Sora_700Bold", fontSize: 32, lineHeight: 40, fontWeight: "900" as const },
  h2: { fontFamily: "Sora_700Bold", fontSize: 24, lineHeight: 32, fontWeight: "800" as const },
  h3: { fontFamily: "Sora_700Bold", fontSize: 20, lineHeight: 28, fontWeight: "700" as const },
  h4: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24, fontWeight: "700" as const },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  label: { fontFamily: "Inter_700Bold", fontSize: 10, lineHeight: 14, fontWeight: "900" as const, letterSpacing: 2 },
  // Desktop text scale equivalents
  scale: {
    xs: 10,    // 0.7rem ≈ 10px
    sm: 12,    // 0.8rem ≈ 12px
    base: 14,  // 0.95rem ≈ 14px
    lg: 16,    // 1.1rem ≈ 16px
    xl: 18,    // 1.25rem ≈ 18px
    "2xl": 22, // 1.5rem ≈ 22px
    "3xl": 32, // 2.2rem ≈ 32px
    "4xl": 40, // 2.8rem ≈ 40px
  },
};

// ── Spacing ─────────────────────────────────────────────
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

// ── Accessibility (WCAG 2.1 standards) ──────────────────
const accessibility = {
  minTouchTarget: 44, // Minimum touch target size (pt)
  highContrastBorder: "rgba(255, 255, 255, 0.1)",
  hapticSuccess: "success",
  hapticWarning: "warning",
  hapticError: "error",
};

// ── Border Radii (matches desktop --radius-xl/2xl/3xl) ──
const radius = {
  sm: 8,
  md: 12,
  lg: 16,   // --radius-xl: 1rem
  xl: 24,   // --radius-2xl: 1.5rem
  "2xl": 32,
  "3xl": 40,// --radius-3xl: 2.5rem
  full: 9999,
};

// ── Shadows (platform-adapted from desktop --shadow-glow) ──
const shadows = {
  glow: {
    shadowColor: brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glowEmerald: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glowCyan: {
    shadowColor: "#06D6A0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardAero: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
};

// ── Exported theme (default dark) ───────────────────────
export const theme = {
  brand,
  colors: darkColors,
  lightColors,
  darkColors,
  typography,
  spacing,
  radius,
  shadows,
  accessibility,
};

/** Helper to get colors for a specific theme mode */
export const getThemeColors = (mode: "dark" | "light") =>
  mode === "light" ? lightColors : darkColors;

// ── Animation Presets (mirror desktop motion language) ───
// Desktop uses: cubic-bezier(0.16, 1, 0.3, 1) for page transitions
// Desktop uses: spring physics for interactive elements
export const motion = {
  // Spring configs matching desktop "expo.out" GSAP easing
  spring: {
    default: { damping: 15, stiffness: 150 },
    gentle: { damping: 20, stiffness: 120 },
    snappy: { damping: 12, stiffness: 200 },
    bouncy: { damping: 8, stiffness: 180 },
  },
  // Duration presets matching desktop CSS transitions
  duration: {
    fast: 200,     // transition-all duration-200
    normal: 300,   // transition-all duration-300
    slow: 500,     // transition-all duration-500
    page: 600,     // GSAP page transition 0.6s
  },
  // Stagger interval for list items (desktop: 80ms per field)
  stagger: {
    list: 60,      // list item animation offset
    form: 80,      // form field animation offset (desktop stagger-1 through stagger-5)
  },
  // Press feedback scale (desktop: active:scale-95)
  press: {
    scale: 0.95,
  },
} as const;
