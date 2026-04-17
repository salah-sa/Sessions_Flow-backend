import { IUIStyle } from "../IUIStyle";

export class RetroPixelStyle implements IUIStyle {
  name = "RetroPixel";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#202020");
    this.setVar("--ui-surface", "#303030");
    this.setVar("--ui-surface-hover", "#404040");
    this.setVar("--ui-border-color", "#ffffff");
    this.setVar("--ui-accent", "#00ff00");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Courier New', Courier, monospace");
    this.setVar("--ui-font-display", "'Courier New', Courier, monospace");
    this.setVar("--ui-letter-spacing", "0.1em");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "0.7");
    this.setVar("--ui-padding-card", "1rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "0px");
    this.setVar("--ui-radius-btn", "0px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "4px 4px 0px #000000");
    this.setVar("--ui-border-width", "4px");
  }
}
