export const lightTheme = {
  colors: {
    primary: '#2563EB',
    primaryDark: '#1E40AF',
    primaryLight: '#DBEAFE',
    secondary: '#1E3A8A',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardMuted: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E5E7EB',
    borderStrong: '#CBD5E1',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    success: '#16A34A',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#0EA5E9',
    infoLight: '#DBEAFE',
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(15,23,42,0.5)',
    danger: '#DC2626',
  },
  isDark: false,
};

export const darkTheme = {
  colors: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#1E3A8A',
    secondary: '#1E3A8A',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    cardMuted: '#334155',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    border: '#334155',
    borderStrong: '#475569',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    info: '#38BDF8',
    infoLight: '#1E3A8A',
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0,0,0,0.7)',
    danger: '#EF4444',
  },
  isDark: true,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 };
export const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 32 };

export type Theme = typeof lightTheme;
export { lightTheme as theme };
