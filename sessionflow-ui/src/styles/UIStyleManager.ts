import { useState, useEffect } from "react";
import { IUIStyle } from "./IUIStyle";
import { ObsidianStyle } from "./themes/ObsidianStyle";

export interface CustomTheme {
  accent: string;
  background: string;
  surface: string;
  sidebar: string;
}

const availableStyles = [
  "Obsidian"
] as const;

export type UIStyleName = (typeof availableStyles)[number];

export const UIStyleConfig = {
  current: "Obsidian" as UIStyleName,
  available: availableStyles
};

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "167, 139, 250"; // Fallback to default accent rgb
};

class StyleManager {
  private styles: Map<string, IUIStyle> = new Map();
  private currentStyle: string = UIStyleConfig.current;
  private currentCustomTheme: CustomTheme | null = null;
  private listeners: Set<(styleName: UIStyleName) => void> = new Set();

  register(style: IUIStyle) {
    this.styles.set(style.name, style);
  }

  apply(styleName: UIStyleName, customTheme: CustomTheme | null = null) {
    const style = this.styles.get(styleName);
    if (!style) {
      console.warn(`Style ${styleName} not found in registry.`);
      return;
    }

    this.currentStyle = styleName;
    this.currentCustomTheme = customTheme;
    
    // Apply all layers of the identity
    style.applyColors();
    style.applyTypography();
    style.applySpacing();
    style.applyComponents();

    // Apply custom overrides if they exist
    if (customTheme) {
      this.applyCustomOverrides(customTheme);
    }

    // Broadcast to React/Subscribers
    this.listeners.forEach(fn => fn(styleName as UIStyleName));
    
    // Persist to document attribute for CSS targeting
    document.documentElement.setAttribute('data-ui-style', styleName.toLowerCase());
  }

  private applyCustomOverrides(theme: CustomTheme) {
    const set = (name: string, val: string) => document.documentElement.style.setProperty(name, val);
    
    if (theme.accent) {
      set("--ui-accent", theme.accent);
      set("--ui-accent-rgb", hexToRgb(theme.accent));
    }
    if (theme.background) set("--ui-bg", theme.background);
    if (theme.surface) {
      set("--ui-surface", theme.surface);
      // Generate hover state (slightly lighter/darker)
      set("--ui-surface-hover", theme.surface + "cc"); // simplified alpha for now
    }
    if (theme.sidebar) set("--ui-sidebar-bg", theme.sidebar);
  }

  subscribe(fn: (styleName: UIStyleName) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  getCurrentStyleName() {
    return this.currentStyle as UIStyleName;
  }
}

export const UIStyleManager = new StyleManager();

// Register styles - strictly restricted to Obsidian Protocol
UIStyleManager.register(new ObsidianStyle());

// Set default
UIStyleManager.apply(UIStyleConfig.current);

// React hook for convenience
export const useActiveUIStyle = () => {
  const [activeStyle, setActiveStyle] = useState(UIStyleManager.getCurrentStyleName());

  useEffect(() => {
    const unsubscribe = UIStyleManager.subscribe(setActiveStyle);
    return () => { unsubscribe(); };
  }, []);

  return activeStyle;
};
