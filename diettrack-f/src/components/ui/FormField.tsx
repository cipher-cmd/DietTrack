import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { figmaColors } from '../../theme/figma-colors';
import { Icon } from '../icons/Icons';

interface FormFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  showPasswordToggle = false,
  onTogglePassword,
  showPassword = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={figmaColors.textPlaceholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {showPasswordToggle && (
          <TouchableOpacity style={styles.eyeButton} onPress={onTogglePassword}>
            <Icon
              name={showPassword ? 'eye' : 'eye-off'}
              size={18}
              color={figmaColors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: figmaColors.surface,
    color: figmaColors.textPrimary,
    paddingRight: 50, // Make room for eye button
  },
  inputError: {
    borderColor: figmaColors.error,
    borderWidth: 2,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorText: {
    color: figmaColors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
