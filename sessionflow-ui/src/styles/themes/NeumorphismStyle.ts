import { IUIStyle } from "../IUIStyle";

export class NeumorphismStyle implements IUIStyle {
  name = "Neumorphism";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#e0e5ec");
    this.setVar("--ui-surface", "#e0e5ec");
    this.setVar("--ui-surface-hover", "#e0e5ec");
    this.setVar("--ui-border-color", "rgba(255, 255, 255, 0.4)");
    this.setVar("--ui-accent", "#3498db");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Inter', sans-serif");
    this.setVar("--ui-font-display", "'Inter', sans-serif");
    this.setVar("--ui-letter-spacing", "0.01em");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "1.2");
    this.setVar("--ui-padding-card", "2.5rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "40px");
    this.setVar("--ui-radius-btn", "20px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "20px 20px 60px #bebebe, -20px -20px 60px #ffffff");
    this.setVar("--ui-border-width", "0px");
  }
}
