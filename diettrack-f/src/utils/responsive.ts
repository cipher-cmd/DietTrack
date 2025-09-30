import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions for iPhone 12/13/14 (390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Responsive scaling functions
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

export const scaleFont = (size: number): number => {
  const scale = Math.min(
    SCREEN_WIDTH / BASE_WIDTH,
    SCREEN_HEIGHT / BASE_HEIGHT
  );
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Screen size categories
export const isSmallScreen = (): boolean => SCREEN_WIDTH < 375; // iPhone SE, etc.
export const isMediumScreen = (): boolean =>
  SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414; // iPhone 12/13/14
export const isLargeScreen = (): boolean => SCREEN_WIDTH >= 414; // iPhone Plus, Pro Max

// Responsive spacing
export const spacing = {
  xs: scaleHeight(4),
  sm: scaleHeight(8),
  md: scaleHeight(16),
  lg: scaleHeight(24),
  xl: scaleHeight(32),
  xxl: scaleHeight(48),
};

// Responsive font sizes
export const fontSize = {
  xs: scaleFont(12),
  sm: scaleFont(14),
  md: scaleFont(16),
  lg: scaleFont(18),
  xl: scaleFont(20),
  xxl: scaleFont(24),
  xxxl: scaleFont(28),
  huge: scaleFont(32),
};

// Responsive component sizes
export const componentSize = {
  buttonHeight: scaleHeight(48),
  inputHeight: scaleHeight(48),
  cardPadding: scaleWidth(16),
  borderRadius: scaleWidth(12),
  iconSize: {
    sm: scaleWidth(16),
    md: scaleWidth(24),
    lg: scaleWidth(32),
    xl: scaleWidth(48),
  },
};

// Safe area helpers
export const getSafeAreaInsets = () => {
  // This would typically come from react-native-safe-area-context
  // For now, return default values
  return {
    top: 44, // Status bar height
    bottom: 34, // Home indicator height
    left: 0,
    right: 0,
  };
};

// Screen dimensions
export const screenDimensions = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallScreen(),
  isMedium: isMediumScreen(),
  isLarge: isLargeScreen(),
};
