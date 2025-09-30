import { StyleSheet } from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import {
  spacing,
  fontSize,
  componentSize,
  screenDimensions,
} from '../utils/responsive';

// Design System - Better than Tailwind for React Native
export const designSystem = {
  // Spacing Scale
  space: {
    xs: spacing.xs, // 4
    sm: spacing.sm, // 8
    md: spacing.md, // 16
    lg: spacing.lg, // 24
    xl: spacing.xl, // 32
    xxl: spacing.xxl, // 48
  },

  // Typography Scale
  text: {
    xs: { fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.4 },
    sm: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
    md: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
    lg: { fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.4 },
    xl: { fontSize: fontSize.xl, lineHeight: fontSize.xl * 1.3 },
    xxl: { fontSize: fontSize.xxl, lineHeight: fontSize.xxl * 1.2 },
    xxxl: { fontSize: fontSize.xxxl, lineHeight: fontSize.xxxl * 1.1 },
  },

  // Color System
  colors: {
    primary: figmaColors.primary,
    secondary: figmaColors.secondary,
    surface: figmaColors.surface,
    background: figmaColors.background,
    text: {
      primary: figmaColors.textPrimary,
      secondary: figmaColors.textSecondary,
      disabled: figmaColors.textDisabled,
    },
    status: {
      success: figmaColors.success,
      warning: figmaColors.warning,
      error: figmaColors.error,
    },
    nutrition: {
      calories: figmaColors.calories,
      protein: figmaColors.protein,
      carbs: figmaColors.carbs,
      fats: figmaColors.fats,
    },
  },

  // Component Sizes
  sizes: {
    button: {
      sm: {
        height: componentSize.buttonHeight * 0.8,
        paddingHorizontal: spacing.sm,
      },
      md: { height: componentSize.buttonHeight, paddingHorizontal: spacing.md },
      lg: {
        height: componentSize.buttonHeight * 1.2,
        paddingHorizontal: spacing.lg,
      },
    },
    input: {
      sm: { height: componentSize.inputHeight * 0.8 },
      md: { height: componentSize.inputHeight },
      lg: { height: componentSize.inputHeight * 1.2 },
    },
    icon: {
      sm: componentSize.iconSize.sm,
      md: componentSize.iconSize.md,
      lg: componentSize.iconSize.lg,
      xl: componentSize.iconSize.xl,
    },
  },

  // Border Radius
  radius: {
    sm: 4,
    md: 8,
    lg: componentSize.borderRadius,
    xl: 16,
    full: 9999,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// Utility Functions (Better than Tailwind classes)
export const createStyles = (styles: any) => StyleSheet.create(styles);

export const responsive = {
  // Responsive padding
  p: (size: keyof typeof designSystem.space) => ({
    padding: designSystem.space[size],
  }),
  px: (size: keyof typeof designSystem.space) => ({
    paddingHorizontal: designSystem.space[size],
  }),
  py: (size: keyof typeof designSystem.space) => ({
    paddingVertical: designSystem.space[size],
  }),
  pt: (size: keyof typeof designSystem.space) => ({
    paddingTop: designSystem.space[size],
  }),
  pb: (size: keyof typeof designSystem.space) => ({
    paddingBottom: designSystem.space[size],
  }),
  pl: (size: keyof typeof designSystem.space) => ({
    paddingLeft: designSystem.space[size],
  }),
  pr: (size: keyof typeof designSystem.space) => ({
    paddingRight: designSystem.space[size],
  }),

  // Responsive margin
  m: (size: keyof typeof designSystem.space) => ({
    margin: designSystem.space[size],
  }),
  mx: (size: keyof typeof designSystem.space) => ({
    marginHorizontal: designSystem.space[size],
  }),
  my: (size: keyof typeof designSystem.space) => ({
    marginVertical: designSystem.space[size],
  }),
  mt: (size: keyof typeof designSystem.space) => ({
    marginTop: designSystem.space[size],
  }),
  mb: (size: keyof typeof designSystem.space) => ({
    marginBottom: designSystem.space[size],
  }),
  ml: (size: keyof typeof designSystem.space) => ({
    marginLeft: designSystem.space[size],
  }),
  mr: (size: keyof typeof designSystem.space) => ({
    marginRight: designSystem.space[size],
  }),

  // Typography
  text: (size: keyof typeof designSystem.text) => designSystem.text[size],
  font: (weight: 'normal' | '500' | '600' | '700') => ({ fontWeight: weight }),

  // Colors
  bg: (color: keyof typeof designSystem.colors) => ({
    backgroundColor: designSystem.colors[color],
  }),
  textColor: (color: keyof typeof designSystem.colors.text) => ({
    color: designSystem.colors.text[color],
  }),

  // Layout
  flex: (value: number) => ({ flex: value }),
  row: { flexDirection: 'row' as const },
  column: { flexDirection: 'column' as const },
  center: { alignItems: 'center' as const, justifyContent: 'center' as const },
  between: { justifyContent: 'space-between' as const },
  around: { justifyContent: 'space-around' as const },

  // Border radius
  rounded: (size: keyof typeof designSystem.radius) => ({
    borderRadius: designSystem.radius[size],
  }),

  // Shadows
  shadow: (size: keyof typeof designSystem.shadows) =>
    designSystem.shadows[size],
};

// Pre-built component styles
export const componentStyles = createStyles({
  // Button variants
  buttonPrimary: {
    ...designSystem.sizes.button.md,
    backgroundColor: designSystem.colors.primary,
    borderRadius: designSystem.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    ...designSystem.sizes.button.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: designSystem.colors.text.secondary,
    borderRadius: designSystem.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card styles
  card: {
    backgroundColor: designSystem.colors.surface,
    borderRadius: designSystem.radius.lg,
    padding: designSystem.space.md,
    ...designSystem.shadows.md,
  },

  // Input styles
  input: {
    ...designSystem.sizes.input.md,
    borderWidth: 1,
    borderColor: designSystem.colors.text.secondary,
    borderRadius: designSystem.radius.lg,
    paddingHorizontal: designSystem.space.md,
    backgroundColor: designSystem.colors.surface,
    color: designSystem.colors.text.primary,
  },

  // Text styles
  heading: {
    ...designSystem.text.xxxl,
    fontWeight: '700',
    color: designSystem.colors.text.primary,
  },
  subheading: {
    ...designSystem.text.xl,
    fontWeight: '600',
    color: designSystem.colors.text.primary,
  },
  body: {
    ...designSystem.text.md,
    color: designSystem.colors.text.primary,
  },
  caption: {
    ...designSystem.text.sm,
    color: designSystem.colors.text.secondary,
  },
});
