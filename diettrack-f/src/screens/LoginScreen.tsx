import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppGradient } from '../components/AppGradient';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from '../components/icons/Icons';
import { FormField } from '../components/ui/FormField';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const handleLogin = () => {
    // Clear previous errors
    setErrors({ email: '', password: '' });

    // Minimal validation - just check if fields are not empty
    let newErrors = { email: '', password: '' };
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);

    if (newErrors.email || newErrors.password) {
      return;
    }

    setIsLoading(true);

    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert('Social Login', `${provider} login would be implemented here`);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome to </Text>
              <Text style={styles.heroText}>DietTrack</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.formTitle}>Log in</Text>

              <FormField
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email or username"
                keyboardType="default"
                autoCapitalize="none"
                error={errors.email}
              />

              <FormField
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                showPasswordToggle={true}
                onTogglePassword={() => setShowPassword(!showPassword)}
                showPassword={showPassword}
                error={errors.password}
              />

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  isLoading && styles.continueButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={figmaColors.surface} size="small" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forget password?</Text>
              </TouchableOpacity>

              <Text style={styles.orText}>or</Text>

              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Google')}
                >
                  <View style={styles.socialButtonContent}>
                    <Icon name="google" size={18} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Apple')}
                >
                  <View style={styles.socialButtonContent}>
                    <Icon name="apple" size={18} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Apple</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.signupPrompt}>
                <Text style={styles.signupText}>New here? </Text>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Create an account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Plain white background
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '400',
    color: figmaColors.textSecondary,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 32,
    fontWeight: '700',
    color: figmaColors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  form: {
    backgroundColor: figmaColors.surface,
    borderRadius: 16,
    padding: 24,
    // Enhanced shadow and elevation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5, // For Android
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: figmaColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#00A6FB80', // Semi-transparent version of primary color
    opacity: 0.7,
  },
  continueButtonText: {
    color: figmaColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: figmaColors.textSecondary,
    fontSize: 14,
  },
  orText: {
    textAlign: 'center',
    color: figmaColors.textSecondary,
    marginBottom: 24,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: figmaColors.surface,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialIcon: {
    // No tintColor to preserve original icon colors
  },
  socialButtonText: {
    color: figmaColors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: figmaColors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: figmaColors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
