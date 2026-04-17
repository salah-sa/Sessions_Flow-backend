import { IUIStyle } from "../IUIStyle";

export class GlassmorphismStyle implements IUIStyle {
  name = "Glassmorphism";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#0f172a");
    this.setVar("--ui-surface", "rgba(255, 255, 255, 0.03)");
    this.setVar("--ui-surface-hover", "rgba(255, 255, 255, 0.08)");
    this.setVar("--ui-border-color", "rgba(255, 255, 255, 0.1)");
    this.setVar("--ui-accent", "#60a5fa");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Inter', sans-serif");
    this.setVar("--ui-font-display", "'Inter', sans-serif");
    this.setVar("--ui-letter-spacing", "-0.02em");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "1");
    this.setVar("--ui-padding-card", "2rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "24px");
    this.setVar("--ui-radius-btn", "12px");
    this.setVar("--ui-glass-blur", "16px");
    this.setVar("--ui-shadow-card", "0 8px 32px rgba(0, 0, 0, 0.3)");
    this.setVar("--ui-border-width", "1px");
  }
}
