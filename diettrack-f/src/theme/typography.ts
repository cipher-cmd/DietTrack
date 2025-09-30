// Typography system based on Figma design
export const typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 48,
  },

  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Text styles
  textStyles: {
    // Headings
    h1: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: '700' as const,
    },
    h2: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '600' as const,
    },
    h3: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
    },
    h4: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
    },

    // Body text
    bodyLarge: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '400' as const,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },

    // Labels
    labelLarge: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
    },
    labelSmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
    },

    // Captions
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },

    // Button text
    buttonLarge: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
    },
    button: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
    },
    buttonSmall: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600' as const,
    },
  },
};
