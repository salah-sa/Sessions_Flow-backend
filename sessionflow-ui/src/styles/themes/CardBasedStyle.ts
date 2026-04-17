import { IUIStyle } from "../IUIStyle";

export class CardBasedStyle implements IUIStyle {
  readonly name = "CardBased";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#f0f2f5");
    this.setProp("--ui-surface", "#ffffff");
    this.setProp("--ui-surface-hover", "#f8f9fa");
    this.setProp("--ui-accent", "#1877f2");
    this.setProp("--ui-border-color", "#e4e6eb");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Segoe UI', Helvetica, Arial, sans-serif");
    this.setProp("--ui-letter-spacing", "normal");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1.25rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "8px");
    this.setProp("--ui-radius-btn", "6px");
    this.setProp("--ui-border-width", "1px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "0 1px 2px rgba(0, 0, 0, 0.1)");
  }
}
