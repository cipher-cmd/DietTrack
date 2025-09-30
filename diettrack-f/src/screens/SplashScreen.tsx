import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from '../components/icons/Icons';
import { AppGradient } from '../components/AppGradient';
import { spacing, fontSize } from '../utils/responsive';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AppGradient>
      <View style={styles.container}>
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/icons/main_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* App Title */}
        <Text style={styles.appTitle}>DietTrack</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Snap. Tap. Track.</Text>
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: figmaColors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: figmaColors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
