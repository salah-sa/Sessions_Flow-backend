import { IUIStyle } from "../IUIStyle";

export class FluentStyle implements IUIStyle {
  readonly name = "Fluent";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#faf9f8");
    this.setProp("--ui-surface", "rgba(255, 255, 255, 0.7)");
    this.setProp("--ui-surface-hover", "rgba(255, 255, 255, 0.9)");
    this.setProp("--ui-accent", "#0078d4");
    this.setProp("--ui-border-color", "rgba(0,0,0,0.05)");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Segoe UI', sans-serif");
    this.setProp("--ui-letter-spacing", "0");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1.25rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "6px");
    this.setProp("--ui-radius-btn", "4px");
    this.setProp("--ui-border-width", "1px");
    this.setProp("--ui-glass-blur", "20px");
    this.setProp("--ui-shadow-card", "0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)");
  }
}
