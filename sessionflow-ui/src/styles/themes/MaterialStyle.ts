import { IUIStyle } from "../IUIStyle";

export class MaterialStyle implements IUIStyle {
  readonly name = "Material";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#f5f5f5");
    this.setProp("--ui-surface", "#ffffff");
    this.setProp("--ui-surface-hover", "#fafafa");
    this.setProp("--ui-accent", "#6200ee");
    this.setProp("--ui-border-color", "rgba(0,0,0,0.12)");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Roboto', sans-serif");
    this.setProp("--ui-letter-spacing", "0.01em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "4px");
    this.setProp("--ui-radius-btn", "4px");
    this.setProp("--ui-border-width", "0px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "0 2px 4px rgba(0,0,0,0.2)");
  }
}
