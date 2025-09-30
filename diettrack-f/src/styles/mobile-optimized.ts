import { StyleSheet } from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import {
  spacing,
  fontSize,
  componentSize,
  screenDimensions,
} from '../utils/responsive';

export const mobileStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  safeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: screenDimensions.isSmall ? spacing.sm : spacing.md,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: componentSize.buttonHeight,
  },

  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    textAlign: 'center',
  },

  // Content styles
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },

  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Card styles
  card: {
    backgroundColor: figmaColors.surface,
    borderRadius: componentSize.borderRadius,
    padding: componentSize.cardPadding,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Button styles
  primaryButton: {
    backgroundColor: figmaColors.primary,
    borderRadius: componentSize.borderRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSize.buttonHeight,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: componentSize.borderRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: componentSize.buttonHeight,
  },

  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: figmaColors.surface,
  },

  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: figmaColors.textPrimary,
  },

  // Input styles
  input: {
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: componentSize.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: figmaColors.surface,
    color: figmaColors.textPrimary,
    minHeight: componentSize.inputHeight,
  },

  // Text styles
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: figmaColors.textPrimary,
    marginBottom: spacing.sm,
  },

  subtitle: {
    fontSize: fontSize.md,
    color: figmaColors.textSecondary,
    lineHeight: fontSize.md * 1.5,
  },

  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: spacing.md,
  },

  // Grid styles
  grid2: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  grid2Item: {
    flex: 1,
  },

  grid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  grid3Item: {
    width: '48%',
  },

  // Navigation styles
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: figmaColors.surface,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: figmaColors.border,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  navText: {
    fontSize: fontSize.xs,
    color: figmaColors.textSecondary,
    marginTop: spacing.xs,
  },

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  loadingText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  emptyStateIcon: {
    width: componentSize.iconSize.xl * 2,
    height: componentSize.iconSize.xl * 2,
    borderRadius: componentSize.iconSize.xl,
    backgroundColor: figmaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  // Responsive adjustments
  smallScreenAdjustments: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  largeScreenAdjustments: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});

// Responsive helper functions
export const getResponsiveStyle = (baseStyle: any, adjustments: any = {}) => {
  const responsiveAdjustments = screenDimensions.isSmall
    ? adjustments.small || {}
    : screenDimensions.isLarge
      ? adjustments.large || {}
      : {};

  return {
    ...baseStyle,
    ...responsiveAdjustments,
  };
};

// Common mobile-optimized patterns
export const mobilePatterns = {
  // Safe area container
  safeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: screenDimensions.isSmall ? spacing.sm : spacing.md,
  },

  // Scrollable content with proper padding
  scrollableContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Card with proper spacing
  cardWithSpacing: {
    backgroundColor: figmaColors.surface,
    borderRadius: componentSize.borderRadius,
    padding: componentSize.cardPadding,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
  },

  // Button row for actions
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  // Form field
  formField: {
    marginBottom: spacing.md,
  },

  // Section with title
  section: {
    marginBottom: spacing.xl,
  },
};
