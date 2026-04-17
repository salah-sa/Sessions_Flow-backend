import { IUIStyle } from "../IUIStyle";

export class CyberpunkStyle implements IUIStyle {
  name = "Cyberpunk";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#050505");
    this.setVar("--ui-surface", "#111111");
    this.setVar("--ui-surface-hover", "#1a1a1a");
    this.setVar("--ui-border-color", "#facc15");
    this.setVar("--ui-accent", "#facc15");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Orbitron', sans-serif");
    this.setVar("--ui-font-display", "'Orbitron', sans-serif");
    this.setVar("--ui-letter-spacing", "0.2em");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "0.9");
    this.setVar("--ui-padding-card", "1.5rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "0px");
    this.setVar("--ui-radius-btn", "0px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "0 0 15px rgba(250, 204, 21, 0.4)");
    this.setVar("--ui-border-width", "2px");
  }
}
