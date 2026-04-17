import { IUIStyle } from "../IUIStyle";

export class RetroPixelStyle implements IUIStyle {
  readonly name = "RetroPixel";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#000000");
    this.setProp("--ui-surface", "#000000");
    this.setProp("--ui-surface-hover", "#1a1a1a");
    this.setProp("--ui-accent", "#00ff00");
    this.setProp("--ui-border-color", "#ffffff");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Press Start 2P', cursive");
    this.setProp("--ui-letter-spacing", "normal");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "0px");
    this.setProp("--ui-radius-btn", "0px");
    this.setProp("--ui-border-width", "4px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "4px 4px 0px 0px rgba(255, 255, 255, 0.4)");
  }
}
