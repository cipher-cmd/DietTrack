import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { figmaColors } from '../../theme/figma-colors';
import { AppGradient } from '../../components/AppGradient';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';

interface Props {
  onNext: (gender: string) => void;
  onBack: () => void;
}

export default function GenderScreen({ onNext, onBack }: Props) {
  const [selectedGender, setSelectedGender] = useState<string>('');

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  const handleContinue = () => {
    if (selectedGender) {
      onNext(selectedGender);
    }
  };

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedProgressBar progress={0.4} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>What's your gender?</Text>

          <View style={styles.optionsContainer}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  selectedGender === option.value && styles.selectedOption,
                ]}
                onPress={() => setSelectedGender(option.value)}
              >
                <View
                  style={[
                    styles.radio,
                    selectedGender === option.value && styles.radioSelected,
                  ]}
                />
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.continueButton,
                { opacity: selectedGender ? 1 : 0.5 },
              ]}
              onPress={handleContinue}
              disabled={!selectedGender}
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    paddingTop: 60,
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
  },
  footer: {
    padding: 24,
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
