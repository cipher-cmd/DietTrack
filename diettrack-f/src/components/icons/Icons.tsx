import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
  style,
}) => {
  // For PNG icons from assets
  const pngIcons = [
    'calories',
    'camera',
    'carbs',
    'fats',
    'gallery',
    'home',
    'logo',
    'plus',
    'protein',
    'settings',
    'scan',
    'google',
    'apple',
    'scan_gallery',
    'plate',
  ];

  if (pngIcons.includes(name)) {
    const iconSource = getIconSource(name);

    // Handle null source (like plate icon)
    if (!iconSource) {
      return null;
    }

    // Don't apply tintColor for social icons, nutrition icons, and gallery icons to preserve original colors
    const shouldTint = ![
      'google',
      'apple',
      'logo',
      'protein',
      'fats',
      'scan_gallery',
    ].includes(name);
    return (
      <Image
        source={iconSource}
        style={[
          {
            width: size,
            height: size,
            ...(shouldTint && { tintColor: color }),
          },
          style,
        ]}
        resizeMode="contain"
      />
    );
  }

  // For simple text-based icons
  const textIcons: { [key: string]: string } = {
    'back-arrow': '←',
    close: '✕',
    eye: '👁️',
    'eye-off': '🙈',
    plate: '🍽️',
  };

  if (textIcons[name]) {
    return (
      <View style={[styles.textIcon, { width: size, height: size }, style]}>
        <Text style={[styles.textIconText, { fontSize: size * 0.7, color }]}>
          {textIcons[name]}
        </Text>
      </View>
    );
  }

  // Fallback
  return (
    <View style={[styles.textIcon, { width: size, height: size }, style]}>
      <Text style={[styles.textIconText, { fontSize: size * 0.5, color }]}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
};

function getIconSource(name: string) {
  switch (name) {
    case 'calories':
      return require('../../assets/icons/calories.png');
    case 'camera':
      return require('../../assets/icons/camera.png');
    case 'carbs':
      return require('../../assets/icons/carbs.png');
    case 'fats':
      return require('../../assets/icons/fats.png');
    case 'gallery':
      return require('../../assets/icons/gallery.png');
    case 'home':
      return require('../../assets/icons/home.png');
    case 'logo':
      return require('../../assets/icons/logo.png');
    case 'plus':
      return require('../../assets/icons/plus.png');
    case 'protein':
      return require('../../assets/icons/protein.png');
    case 'settings':
      return require('../../assets/icons/settings.png');
    case 'scan':
      return require('../../assets/icons/scan.png');
    case 'google':
      return require('../../assets/icons/google.png');
    case 'apple':
      return require('../../assets/icons/apple.png');
    case 'scan_gallery':
      return require('../../assets/icons/scan_gallery.png');
    case 'plate':
      // Use text icon as fallback since plate.png doesn't exist
      return null;
    default:
      return require('../../assets/icons/home.png'); // fallback
  }
}

const styles = StyleSheet.create({
  textIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textIconText: {
    fontWeight: '600',
  },
});
