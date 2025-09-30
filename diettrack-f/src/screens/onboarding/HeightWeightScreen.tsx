import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { figmaColors } from '../../theme/figma-colors';
import { WheelPicker } from '../../components/WheelPicker';
import { AppGradient } from '../../components/AppGradient';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';

interface Props {
  onNext: (height: number, weight: number) => void;
  onBack: () => void;
}

export default function HeightWeightScreen({ onNext, onBack }: Props) {
  const [selectedHeight, setSelectedHeight] = useState<number>(170); // More common default
  const [selectedWeight, setSelectedWeight] = useState<number>(70); // More common default

  // Generate proper height data (140-220 cm)
  const heights = Array.from({ length: 81 }, (_, i) => ({
    value: 140 + i,
    label: `${140 + i} cm`,
  }));

  // Generate proper weight data (40-150 kg)
  const weights = Array.from({ length: 111 }, (_, i) => ({
    value: 40 + i,
    label: `${40 + i} kg`,
  }));

  const handleContinue = () => {
    onNext(selectedHeight, selectedWeight);
  };

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedProgressBar progress={0.6} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Height & Weight</Text>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Height</Text>
                <WheelPicker
                  id="height-picker"
                  data={heights}
                  selectedValue={selectedHeight}
                  onValueChange={setSelectedHeight}
                  itemHeight={65} // Larger touch target
                />
              </View>

              {/* Divider between pickers */}
              <View style={styles.divider} />

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Weight</Text>
                <WheelPicker
                  id="weight-picker"
                  data={weights}
                  selectedValue={selectedWeight}
                  onValueChange={setSelectedWeight}
                  itemHeight={65} // Larger touch target
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 40,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle background
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20, // More breathing room
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500', // Slightly lighter weight
    color: figmaColors.textPrimary,
    marginBottom: 16, // Increased spacing
    opacity: 0.8, // Slightly subdued
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: figmaColors.surface,
  },
  backButtonText: {
    color: figmaColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: figmaColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: figmaColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
