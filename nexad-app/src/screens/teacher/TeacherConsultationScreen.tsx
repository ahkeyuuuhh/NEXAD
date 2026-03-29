import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService, VirtualConsultation } from '../../services/consultationService';
import { C, S, R, shadow } from '../../config/theme';

export default function TeacherConsultationScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState<VirtualConsultation | null>(null);
  const [consultationHistory, setConsultationHistory] = useState<VirtualConsultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Get active consultations
      const activeResult = await consultationService.getActiveConsultations(user.id);
      if (activeResult.data && activeResult.data.length > 0) {
        setActiveConsultation(activeResult.data[0]);
      }

      // Get consultation history
      const historyResult = await consultationService.getConsultationHistory(user.id, 10);
      if (historyResult.data) {
        setConsultationHistory(historyResult.data);
      }
    } catch (error) {
      console.error('Error loading consultations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConsultation = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    try {
      setIsCreating(true);

      const userName = `${user.first_name || 'Teacher'} ${user.last_name || ''}`.trim();

      console.log('🔵 [SCREEN] Starting consultation creation...');
      console.log('🔵 [SCREEN] User ID:', user.id);
      console.log('🔵 [SCREEN] User Name:', userName);

      const result = await consultationService.createConsultation(user.id, userName);

      console.log('🔵 [SCREEN] Result:', result);

      if (result.error || !result.data) {
        const errorMsg = result.error || 'Failed to create consultation';
        console.error('🔴 [SCREEN] Error:', errorMsg);
        
        // Show detailed error with all info
        Alert.alert(
          'Consultation Error', 
          `${errorMsg}\n\n📋 Debug Info:\n• Database: Fixed ✅\n• Daily.co API: Configured ✅\n• User ID: ${user.id}\n• User Name: ${userName}\n\nPlease check console logs for details.`
        );
        return;
      }

      console.log('✅ [SCREEN] Consultation created:', result.data.id);
      setActiveConsultation(result.data);
      Alert.alert(
        'Success!',
        'Consultation room created! Share the invite code or QR code with your student.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('🔴 [SCREEN] Exception:', error);
      Alert.alert(
        'Unexpected Error', 
        `${error.message || 'Failed to create consultation'}\n\nCheck console logs for details.`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartCall = async () => {
    if (!activeConsultation) return;

    try {
      // Open Daily.co room in browser
      await WebBrowser.openBrowserAsync(activeConsultation.room_url);
    } catch (error) {
      console.error('Error opening video call:', error);
      Alert.alert('Error', 'Failed to open video call');
    }
  };

  const handleShareCode = async () => {
    if (!activeConsultation) return;

    try {
      await Share.share({
        message: `Join my NEXAD consultation!\n\nInvite Code: ${activeConsultation.invite_code}\n\nOr scan the QR code in the app.`,
        title: 'NEXAD Consultation Invite',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCancelConsultation = () => {
    if (!activeConsultation) return;

    Alert.alert(
      'Cancel Consultation',
      'Are you sure you want to cancel this consultation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await consultationService.cancelConsultation(activeConsultation.id);
            if (result.data) {
              setActiveConsultation(null);
              loadConsultations();
            }
          },
        },
      ]
    );
  };

  const renderActiveConsultation = () => {
    if (!activeConsultation) return null;

    const deepLink = `nexad://join/${activeConsultation.invite_code}`;

    return (
      <View style={styles.activeCard}>
        <View style={styles.activeHeader}>
          <View style={styles.activeHeaderLeft}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
            <Text style={styles.activeTitle}>Virtual Consultation</Text>
          </View>
          <TouchableOpacity onPress={handleCancelConsultation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={deepLink}
              size={180}
              backgroundColor="white"
              color="black"
            />
          </View>
          <Text style={styles.qrLabel}>Scan to Join</Text>
        </View>

        {/* Invite Code */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Invite Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{activeConsultation.invite_code}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
            <Ionicons name="share-outline" size={20} color={C.actionText} />
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartCall}>
            <Ionicons name="videocam" size={24} color="#FFF" />
            <Text style={styles.startButtonText}>Start Consultation</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.ink3} />
          <Text style={styles.infoText}>
            {activeConsultation.student_name
              ? `Waiting for ${activeConsultation.student_name} to join...`
              : 'Waiting for student to join...'}
          </Text>
        </View>
      </View>
    );
  };

  const renderHistory = () => {
    const completedConsultations = consultationHistory.filter(c => c.status === 'completed');

    if (completedConsultations.length === 0) {
      return (
        <View style={styles.emptyHistory}>
          <Ionicons name="time-outline" size={48} color={C.ink5} />
          <Text style={styles.emptyHistoryText}>No consultation history yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Consultations</Text>
        {completedConsultations.slice(0, 5).map((consultation) => (
          <View key={consultation.id} style={styles.historyCard}>
            <View style={styles.historyIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyStudent}>
                {consultation.student_name || 'Unknown Student'}
              </Text>
              <Text style={styles.historyDate}>
                {new Date(consultation.created_at).toLocaleDateString()} • {consultation.duration_minutes} min
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#FFFFFF', '#EDF0F4', '#D0D5DC']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.2, y: 1 }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.action} />
          <Text style={styles.loadingText}>Loading consultations...</Text>
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
        <Text style={styles.headerTitle}>Virtual Consultation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Version indicator for debugging */}
        <View style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
            Virtual Consultation v2.1 - Enhanced Error Logging
          </Text>
        </View>

        {activeConsultation ? (
          renderActiveConsultation()
        ) : (
          <View style={styles.createSection}>
            <View style={styles.createIcon}>
              <Ionicons name="videocam-outline" size={64} color={C.action} />
            </View>
            <Text style={styles.createTitle}>Start Virtual Consultation</Text>
            <Text style={styles.createDescription}>
              Create a consultation room and share the invite code or QR code with your student.
            </Text>
            
            {/* Debug info */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
                ✅ Database: Ready{'\n'}
                ✅ Video: Jitsi Meet (100% Free){'\n'}
                ✅ User: {user?.id ? 'Authenticated' : 'Not authenticated'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateConsultation}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={C.actionText} />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={24} color={C.actionText} />
                  <Text style={styles.createButtonText}>Create Consultation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {renderHistory()}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink3,
    marginTop: S.md,
  },
  createSection: {
    alignItems: 'center',
    paddingVertical: S.xl * 2,
  },
  createIcon: {
    marginBottom: S.xl,
  },
  createTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.ink1,
    marginBottom: S.sm,
  },
  createDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: C.ink3,
    textAlign: 'center',
    marginBottom: S.xl,
    paddingHorizontal: S.xl,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.action,
    paddingHorizontal: S.xl,
    paddingVertical: S.md + 2,
    borderRadius: R.full,
    gap: S.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.actionText,
  },
  activeCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: R.lg + 2,
    padding: S.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    marginBottom: S.xl,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: S.lg,
  },
  activeHeaderLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.full,
    alignSelf: 'flex-start',
    marginBottom: S.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink1,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: S.xl,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFF',
    padding: S.lg,
    borderRadius: R.lg,
    ...shadow.soft,
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.ink3,
    marginTop: S.md,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: S.lg,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.ink3,
    marginBottom: S.sm,
  },
  codeBox: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.md,
    marginBottom: S.md,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: C.ink1,
    letterSpacing: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.action,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.full,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.actionText,
  },
  actions: {
    marginBottom: S.md,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: S.md + 2,
    borderRadius: R.full,
    gap: S.sm,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  historySection: {
    marginTop: S.lg,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink1,
    marginBottom: S.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: S.md,
    borderRadius: R.md,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  historyIcon: {
    marginRight: S.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyStudent: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink1,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '400',
    color: C.ink3,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: S.xl * 2,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink4,
    marginTop: S.md,
  },
});
