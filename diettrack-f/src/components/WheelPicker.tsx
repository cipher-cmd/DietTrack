import React, { useRef, useEffect, useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { figmaColors } from '../theme/figma-colors';

// Define props for our memoized item component
interface PickerItemProps {
  label: string;
  style: any;
  itemHeight: number;
}

// Memoized PickerItem to prevent unnecessary re-renders
const PickerItem: React.FC<PickerItemProps> = memo(
  ({ label, style, itemHeight }) => {
    return (
      <View style={[styles.item, { height: itemHeight }]}>
        <Animated.Text
          style={[styles.itemText, style]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {label}
        </Animated.Text>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.label === nextProps.label &&
      prevProps.itemHeight === nextProps.itemHeight &&
      prevProps.style === nextProps.style
    );
  }
);

interface WheelPickerProps {
  data: Array<{ value: number; label: string }>;
  selectedValue: number;
  onValueChange: (value: number) => void;
  itemHeight?: number;
  id?: string; // Unique identifier to prevent interference
}

const { height: screenHeight } = Dimensions.get('window');

export const WheelPicker: React.FC<WheelPickerProps> = ({
  data,
  selectedValue,
  onValueChange,
  itemHeight = 60,
  id = 'default',
}) => {
  const scrollViewRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastHapticIndex = useRef(-1);

  // Use Animated.Value to track scroll position for performance
  const scrollY = useRef(new Animated.Value(0)).current;

  const pickerHeight = itemHeight * 5;
  const paddingVertical = itemHeight * 2;

  useEffect(() => {
    // Find the selected value index and scroll to it
    const selectedIndex = data.findIndex(
      (item) => item.value === selectedValue
    );
    if (selectedIndex !== -1) {
      setCurrentIndex(selectedIndex);
      // Animate to the selected position
      setTimeout(() => {
        const scrollPosition = selectedIndex * itemHeight;
        scrollViewRef.current?.scrollTo({
          y: scrollPosition,
          animated: true,
        });
      }, 100);
    }
  }, [selectedValue, data, itemHeight]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));

    if (clampedIndex !== currentIndex) {
      setCurrentIndex(clampedIndex);
      onValueChange(data[clampedIndex].value);
    }
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const index = Math.round(y / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));

      // Throttled haptic feedback when crossing item boundaries
      if (clampedIndex !== lastHapticIndex.current) {
        lastHapticIndex.current = clampedIndex;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [itemHeight, data.length]
  );

  const animatedScrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: handleScroll,
    }
  );

  // This function generates the dynamic style for each item
  const getItemStyle = useCallback(
    (index: number) => {
      const position = Animated.subtract(index * itemHeight, scrollY);

      // 3D-like rotation (more pronounced for iOS barrel effect)
      const rotateX = position.interpolate({
        inputRange: [-itemHeight * 2, 0, itemHeight * 2],
        outputRange: ['50deg', '0deg', '-50deg'],
        extrapolate: 'clamp',
      });

      // Steeper fade out for better focus on center item
      const opacity = position.interpolate({
        inputRange: [
          -itemHeight * 2.5,
          -itemHeight * 1.5,
          0,
          itemHeight * 1.5,
          itemHeight * 2.5,
        ],
        outputRange: [0, 0.3, 1, 0.3, 0],
        extrapolate: 'clamp',
      });

      // Scale effect with slight enlargement of selected item
      const scale = position.interpolate({
        inputRange: [-itemHeight * 2, 0, itemHeight * 2],
        outputRange: [0.7, 1.05, 0.7],
        extrapolate: 'clamp',
      });

      // More dramatic color transition
      const color = position.interpolate({
        inputRange: [-itemHeight, 0, itemHeight],
        outputRange: [
          'rgba(0, 0, 0, 0.3)',
          figmaColors.primary,
          'rgba(0, 0, 0, 0.3)',
        ],
        extrapolate: 'clamp',
      });

      return {
        transform: [{ rotateX }, { scale }],
        opacity,
        color,
      };
    },
    [scrollY, itemHeight]
  );

  return (
    <View
      style={[styles.container, { height: pickerHeight }]}
      pointerEvents="box-none"
    >
      {/* Simple selection indicator */}
      <View
        style={[
          styles.selectionOverlay,
          { height: itemHeight, top: paddingVertical },
        ]}
        pointerEvents="none"
      >
        {/* Top border line */}
        <View style={styles.selectionBorderTop} />
        {/* Bottom border line */}
        <View style={styles.selectionBorderBottom} />
      </View>

      {/* Top gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(240, 244, 248, 1)', // Solid background color
          'rgba(240, 244, 248, 0)', // Fade to transparent
        ]}
        style={[styles.fadeOverlay, { top: 0, height: paddingVertical }]}
        pointerEvents="none"
      />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(240, 244, 248, 0)', // Transparent
          'rgba(240, 244, 248, 1)', // Solid background color
        ]}
        style={[styles.fadeOverlay, { bottom: 0, height: paddingVertical }]}
        pointerEvents="none"
      />

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingVertical }}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16} // 60fps for better performance
        snapToInterval={itemHeight}
        snapToAlignment="center"
        decelerationRate="fast" // iOS-like quick settling
        removeClippedSubviews={true}
        bounces={true} // iOS has subtle bounce
        scrollEnabled={true}
        onScroll={animatedScrollHandler}
      >
        {data.map((item, index) => (
          <PickerItem
            key={`${item.value}-${index}`}
            label={item.label}
            style={getItemStyle(index)}
            itemHeight={itemHeight}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transform: [{ perspective: 1200 }],
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  selectionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  selectionBorderTop: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectionBorderBottom: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fadeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemText: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
});
