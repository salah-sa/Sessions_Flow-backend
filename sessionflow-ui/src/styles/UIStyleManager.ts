import { useState, useEffect } from "react";
import { IUIStyle } from "./IUIStyle";
import { GlassmorphismStyle } from "./themes/GlassmorphismStyle";
import { MaterialStyle } from "./themes/MaterialStyle";
import { FluentStyle } from "./themes/FluentStyle";
import { NeumorphismStyle } from "./themes/NeumorphismStyle";
import { MinimalStyle } from "./themes/MinimalStyle";
import { BrutalismStyle } from "./themes/BrutalismStyle";
import { CyberpunkStyle } from "./themes/CyberpunkStyle";
import { CardBasedStyle } from "./themes/CardBasedStyle";
import { RetroPixelStyle } from "./themes/RetroPixelStyle";

export const UIStyleConfig = {
  current: "Glassmorphism" as UIStyleName,
  available: [
    "Material",
    "Fluent",
    "Neumorphism",
    "Glassmorphism",
    "Minimal",
    "Brutalism",
    "Cyberpunk",
    "CardBased",
    "RetroPixel"
  ] as const
};

export type UIStyleName = (typeof UIStyleConfig.available)[number];

class StyleManager {
  private styles: Map<string, IUIStyle> = new Map();
  private currentStyle: string = UIStyleConfig.current;
  private listeners: Set<(styleName: string) => void> = new Set();

  register(style: IUIStyle) {
    this.styles.set(style.name, style);
  }

  apply(styleName: string) {
    const style = this.styles.get(styleName);
    if (!style) {
      console.warn(`Style ${styleName} not found in registry.`);
      return;
    }

    this.currentStyle = styleName;
    
    // Apply all layers of the identity
    style.applyColors();
    style.applyTypography();
    style.applySpacing();
    style.applyComponents();

    // Broadcast to React/Subscribers
    this.listeners.forEach(fn => fn(styleName));
    
    // Persist to document attribute for CSS targeting if needed
    document.documentElement.setAttribute('data-ui-style', styleName.toLowerCase());
  }

  subscribe(fn: (styleName: string) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getCurrentStyleName() {
    return this.currentStyle;
  }
}

export const UIStyleManager = new StyleManager();

// Register all styles
UIStyleManager.register(new MaterialStyle());
UIStyleManager.register(new FluentStyle());
UIStyleManager.register(new NeumorphismStyle());
UIStyleManager.register(new GlassmorphismStyle());
UIStyleManager.register(new MinimalStyle());
UIStyleManager.register(new BrutalismStyle());
UIStyleManager.register(new CyberpunkStyle());
UIStyleManager.register(new CardBasedStyle());
UIStyleManager.register(new RetroPixelStyle());

// React hook for convenience
export const useActiveUIStyle = () => {
  const [activeStyle, setActiveStyle] = useState(UIStyleManager.getCurrentStyleName());

  useEffect(() => {
    return UIStyleManager.subscribe(setActiveStyle);
  }, []);

  return activeStyle;
};


