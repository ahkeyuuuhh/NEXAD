import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { C, S, R, shadow } from '../../config/theme';

export default function StudentJoinConsultationScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);

  // Check for deep link parameter
  useEffect(() => {
    if (route.params?.code) {
      setInviteCode(route.params.code);
      handleJoinByCode(route.params.code);
    }
  }, [route.params?.code]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  const handleJoinByCode = async (code?: string) => {
    if (!user?.id) return;

    const joinCode = (code || inviteCode).trim().toUpperCase();
    if (joinCode.length !== 6) {
      Alert.alert(
        'Invalid Code',
        'Please enter a valid 6-character invite code.',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
      return;
    }

    try {
      setIsJoining(true);

      const userName = `${user.first_name || 'Student'} ${user.last_name || ''}`.trim();

      const result = await consultationService.joinConsultation(joinCode, user.id, userName);

      if (result.error || !result.data) {
        Alert.alert(
          'Error',
          result.error || 'Failed to join consultation',
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
        return;
      }

      // Open Jitsi Meet in the app (not browser)
      const jitsiUrl = result.data.roomUrl;
      
      // Try to open with Jitsi Meet app first
      const jitsiAppUrl = jitsiUrl.replace('https://meet.jit.si/', 'org.jitsi.meet://');
      const canOpenApp = await Linking.canOpenURL(jitsiAppUrl);
      
      if (canOpenApp) {
        // Open in Jitsi Meet app
        await Linking.openURL(jitsiAppUrl);
        Alert.alert(
          'Joined!',
          'Opening video consultation in Jitsi Meet app...',
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
        navigation.goBack();
      } else {
        // Prompt to install Jitsi Meet app
        Alert.alert(
          'Install Jitsi Meet',
          'For the best experience, please install the Jitsi Meet app. Would you like to install it now?',
          [
            {
              text: 'Open in Browser',
              style: 'cancel',
              onPress: async () => {
                await Linking.openURL(jitsiUrl);
                navigation.goBack();
              }
            },
            {
              text: 'Install App',
              style: 'default',
              onPress: () => {
                const storeUrl = Platform.OS === 'android'
                  ? 'https://play.google.com/store/apps/details?id=org.jitsi.meet'
                  : 'https://apps.apple.com/app/jitsi-meet/id1165103905';
                Linking.openURL(storeUrl);
              }
            }
          ],
          { cancelable: true }
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to join consultation',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleScanQR = async () => {
    const granted = hasPermission || await requestCameraPermission();
    
    if (!granted) {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required to scan QR codes.',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
      return;
    }

    setScanning(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    
    // Extract code from deep link
    const match = data.match(/nexad:\/\/consultation\/join\/([A-Z0-9]{6})/i);
    if (match) {
      const code = match[1].toUpperCase();
      setInviteCode(code);
      handleJoinByCode(code);
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not a valid NEXAD consultation invite.',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    }
  };

  if (scanning) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <Text style={styles.scannerSubtitle}>
              Point your camera at the QR code shown by your teacher
            </Text>
            <TouchableOpacity
              style={styles.cancelScanButton}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.cancelScanText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#FFFFFF', '#EDF0F4', '#D0D5DC']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Consultation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="videocam" size={48} color={C.action} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Join Virtual Consultation</Text>
        <Text style={styles.subtitle}>
          Enter the invite code provided by your teacher or scan the QR code
        </Text>

        {/* Invite Code Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Invite Code</Text>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            placeholder="Enter 6-character code"
            placeholderTextColor={C.ink4}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isJoining}
          />
          <TouchableOpacity
            style={[styles.joinButton, (!inviteCode.trim() || isJoining) && styles.joinButtonDisabled]}
            onPress={handleJoinByCode}
            disabled={!inviteCode.trim() || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={C.actionText} />
            ) : (
              <>
                <Ionicons name="enter-outline" size={24} color={C.actionText} />
                <Text style={styles.joinButtonText}>Join Consultation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* QR Scanner */}
        <TouchableOpacity style={styles.qrButton} onPress={handleScanQR} disabled={isJoining}>
          <View style={styles.qrIconContainer}>
            <Ionicons name="qr-code-outline" size={32} color={C.action} />
          </View>
          <View style={styles.qrTextContainer}>
            <Text style={styles.qrButtonTitle}>Scan QR Code</Text>
            <Text style={styles.qrButtonSubtitle}>Use your camera to scan the code</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={C.ink3} />
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={C.ink3} />
          <Text style={styles.infoText}>
            Ask your teacher for the invite code or QR code to join the consultation
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: S.sm,
  },
  scannerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: S.xl * 2,
    marginBottom: S.xl * 2,
  },
  cancelScanButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelScanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: R.full,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.ink1,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: S.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: S.xl,
    marginBottom: S.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: C.ink1,
    textAlign: 'center',
    marginBottom: S.sm,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.ink3,
    textAlign: 'center',
    marginBottom: S.xl,
    paddingHorizontal: S.lg,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: S.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink2,
    marginBottom: S.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.md + 2,
    fontSize: 20,
    fontWeight: '700',
    color: C.ink1,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: S.md,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.action,
    paddingVertical: S.md + 2,
    borderRadius: R.full,
    gap: S.sm,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.actionText,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: S.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink4,
    marginHorizontal: S.md,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.xl,
  },
  qrIconContainer: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.md,
  },
  qrTextContainer: {
    flex: 1,
  },
  qrButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink1,
    marginBottom: 2,
  },
  qrButtonSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: C.ink3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: S.md,
    borderRadius: R.md,
    gap: S.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: C.ink2,
    lineHeight: 18,
  },
});
