import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CameraCaptureProps {
  onPhotoCaptured: (uri: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onPhotoCaptured, onCancel }: CameraCaptureProps) {
  const theme = useTheme();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleCapture = async () => {
    if (camera.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await camera.current.takePhoto({
          qualityPrioritization: 'speed',
          flash: 'auto'
        });
        onPhotoCaptured(`file://${photo.path}`);
      } catch (e) {
        console.error('Failed to take photo', e);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[s.container, { backgroundColor: '#000', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (hasPermission === false || !device) {
    return (
      <View style={[s.container, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.bodyMd, { color: '#FFF' }]}>Camera permission denied or device not found.</Text>
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 20 }}>
          <Text style={[typography.button, { color: theme.colors.brand.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      
      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onCancel} style={s.cancelButton}>
          <Text style={[typography.button, { color: '#FFF' }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity 
          onPress={handleCapture} 
          disabled={isCapturing}
          style={[s.captureButton, { borderColor: '#FFF' }]}
        >
          <View style={[s.captureInner, { backgroundColor: isCapturing ? '#999' : '#FFF' }]} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  cancelButton: {
    padding: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  }
});
