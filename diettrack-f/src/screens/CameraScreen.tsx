import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from '../components/icons/Icons';
import { AppGradient } from '../components/AppGradient';

interface Props {
  onCapture: (imageUri: string) => void;
  onGallery: (imageUri: string) => void;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ onCapture, onGallery, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            We need your permission to show the camera
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={18} color={figmaColors.surface} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });

        if (photo && photo.uri) {
          onCapture(photo.uri);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant permission to access photos'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        onGallery(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={18} color={figmaColors.surface} />
        </TouchableOpacity>

        {/* Camera viewfinder */}
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Tinted overlay */}
          <View style={styles.tintOverlay} />

          {/* Scanning frame */}
          <View style={styles.scanningFrame}>
            {/* Top left corner */}
            <View style={[styles.corner, styles.topLeft]} />
            {/* Top right corner */}
            <View style={[styles.corner, styles.topRight]} />

            {/* Dotted line in middle */}
            <View style={styles.dottedLine}>
              {[...Array(5)].map((_, i) => (
                <View key={i} style={styles.dot} />
              ))}
            </View>

            {/* Bottom left corner */}
            <View style={[styles.corner, styles.bottomLeft]} />
            {/* Bottom right corner */}
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </CameraView>

        {/* Bottom controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickFromGallery}
          >
            <Icon name="scan_gallery" size={28} color={figmaColors.surface} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: figmaColors.surface,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: figmaColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  permissionButtonText: {
    color: figmaColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  tintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanningFrame: {
    position: 'absolute',
    top: '30%', // Center vertically
    left: '10%',
    right: '10%',
    height: 280, // Frame height
    justifyContent: 'space-between',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: figmaColors.surface,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 24,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 24,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 24,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 24,
  },
  dottedLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: figmaColors.surface,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around', // Changed from space-between
    paddingHorizontal: 60, // More padding
    paddingBottom: 50,
    paddingTop: 30,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 12, // More rounded
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Lighter/more translucent
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: figmaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4, // Add border
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: figmaColors.surface,
    // Remove the black border
  },
});
