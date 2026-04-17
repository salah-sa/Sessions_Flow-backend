import { IUIStyle } from "../IUIStyle";

export class BrutalismStyle implements IUIStyle {
  readonly name = "Brutalism";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#f1f1f1");
    this.setProp("--ui-surface", "#ffffff");
    this.setProp("--ui-surface-hover", "#ffff00");
    this.setProp("--ui-accent", "#ff0000");
    this.setProp("--ui-border-color", "#000000");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Space Grotesk', sans-serif");
    this.setProp("--ui-letter-spacing", "-0.05em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "2.5rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "0px");
    this.setProp("--ui-radius-btn", "0px");
    this.setProp("--ui-border-width", "4px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "8px 8px 0px 0px #000000");
  }
}
