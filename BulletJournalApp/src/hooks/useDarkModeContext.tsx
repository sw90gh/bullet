import React, { createContext, useContext } from 'react';
import { getStyles } from '../styles/theme';
import { COLORS, COLORS_DARK, STATUS, STATUS_DARK } from '../utils/constants';

type Styles = ReturnType<typeof getStyles>;
type Colors = { [K in keyof typeof COLORS]: string };

interface DarkModeContextValue {
  isDark: boolean;
  styles: Styles;
  C: Colors;
  statusColor: (status: string) => string;
}

const getStatusColor = (isDark: boolean) => (status: string): string => {
  if (isDark && STATUS_DARK[status]) return STATUS_DARK[status];
  const st = STATUS[status as keyof typeof STATUS];
  return st ? st.color : (isDark ? '#e8e0d4' : '#2c2416');
};

const DarkModeContext = createContext<DarkModeContextValue>({
  isDark: false,
  styles: getStyles(false),
  C: COLORS,
  statusColor: getStatusColor(false),
});

export function DarkModeProvider({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  const value = React.useMemo(() => ({
    isDark,
    styles: getStyles(isDark),
    C: isDark ? COLORS_DARK : COLORS,
    statusColor: getStatusColor(isDark),
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
