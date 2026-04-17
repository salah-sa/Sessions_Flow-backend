import { IUIStyle } from "../IUIStyle";

export class CardBasedStyle implements IUIStyle {
  name = "CardBased";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#f0f2f5");
    this.setVar("--ui-surface", "#ffffff");
    this.setVar("--ui-surface-hover", "#fafafa");
    this.setVar("--ui-border-color", "transparent");
    this.setVar("--ui-accent", "#3b82f6");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Inter', sans-serif");
    this.setVar("--ui-font-display", "'Inter', sans-serif");
    this.setVar("--ui-letter-spacing", "normal");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "1.1");
    this.setVar("--ui-padding-card", "2rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "16px");
    this.setVar("--ui-radius-btn", "8px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)");
    this.setVar("--ui-border-width", "0px");
  }
}
