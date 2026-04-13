import React, { createContext, useContext, useMemo } from 'react';
import { theme as baseTheme, getThemeColors } from '../shared/theme';
import { useUIStore } from '../shared/store/stores';

export type ThemeType = typeof baseTheme;

const ThemeContext = createContext<ThemeType>(baseTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentMode = useUIStore((state) => state.theme);

  const activeTheme = useMemo(() => {
    return {
      ...baseTheme,
      colors: getThemeColors(currentMode),
    };
  }, [currentMode]);

  return (
    <ThemeContext.Provider value={activeTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
