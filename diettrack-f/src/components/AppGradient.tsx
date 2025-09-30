import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
}

const { height } = Dimensions.get('window');

export const AppGradient: React.FC<Props> = ({ children }) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          'rgba(22, 141, 245, 0.06)', // Very subtle start
          'rgba(22, 141, 245, 0.03)', // Gentle mid-point
          'rgba(22, 141, 245, 0.015)', // Almost invisible
          'rgba(22, 141, 245, 0.005)', // Very faint
          'rgba(22, 141, 245, 0)', // Fully transparent
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]} // Even smoother distribution
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Ensure white background
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.65, // Extended to 65% for smoother fade
  },
});
