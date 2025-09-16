// src/theme.ts
import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: {
      bg: isDark ? '#0B0F13' : '#FFFFFF',
      card: isDark ? '#11171D' : '#F7F8FA',
      text: isDark ? '#E6EDF3' : '#0B0F13',
      subtext: isDark ? '#A9B4BE' : '#4B5563',
      accent: '#4F46E5',
      border: isDark ? '#1F2937' : '#E5E7EB',
      good: '#10B981',
      warn: '#F59E0B',
      bad: '#EF4444',
    },
  };
};
