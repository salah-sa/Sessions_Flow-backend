import { IUIStyle } from "../IUIStyle";

export class FluentStyle implements IUIStyle {
  name = "Fluent";

  private setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setVar("--ui-bg", "#f3f3f3");
    this.setVar("--ui-surface", "rgba(255, 255, 255, 0.7)");
    this.setVar("--ui-surface-hover", "rgba(255, 255, 255, 0.9)");
    this.setVar("--ui-border-color", "rgba(0, 0, 0, 0.05)");
    this.setVar("--ui-accent", "#0078d4");
  }

  applyTypography() {
    this.setVar("--ui-font-main", "'Segoe UI', 'Segoe UI Web (West European)', sans-serif");
    this.setVar("--ui-font-display", "inherit");
    this.setVar("--ui-letter-spacing", "normal");
  }

  applySpacing() {
    this.setVar("--ui-spacing-multiplier", "1");
    this.setVar("--ui-padding-card", "1.5rem");
  }

  applyComponents() {
    this.setVar("--ui-radius-card", "8px");
    this.setVar("--ui-radius-btn", "4px");
    this.setVar("--ui-glass-blur", "30px");
    this.setVar("--ui-shadow-card", "0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)");
    this.setVar("--ui-border-width", "1px");
  }
}
