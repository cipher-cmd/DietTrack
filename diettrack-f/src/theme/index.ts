// Main theme configuration
import { useColorScheme } from 'react-native';
import { colors, darkColors } from './colors';
import { typography } from './typography';
import * as spacingModule from './spacing';

const { spacing, borderRadius, shadows } = spacingModule;

// Default fallback theme
const defaultTheme = {
  isDark: false,
  colors: colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  semantic: {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceVariant: '#f1f5f9',
    onBackground: '#0f172a',
    onSurface: '#334155',
    onSurfaceVariant: '#64748b',
    outline: '#e2e8f0',
    outlineVariant: '#cbd5e1',
  },
  brand: {
    primary: '#0ea5e9',
    primaryVariant: '#0284c7',
    secondary: '#64748b',
    secondaryVariant: '#475569',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
  },
};

export const useTheme = () => {
  try {
    // Force light theme always
    const isDark = false;

    const themeColors = isDark ? darkColors : colors;

    // Ensure we always have valid theme colors
    const safeThemeColors = themeColors || colors;

    const theme = {
      isDark,
      colors: safeThemeColors,
      typography,
      spacing,
      borderRadius,
      shadows,

      // Semantic color shortcuts with fallbacks
      semantic: {
        background: safeThemeColors?.semantic?.background || '#ffffff',
        surface: safeThemeColors?.semantic?.surface || '#f8fafc',
        surfaceVariant: safeThemeColors?.semantic?.surfaceVariant || '#f1f5f9',
        onBackground: safeThemeColors?.semantic?.onBackground || '#0f172a',
        onSurface: safeThemeColors?.semantic?.onSurface || '#334155',
        onSurfaceVariant:
          safeThemeColors?.semantic?.onSurfaceVariant || '#64748b',
        outline: safeThemeColors?.semantic?.outline || '#e2e8f0',
        outlineVariant: safeThemeColors?.semantic?.outlineVariant || '#cbd5e1',
      },

      // Brand colors with fallbacks
      brand: {
        primary: safeThemeColors?.primary?.[500] || '#0ea5e9',
        primaryVariant: safeThemeColors?.primary?.[600] || '#0284c7',
        secondary: safeThemeColors?.secondary?.[500] || '#64748b',
        secondaryVariant: safeThemeColors?.secondary?.[600] || '#475569',
      },

      // Status colors with fallbacks
      status: {
        success: safeThemeColors?.success?.[500] || '#22c55e',
        warning: safeThemeColors?.warning?.[500] || '#f59e0b',
        error: safeThemeColors?.error?.[500] || '#ef4444',
        info: safeThemeColors?.primary?.[500] || '#0ea5e9',
      },
    };

    return theme;
  } catch (error) {
    console.warn('Theme error, using default theme:', error);
    return defaultTheme;
  }
};

export type Theme = {
  isDark: boolean;
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  semantic: {
    background: string;
    surface: string;
    surfaceVariant: string;
    onBackground: string;
    onSurface: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
  };
  brand: {
    primary: string;
    primaryVariant: string;
    secondary: string;
    secondaryVariant: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
};
