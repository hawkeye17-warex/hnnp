export const lightTheme = {
  colors: {
    sidebarBg: '#0E0E11',
    sidebarActive: '#2A6DFF',
    sidebarText: '#9DA2B5',
    pageBg: '#FAFBFF',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E4EC',
    textPrimary: '#151722',
    textMuted: '#6C6F7B',
    accentPrimary: '#2A6DFF',
    accentSuccess: '#18CB8F',
    danger: '#FF4B55',
    warning: '#FFC234',
  },
};

export const darkTheme: typeof lightTheme = {
  colors: {
    sidebarBg: '#0D1117',
    sidebarActive: '#4F9BFF',
    sidebarText: '#9CA3AF',
    pageBg: '#0B1220',
    cardBg: '#111827',
    cardBorder: '#1F2937',
    textPrimary: '#E5E7EB',
    textMuted: '#9CA3AF',
    accentPrimary: '#4F9BFF',
    accentSuccess: '#34D399',
    danger: '#F87171',
    warning: '#FBBF24',
  },
};

export type Theme = typeof lightTheme;
