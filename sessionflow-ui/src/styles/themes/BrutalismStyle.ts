import { IUIStyle } from "../IUIStyle";

export class BrutalismStyle implements IUIStyle {
  name = "Brutalism";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#ffffff");
    this.setVar("--ui-surface", "#ffffff");
    this.setVar("--ui-surface-hover", "#f4f4f4");
    this.setVar("--ui-border-color", "#000000");
    this.setVar("--ui-accent", "#000000");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Inter', sans-serif");
    this.setVar("--ui-font-display", "'Inter', sans-serif");
    this.setVar("--ui-letter-spacing", "0.05em");
    this.setVar("--ui-font-weight-display", "900");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "0.8");
    this.setVar("--ui-padding-card", "1.5rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "0px");
    this.setVar("--ui-radius-btn", "0px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "8px 8px 0px #000000");
    this.setVar("--ui-border-width", "3px");
  }
}
