import React, { createContext, useContext } from 'react';
import { getStyles } from '../styles/theme';
import { COLORS, COLORS_DARK } from '../utils/constants';

type Styles = ReturnType<typeof getStyles>;
type Colors = { [K in keyof typeof COLORS]: string };

interface DarkModeContextValue {
  isDark: boolean;
  styles: Styles;
  C: Colors;
}

const DarkModeContext = createContext<DarkModeContextValue>({
  isDark: false,
  styles: getStyles(false),
  C: COLORS,
});

export function DarkModeProvider({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  const value = React.useMemo(() => ({
    isDark,
    styles: getStyles(isDark),
    C: isDark ? COLORS_DARK : COLORS,
  }), [isDark]);
  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useTheme() {
  return useContext(DarkModeContext);
}
