import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { figmaColors } from '../../theme/figma-colors';
import { AppGradient } from '../../components/AppGradient';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';

interface Props {
  onNext: (activity: string) => void;
  onBack: () => void;
}

export default function ActivityScreen({ onNext, onBack }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<string>('');

  const activityOptions = [
    {
      value: 'sedentary',
      label: 'Sedentary (little or no exercise)',
    },
    {
      value: 'light',
      label: 'Light (light exercise 1-3 days/week)',
    },
    {
      value: 'moderate',
      label: 'Moderate (exercise 3-5 days/week)',
    },
    {
      value: 'very-active',
      label: 'Very Active (hard exercise 6-7 days/week)',
    },
  ];

  const handleContinue = () => {
    if (selectedActivity) {
      onNext(selectedActivity);
    }
  };

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedProgressBar progress={0.8} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>How active are you daily?</Text>

          <View style={styles.optionsContainer}>
            {activityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  selectedActivity === option.value && styles.selectedOption,
                ]}
                onPress={() => setSelectedActivity(option.value)}
              >
                <View
                  style={[
                    styles.radio,
                    selectedActivity === option.value && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.continueButton,
                { opacity: selectedActivity ? 1 : 0.5 },
              ]}
              onPress={handleContinue}
              disabled={!selectedActivity}
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
  progressBar: {
    height: 4,
    backgroundColor: figmaColors.progressBackground,
    borderRadius: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: figmaColors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  selectedOption: {
    borderColor: figmaColors.primary,
    borderWidth: 2,
    backgroundColor: figmaColors.primary + '12',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: figmaColors.border,
    marginRight: 12,
  },
  radioSelected: {
    borderColor: figmaColors.primary,
    backgroundColor: figmaColors.primary,
  },
  optionText: {
    fontSize: 16,
    color: figmaColors.textPrimary,
    flex: 1,
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
