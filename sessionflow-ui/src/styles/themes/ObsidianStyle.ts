import { IUIStyle } from "../IUIStyle";

export class ObsidianStyle implements IUIStyle {
  readonly name = "Obsidian";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#0f1117");
    this.setProp("--ui-surface", "#161922");
    this.setProp("--ui-surface-hover", "#1e2330");
    this.setProp("--ui-accent", "#a78bfa");
    this.setProp("--ui-border-color", "rgba(255, 255, 255, 0.06)");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'Inter', 'Sora', sans-serif");
    this.setProp("--ui-letter-spacing", "-0.01em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1.5rem");
    this.setProp("--ui-gap-grid", "1.25rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "16px");
    this.setProp("--ui-radius-btn", "12px");
    this.setProp("--ui-border-width", "0px"); /* Borderless by default */
    this.setProp("--ui-glass-blur", "32px");
    this.setProp("--ui-shadow-card", "0 20px 50px rgba(0, 0, 0, 0.4)");
  }
}
