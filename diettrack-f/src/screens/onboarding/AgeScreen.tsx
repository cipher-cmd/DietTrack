import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { figmaColors } from '../../theme/figma-colors';
import { AppGradient } from '../../components/AppGradient';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';

interface Props {
  onNext: (age: number) => void;
}

export default function AgeScreen({ onNext }: Props) {
  const [age, setAge] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleContinue = () => {
    const ageNumber = parseInt(age);
    if (ageNumber >= 13 && ageNumber <= 120) {
      onNext(ageNumber);
    }
  };

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <AnimatedProgressBar progress={0.2} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>What's your age?</Text>

            <TextInput
              style={[
                styles.input,
                isFocused && styles.inputFocused,
                age && styles.inputFilled,
              ]}
              placeholder="Enter your age"
              value={age}
              onChangeText={setAge}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="numeric"
              maxLength={3}
              autoFocus={true}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  opacity:
                    age && parseInt(age) >= 13 && parseInt(age) <= 120
                      ? 1
                      : 0.5,
                },
              ]}
              onPress={handleContinue}
              disabled={!age || parseInt(age) < 13 || parseInt(age) > 120}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardContainer: {
    flex: 1,
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
  input: {
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: figmaColors.surface,
    color: figmaColors.textPrimary,
  },
  inputFocused: {
    borderColor: figmaColors.primary,
    borderWidth: 2,
    backgroundColor: figmaColors.primary + '08',
  },
  inputFilled: {
    borderColor: figmaColors.primary,
    borderWidth: 2,
    backgroundColor: figmaColors.primary + '12',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  continueButton: {
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
