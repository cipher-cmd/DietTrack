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
  onNext: (goal: string) => void;
  onBack: () => void;
}

export default function GoalScreen({ onNext, onBack }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<string>('lose-weight');

  const goalOptions = [
    {
      value: 'lose-weight',
      label: 'Lose Weight',
    },
    {
      value: 'maintain-weight',
      label: 'Maintain Weight',
    },
    {
      value: 'gain-weight',
      label: 'Gain Weight',
    },
  ];

  const handleContinue = () => {
    if (selectedGoal) {
      onNext(selectedGoal);
    }
  };

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedProgressBar progress={1.0} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>What's your main goal?</Text>

          <View style={styles.optionsContainer}>
            {goalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  selectedGoal === option.value && styles.selectedOption,
                ]}
                onPress={() => setSelectedGoal(option.value)}
              >
                <View
                  style={[
                    styles.radio,
                    selectedGoal === option.value && styles.radioSelected,
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
