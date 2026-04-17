import { IUIStyle } from "../IUIStyle";

export class CyberpunkStyle implements IUIStyle {
  readonly name = "Cyberpunk";

  private setProp(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  applyColors() {
    this.setProp("--ui-bg", "#0a0a0a");
    this.setProp("--ui-surface", "#111111");
    this.setProp("--ui-surface-hover", "#161616");
    this.setProp("--ui-accent", "#00fff9");
    this.setProp("--ui-border-color", "#00fff9");
  }

  applyTypography() {
    this.setProp("--ui-font-family", "'JetBrains Mono', monospace");
    this.setProp("--ui-letter-spacing", "0.1em");
  }

  applySpacing() {
    this.setProp("--ui-padding-card", "1.5rem");
  }

  applyComponents() {
    this.setProp("--ui-radius-card", "0px");
    this.setProp("--ui-radius-btn", "0px");
    this.setProp("--ui-border-width", "1px");
    this.setProp("--ui-glass-blur", "0px");
    this.setProp("--ui-shadow-card", "0 0 15px rgba(0, 255, 249, 0.4)");
  }
}
