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
    sidebarBg: '#080C14',
    sidebarActive: '#63A4FF',
    sidebarText: '#A5B4C6',
    pageBg: '#0A101A',
    bgTint: '#101927',
    cardBg: '#0F1928',
    cardBorder: '#1E2A3C',
    textPrimary: '#E8EDF5',
    textMuted: '#9FB0C6',
    accentPrimary: '#63A4FF',
    accentSuccess: '#34D399',
    danger: '#F87171',
    warning: '#FACC15',
  },
};

export type Theme = typeof lightTheme;
