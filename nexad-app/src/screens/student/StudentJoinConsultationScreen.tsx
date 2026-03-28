import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { C, S, R, shadow } from '../../config/theme';

export default function StudentJoinConsultationScreen({ navigation }: any) {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinByCode = async () => {
    if (!user?.id) return;

    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character invite code.');
      return;
    }

    try {
      setIsJoining(true);

      const userName = `${user.first_name || 'Student'} ${user.last_name || ''}`.trim();

      const result = await consultationService.joinConsultation(code, user.id, userName);

      if (result.error || !result.data) {
        Alert.alert('Error', result.error || 'Failed to join consultation');
        return;
      }

      // Navigate to video call in browser
      await WebBrowser.openBrowserAsync(result.data.roomUrl);
      
      // Navigate back after opening browser
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join consultation');
    } finally {
      setIsJoining(false);
    }
  };

  // Remove QR scanning functionality
  const handleScanQR = () => {
    Alert.alert(
      'QR Scanning',
      'QR code scanning will be available in the next update. For now, please enter the invite code manually.',
      [{ text: 'OK' }]
    );
  };

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
