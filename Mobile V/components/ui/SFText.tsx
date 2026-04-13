import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../../shared/theme';

export interface SFTextProps extends TextProps {
  variant?: keyof typeof theme.typography;
  color?: string;
  weight?: 'normal' | 'bold' | '500' | '600' | '700' | '800' | '900';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

/**
 * Standardized SessionFlow Text Component
 * Handles exact font families based on variants and auto-clamps maximum scaling.
 */
export const SFText: React.FC<SFTextProps> = ({
  variant = 'body',
  color = theme.colors.text,
  weight,
  align,
  style,
  children,
  ...props
}) => {
  // Grab the base typography token (e.g. h1, h2, label, body, caption)
  const preset: any = (theme.typography as any)[variant] || theme.typography.body;

  const resolvedStyle = [
    {
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      lineHeight: preset.lineHeight,
      color: color,
      textAlign: align,
      fontWeight: weight || preset.fontWeight,
      letterSpacing: preset.letterSpacing,
    },
    style,
  ];

  return (
    <Text 
      maxFontSizeMultiplier={1.2} 
      style={resolvedStyle} 
      {...props}
    >
      {children}
    </Text>
  );
};
