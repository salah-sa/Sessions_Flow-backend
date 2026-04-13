/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Color Utilities
 * Handles mapping semantic colors to hex codes for RN styles.
 * ═══════════════════════════════════════════════════════════
 */

export type TagColor = 
  | "slate" | "blue" | "emerald" | "amber" | "red" 
  | "purple" | "pink" | "cyan" | "indigo" | "orange";

export interface ColorVariations {
  base: string;
  light: string;
  dark: string;
  muted: string;
}

export const colorMap: Record<TagColor, ColorVariations> = {
  slate: { base: "#64748b", light: "#94a3b8", dark: "#475569", muted: "rgba(100, 116, 139, 0.15)" },
  blue: { base: "#3b82f6", light: "#60a5fa", dark: "#2563eb", muted: "rgba(59, 130, 246, 0.15)" },
  emerald: { base: "#10b981", light: "#34d399", dark: "#059669", muted: "rgba(16, 185, 129, 0.15)" },
  amber: { base: "#f59e0b", light: "#fbbf24", dark: "#d97706", muted: "rgba(245, 158, 11, 0.15)" },
  red: { base: "#ef4444", light: "#f87171", dark: "#dc2626", muted: "rgba(239, 68, 68, 0.15)" },
  purple: { base: "#a855f7", light: "#c084fc", dark: "#9333ea", muted: "rgba(168, 85, 247, 0.15)" },
  pink: { base: "#ec4899", light: "#f472b6", dark: "#db2777", muted: "rgba(236, 72, 153, 0.15)" },
  cyan: { base: "#06b6d4", light: "#22d3ee", dark: "#0891b2", muted: "rgba(6, 182, 212, 0.15)" },
  indigo: { base: "#6366f1", light: "#818cf8", dark: "#4f46e5", muted: "rgba(99, 102, 241, 0.15)" },
  orange: { base: "#f97316", light: "#fb923c", dark: "#ea580c", muted: "rgba(249, 115, 22, 0.15)" },
};

export function getColorVars(color?: string): ColorVariations {
  const normalized = (color || "emerald").toLowerCase();
  if (normalized === "brand") return colorMap["emerald"];
  return colorMap[normalized as TagColor] || colorMap.slate;
}
