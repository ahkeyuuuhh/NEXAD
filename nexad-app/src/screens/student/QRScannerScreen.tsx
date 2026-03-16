import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/Alert';

export default function QRScannerScreen({ navigation, route }: any) {
  const { onCodeScanned } = route.params as { onCodeScanned: (code: string) => void };
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Corner bracket animation
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    const code = (data ?? '').trim().toUpperCase();
    if (!code) return;
    setScanned(true);
    // Return to previous screen with the scanned code
    navigation.goBack();
    onCodeScanned(code);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={48} color="#fff" style={{ marginBottom: 16 }} />
          <Text style={styles.permissionText}>Camera permission is required to scan QR codes.</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        {/* Top dark band */}
        <View style={styles.overlayBand} />

        {/* Middle row: side bands + scan window */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />

          {/* Scan window */}
          <Animated.View style={[styles.scanWindow, { transform: [{ scale: pulse }] }]}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </Animated.View>

          <View style={styles.overlaySide} />
        </View>

        {/* Bottom dark band */}
        <View style={styles.overlayBand} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>
          {scanned ? 'Code detected! Joining classroom…' : 'Point your camera at the classroom QR code'}
        </Text>
      </View>

      {/* Rescan button if somehow needed */}
      {scanned && (
        <View style={styles.rescanRow}>
          <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
            <Ionicons name="refresh" size={18} color="#202124" />
            <Text style={styles.rescanText}>Scan again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const WIN = 240;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Permission screen
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  permissionText: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permissionBtn: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14, marginBottom: 12,
  },
  permissionBtnText: { color: '#202124', fontWeight: '700', fontSize: 15 },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayBand: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: WIN },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanWindow: {
    width: WIN,
    height: WIN,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, fontWeight: '700' },

  // Hint
  hintRow: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  hintText: { color: '#fff', fontSize: 14, textAlign: 'center', opacity: 0.9, lineHeight: 20 },

  rescanRow: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  rescanText: { color: '#202124', fontWeight: '700', fontSize: 14 },
});
