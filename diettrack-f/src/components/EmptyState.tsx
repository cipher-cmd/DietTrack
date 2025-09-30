import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from './icons/Icons';

interface Props {
  title: string;
  subtitle: string;
  buttonText: string;
  onButtonPress: () => void;
  icon?: string;
}

export const EmptyState: React.FC<Props> = ({
  title,
  subtitle,
  buttonText,
  onButtonPress,
  icon = 'camera',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={64} color={figmaColors.textSecondary} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <TouchableOpacity style={styles.button} onPress={onButtonPress}>
          <Icon name="camera" size={20} color={figmaColors.surface} />
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
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
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: figmaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: figmaColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: figmaColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: figmaColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
