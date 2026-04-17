export interface IUIStyle {
  name: string;
  applyColors(): void;
  applyTypography(): void;
  applySpacing(): void;
  applyComponents(): void;
}
