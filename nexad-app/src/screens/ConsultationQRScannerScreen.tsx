import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useAuth } from '../contexts/AuthContext';
import { consultationService } from '../services/consultationService';
import { C, S, R } from '../config/theme';

export default function ConsultationQRScannerScreen({ navigation }: any) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const device = useCameraDevice('back');

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'granted');
    
    if (permission === 'denied') {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to scan QR codes.',
        [
          { text: 'Cancel', onPress: () => navigation.goBack() },
          { text: 'Open Settings', onPress: () => Camera.requestCameraPermission() },
        ]
      );
    }
  };

  const handleCodeScanned = async (codes: any[]) => {
    if (!isScanning || isJoining || codes.length === 0) return;

    const code = codes[0];
    const value = code.value;

    // Check if it's a NEXAD consultation deep link
    if (!value || !value.includes('nexad://join/')) {
      return;
    }

    // Extract invite code from deep link
    const inviteCode = value.split('nexad://join/')[1];
    if (!inviteCode || inviteCode.length !== 6) {
      Alert.alert('Invalid QR Code', 'This QR code does not contain a valid consultation invite.');
      return;
    }

    setIsScanning(false);
    await joinConsultation(inviteCode);
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: handleCodeScanned,
  });

  const joinConsultation = async (inviteCode: string) => {
    if (!user?.id) return;

    try {
      setIsJoining(true);

      const userName = `${user.first_name || 'Student'} ${user.last_name || ''}`.trim();

      const result = await consultationService.joinConsultation(inviteCode, user.id, userName);

      if (result.error || !result.data) {
        Alert.alert('Error', result.error || 'Failed to join consultation', [
          { text: 'OK', onPress: () => setIsScanning(true) },
        ]);
        return;
      }

      // Navigate to video call
      navigation.replace('VideoCall', {
        roomUrl: result.data.roomUrl,
        consultationId: result.data.consultationId,
        userName: userName,
        isHost: false,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join consultation', [
        { text: 'OK', onPress: () => setIsScanning(true) },
      ]);
    } finally {
      setIsJoining(false);
    }
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission to scan QR codes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Camera View */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isScanning && !isJoining}
        codeScanner={codeScanner}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            disabled={isJoining}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            {/* Corner indicators */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          
          <Text style={styles.scanText}>
            {isJoining ? 'Joining consultation...' : 'Scan QR code to join consultation'}
          </Text>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          {isJoining && <ActivityIndicator size="large" color="#FFF" style={styles.loader} />}
          <Text style={styles.infoText}>
            Position the QR code within the frame
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: S.xl,
    paddingHorizontal: S.xl,
  },
  bottomInfo: {
    paddingHorizontal: S.xl,
    paddingBottom: S.xl,
    alignItems: 'center',
  },
  loader: {
    marginBottom: S.md,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xl,
  },
  permissionTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  permissionText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: S.xl,
  },
  permissionButton: {
    backgroundColor: C.action,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.full,
    marginBottom: S.md,
  },
  permissionButtonText: {
    color: C.actionText,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: S.lg,
  },
});
