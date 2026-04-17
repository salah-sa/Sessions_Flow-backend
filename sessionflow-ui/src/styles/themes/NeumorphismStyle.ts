import { IUIStyle } from "../IUIStyle";

export class NeumorphismStyle implements IUIStyle {
  readonly name = "Neumorphism";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#e0e0e0");
    this.setProp("--ui-surface", "#e0e0e0");
    this.setProp("--ui-surface-hover", "#e5e5e5");
    this.setProp("--ui-accent", "#2196f3");
    this.setProp("--ui-border-color", "transparent");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Nunito', sans-serif");
    this.setProp("--ui-letter-spacing", "0.02em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "2rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "30px");
    this.setProp("--ui-radius-btn", "15px");
    this.setProp("--ui-border-width", "0px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "9px 9px 16px rgba(163, 177, 198, 0.6), -9px -9px 16px rgba(255, 255, 255, 0.5)");
  }
}
