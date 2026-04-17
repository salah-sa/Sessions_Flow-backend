export interface IUIStyle {
  readonly name: string;
  applyColors(): void;
  applyTypography(): void;
  applySpacing(): void;
  applyComponents(): void;
}
