import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';

export default function StudentClassroomsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    if (!user?.user_id) return;

    try {
      const result = await classroomService.getStudentClassrooms(user.user_id);
      if (result.data) {
        setClassrooms(result.data);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error loading classrooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClassrooms();
  };

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit invite code');
      return;
    }

    if (!user?.user_id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setJoining(true);
    try {
      const result = await classroomService.joinClassroom(
        user.user_id,
        inviteCode.trim().toUpperCase()
      );

      if (result.data) {
        Alert.alert('Success', 'You joined the classroom!');
        setShowJoinModal(false);
        setInviteCode('');
        loadClassrooms();
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error joining classroom:', error);
      Alert.alert('Error', 'Failed to join classroom');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveClassroom = (classroomId: string, classroomName: string) => {
    Alert.alert(
      'Leave Classroom',
      `Are you sure you want to leave "${classroomName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!user?.user_id) return;
            const result = await classroomService.leaveClassroom(classroomId, user.user_id);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              loadClassrooms();
            }
          },
        },
      ]
    );
  };

  const renderClassroom = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.classroomCard}
      onPress={() =>
        navigation.navigate('StudentClassroomDetail', { classroomId: item.id })
      }
    >
      <View style={styles.classroomHeader}>
        <View style={styles.classroomIcon}>
          <Ionicons name="school" size={22} color={C.ink1} />
        </View>
        <View style={styles.classroomInfo}>
          <Text style={styles.classroomName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.classroomDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.teacherName}>
            {item.teacher_first_name} {item.teacher_last_name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleLeaveClassroom(item.id, item.name)}
          style={styles.leaveButton}
        >
          <Ionicons name="exit-outline" size={20} color={C.ink4} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={C.ink1} />
        <Text style={styles.loadingText}>Loading classrooms...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Classrooms</Text>
          <Text style={styles.subtitle}>Join and manage your classes</Text>
        </View>
      </View>

      <FlatList
        data={classrooms}
        renderItem={renderClassroom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink2} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={56} color={C.ink5} />
            <Text style={styles.emptyText}>No classrooms yet</Text>
            <Text style={styles.emptySubtext}>Join a classroom using an invite code</Text>
          </View>
        }
      />

      {/* Bottom CTA */}
      <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
        <Ionicons name="enter" size={20} color={C.actionText} />
        <Text style={styles.joinButtonText}>Join Classroom</Text>
      </TouchableOpacity>

      {/* Join Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Classroom</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={22} color={C.ink3} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Enter Invite Code</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={C.ink5}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.submitButton, joining && styles.submitButtonDisabled]}
              onPress={handleJoinClassroom}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color={C.actionText} />
              ) : (
                <Text style={styles.submitButtonText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { fontWeight: '400' as const, fontSize: 15, color: C.ink3, marginTop: S.md },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
    marginRight: S.md, ...shadow.soft,
  },
  title: { fontWeight: '600' as const, fontSize: 22, color: C.ink1, letterSpacing: -0.3 },
  subtitle: { fontWeight: '400' as const, fontSize: 13, color: C.ink3, marginTop: 2 },

  listContainer: { padding: S.lg, paddingBottom: 100 },

  classroomCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight, ...shadow.card,
  },
  classroomHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  classroomIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md,
  },
  classroomInfo: { flex: 1 },
  classroomName: { fontWeight: '600' as const, fontSize: 16, color: C.ink1, marginBottom: 4 },
  classroomDescription: { fontWeight: '400' as const, fontSize: 13, color: C.ink3, marginBottom: 4, lineHeight: 18 },
  teacherName: { fontWeight: '400' as const, fontSize: 12, color: C.ink4 },
  leaveButton: { padding: S.sm },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontWeight: '600' as const, fontSize: 17, color: C.ink3, marginTop: S.lg },
  emptySubtext: { fontWeight: '400' as const, fontSize: 13, color: C.ink4, marginTop: S.sm },

  joinButton: {
    position: 'absolute', bottom: S.xl2, left: S.xl2, right: S.xl2,
    backgroundColor: C.action, borderRadius: R.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm,
    ...shadow.lift,
  },
  joinButtonText: { fontWeight: '600' as const, fontSize: 16, color: C.actionText },

  modalOverlay: { flex: 1, backgroundColor: C.scrim, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl2, width: '85%', maxWidth: 400, ...shadow.float },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xl2 },
  modalTitle: { fontWeight: '600' as const, fontSize: 20, color: C.ink1 },
  modalLabel: { fontWeight: '600' as const, fontSize: 14, color: C.ink2, marginBottom: S.sm },
  codeInput: {
    backgroundColor: C.bg, borderRadius: R.lg, padding: S.lg,
    fontWeight: '600' as const, fontSize: 24, textAlign: 'center', letterSpacing: 4,
    color: C.ink1, marginBottom: S.xl, borderWidth: 1, borderColor: C.borderLight,
  },
  submitButton: {
    backgroundColor: C.action, borderRadius: R.lg, paddingVertical: 16, alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontWeight: '600' as const, fontSize: 16, color: C.actionText },
});
