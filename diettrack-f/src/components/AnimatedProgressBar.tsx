import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { figmaColors } from '../theme/figma-colors';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  duration?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  duration = 300,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration,
      useNativeDriver: false,
    }).start();
  }, [progress, duration, animatedWidth]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.progress,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 4,
    backgroundColor: figmaColors.progressBackground,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: figmaColors.primary,
    borderRadius: 2,
  },
});
