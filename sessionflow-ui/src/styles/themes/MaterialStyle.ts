import { IUIStyle } from "../IUIStyle";

export class MaterialStyle implements IUIStyle {
  name = "Material";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#fafafa");
    this.setVar("--ui-surface", "#ffffff");
    this.setVar("--ui-surface-hover", "#f5f5f5");
    this.setVar("--ui-border-color", "rgba(0, 0, 0, 0.12)");
    this.setVar("--ui-accent", "#6200ee");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Roboto', sans-serif");
    this.setVar("--ui-font-display", "'Roboto', sans-serif");
    this.setVar("--ui-letter-spacing", "0.0125em");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "1");
    this.setVar("--ui-padding-card", "1rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "12px");
    this.setVar("--ui-radius-btn", "8px");
    this.setVar("--ui-glass-blur", "0px");
    this.setVar("--ui-shadow-card", "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)");
    this.setVar("--ui-border-width", "1px");
  }
}
