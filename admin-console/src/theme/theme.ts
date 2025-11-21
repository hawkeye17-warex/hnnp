export const lightTheme = {
  colors: {
    sidebarBg: '#0E0E11',
    sidebarActive: '#2A6DFF',
    sidebarText: '#9DA2B5',
    pageBg: '#FAFBFF',
    bgTint: '#EEF2FF',
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
    sidebarActive: '#7AB5FF',
    sidebarText: '#9CA3AF',
    pageBg: '#0A0F1A',
    bgTint: '#111827',
    cardBg: '#0F172A',
    cardBorder: '#1F2937',
    textPrimary: '#E5E7EB',
    textMuted: '#94A3B8',
    accentPrimary: '#7AB5FF',
    accentSuccess: '#34D399',
    danger: '#FCA5A5',
    warning: '#FACC15',
  },
};

export type Theme = typeof lightTheme;
