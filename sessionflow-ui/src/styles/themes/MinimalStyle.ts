import { IUIStyle } from "../IUIStyle";

export class MinimalStyle implements IUIStyle {
  readonly name = "Minimal";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#ffffff");
    this.setProp("--ui-surface", "#ffffff");
    this.setProp("--ui-surface-hover", "#fafafa");
    this.setProp("--ui-accent", "#000000");
    this.setProp("--ui-border-color", "#e1e1e1");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Outfit', sans-serif");
    this.setProp("--ui-letter-spacing", "0.05em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "3rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "0px");
    this.setProp("--ui-radius-btn", "0px");
    this.setProp("--ui-border-width", "1px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "none");
  }
}
