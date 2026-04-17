import { IUIStyle } from "../IUIStyle";

export class GlassmorphismStyle implements IUIStyle {
  readonly name = "Glassmorphism";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "rgb(2, 6, 23)");
    this.setProp("--ui-surface", "rgba(15, 23, 42, 0.6)");
    this.setProp("--ui-surface-hover", "rgba(30, 41, 59, 0.7)");
    this.setProp("--ui-accent", "rgb(16, 185, 129)");
    this.setProp("--ui-border-color", "rgba(255, 255, 255, 0.08)");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Inter', sans-serif");
    this.setProp("--ui-letter-spacing", "-0.02em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1.75rem");
    this.setProp("--ui-gap-grid", "1.5rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "1.5rem");
    this.setProp("--ui-radius-btn", "0.75rem");
    this.setProp("--ui-border-width", "1px");
    this.setProp("--ui-glass-blur", "16px");
    this.setProp("--ui-shadow-card", "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)");
  }
}
