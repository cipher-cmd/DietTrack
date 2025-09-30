import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Icon } from '../icons/Icons';
import { figmaColors } from '../../theme/figma-colors';

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onUploadFromGallery: () => void;
  onTakePhoto: () => void;
  onTextEntry?: () => void;
}

const { height } = Dimensions.get('window');

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  onUploadFromGallery,
  onTakePhoto,
  onTextEntry,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.actionSheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Add Food</Text>

          <View style={styles.options}>
            <Pressable style={styles.option} onPress={onTakePhoto}>
              <Icon name="camera" size={24} color={figmaColors.primary} />
              <Text style={styles.optionText}>Take a photo</Text>
            </Pressable>

            <Pressable style={styles.option} onPress={onUploadFromGallery}>
              <Icon name="gallery" size={24} color={figmaColors.primary} />
              <Text style={styles.optionText}>Choose from gallery</Text>
            </Pressable>

            {onTextEntry && (
              <Pressable style={styles.option} onPress={onTextEntry}>
                <Icon name="settings" size={24} color={figmaColors.primary} />
                <Text style={styles.optionText}>Enter manually</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  actionSheet: {
    backgroundColor: figmaColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34, // Account for home indicator
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: figmaColors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  options: {
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: figmaColors.background,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: figmaColors.textPrimary,
    marginLeft: 16,
  },
});
