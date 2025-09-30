import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from './icons/Icons';

export interface ErrorAction {
  label: string;
  action: 'retry' | 'manual_entry' | 'gallery' | 'dismiss';
  style?: 'primary' | 'secondary';
}

export interface ErrorState {
  type: 'network' | 'analysis_failed' | 'camera_error' | 'generic';
  title: string;
  message: string;
  actions: ErrorAction[];
}

interface Props {
  errorState: ErrorState;
  onAction: (action: string) => void;
}

export const ErrorStateComponent: React.FC<Props> = ({
  errorState,
  onAction,
}) => {
  const getIcon = () => {
    switch (errorState.type) {
      case 'analysis_failed':
        return 'camera';
      case 'network':
        return 'settings';
      case 'camera_error':
        return 'camera';
      default:
        return 'settings';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon name={getIcon()} size={48} color={figmaColors.error} />
        <Text style={styles.title}>{errorState.title}</Text>
        <Text style={styles.message}>{errorState.message}</Text>

        <View style={styles.actions}>
          {errorState.actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                action.style === 'primary'
                  ? styles.primaryButton
                  : styles.secondaryButton,
              ]}
              onPress={() => onAction(action.action)}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  action.style === 'primary'
                    ? styles.primaryButtonText
                    : styles.secondaryButtonText,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: figmaColors.background,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: figmaColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: figmaColors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: figmaColors.surface,
  },
  secondaryButtonText: {
    color: figmaColors.textPrimary,
  },
});
