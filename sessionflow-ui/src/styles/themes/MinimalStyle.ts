import { IUIStyle } from "../IUIStyle";

export class MinimalStyle implements IUIStyle {
  name = "Minimal";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#ffffff");
    this.setVar("--ui-surface", "#ffffff");
    this.setVar("--ui-surface-hover", "#fafafa");
    this.setVar("--ui-border-color", "#eeeeee");
    this.setVar("--ui-accent", "#000000");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Inter', sans-serif");
    this.setVar("--ui-font-display", "'Inter', sans-serif");
    this.setVar("--ui-letter-spacing", "-0.01em");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "1.5");
    this.setVar("--ui-padding-card", "3rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "0px");
    this.setVar("--ui-radius-btn", "0px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "none");
    this.setVar("--ui-border-width", "1px");
  }
}
