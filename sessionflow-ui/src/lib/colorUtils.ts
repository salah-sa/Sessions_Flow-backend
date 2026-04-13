export type TagColor = 
  | "slate" | "blue" | "emerald" | "amber" | "red" 
  | "purple" | "pink" | "cyan" | "indigo" | "orange";

export interface ColorVariations {
  bgBase: string;
  bgLightHover: string;
  textBase: string;
  textHover: string;
  borderLight: string;
  borderBaseHover: string;
  cardHoverBorder: string;
  ring: string;
}

export const colorMap: Record<TagColor, ColorVariations> = {
  slate: {
    bgBase: "bg-slate-500",
    bgLightHover: "group-hover/cadet:bg-slate-500/10",
    textBase: "text-slate-400",
    textHover: "group-hover/cadet:text-slate-400",
    borderLight: "border-slate-500/30",
    borderBaseHover: "group-hover/cadet:border-slate-500/50",
    cardHoverBorder: "hover:border-slate-500/30",
    ring: "border-slate-500/30"
  },
  blue: {
    bgBase: "bg-blue-500",
    bgLightHover: "group-hover/cadet:bg-blue-500/10",
    textBase: "text-blue-400",
    textHover: "group-hover/cadet:text-blue-400",
    borderLight: "border-blue-500/30",
    borderBaseHover: "group-hover/cadet:border-blue-500/50",
    cardHoverBorder: "hover:border-blue-500/30",
    ring: "border-blue-500/30"
  },
  emerald: {
    bgBase: "bg-emerald-500",
    bgLightHover: "group-hover/cadet:bg-emerald-500/10",
    textBase: "text-emerald-400",
    textHover: "group-hover/cadet:text-emerald-400",
    borderLight: "border-emerald-500/30",
    borderBaseHover: "group-hover/cadet:border-emerald-500/50",
    cardHoverBorder: "hover:border-emerald-500/30",
    ring: "border-emerald-500/30"
  },
  amber: {
    bgBase: "bg-amber-500",
    bgLightHover: "group-hover/cadet:bg-amber-500/10",
    textBase: "text-amber-400",
    textHover: "group-hover/cadet:text-amber-400",
    borderLight: "border-amber-500/30",
    borderBaseHover: "group-hover/cadet:border-amber-500/50",
    cardHoverBorder: "hover:border-amber-500/30",
    ring: "border-amber-500/30"
  },
  red: {
    bgBase: "bg-red-500",
    bgLightHover: "group-hover/cadet:bg-red-500/10",
    textBase: "text-red-400",
    textHover: "group-hover/cadet:text-red-400",
    borderLight: "border-red-500/30",
    borderBaseHover: "group-hover/cadet:border-red-500/50",
    cardHoverBorder: "hover:border-red-500/30",
    ring: "border-red-500/30"
  },
  purple: {
    bgBase: "bg-purple-500",
    bgLightHover: "group-hover/cadet:bg-purple-500/10",
    textBase: "text-purple-400",
    textHover: "group-hover/cadet:text-purple-400",
    borderLight: "border-purple-500/30",
    borderBaseHover: "group-hover/cadet:border-purple-500/50",
    cardHoverBorder: "hover:border-purple-500/30",
    ring: "border-purple-500/30"
  },
  pink: {
    bgBase: "bg-pink-500",
    bgLightHover: "group-hover/cadet:bg-pink-500/10",
    textBase: "text-pink-400",
    textHover: "group-hover/cadet:text-pink-400",
    borderLight: "border-pink-500/30",
    borderBaseHover: "group-hover/cadet:border-pink-500/50",
    cardHoverBorder: "hover:border-pink-500/30",
    ring: "border-pink-500/30"
  },
  cyan: {
    bgBase: "bg-cyan-500",
    bgLightHover: "group-hover/cadet:bg-cyan-500/10",
    textBase: "text-cyan-400",
    textHover: "group-hover/cadet:text-cyan-400",
    borderLight: "border-cyan-500/30",
    borderBaseHover: "group-hover/cadet:border-cyan-500/50",
    cardHoverBorder: "hover:border-cyan-500/30",
    ring: "border-cyan-500/30"
  },
  indigo: {
    bgBase: "bg-indigo-500",
    bgLightHover: "group-hover/cadet:bg-indigo-500/10",
    textBase: "text-indigo-400",
    textHover: "group-hover/cadet:text-indigo-400",
    borderLight: "border-indigo-500/30",
    borderBaseHover: "group-hover/cadet:border-indigo-500/50",
    cardHoverBorder: "hover:border-indigo-500/30",
    ring: "border-indigo-500/30"
  },
  orange: {
    bgBase: "bg-orange-500",
    bgLightHover: "group-hover/cadet:bg-orange-500/10",
    textBase: "text-orange-400",
    textHover: "group-hover/cadet:text-orange-400",
    borderLight: "border-orange-500/30",
    borderBaseHover: "group-hover/cadet:border-orange-500/50",
    cardHoverBorder: "hover:border-orange-500/30",
    ring: "border-orange-500/30"
  }
};

export function getColorVars(color?: string): ColorVariations {
  const normalized = (color || "emerald").toLowerCase();
  
  if (normalized === "brand") return colorMap["emerald"]; // Map legacy brand to emerald
  
  return colorMap[normalized as TagColor] || colorMap.slate;
}
