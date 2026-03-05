import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R } from '../../config/theme';

const BANNER_COLORS = [
  '#202124', '#3C4043', '#5F6368', '#37474F',
  '#1A1A2E', '#2D2D2D', '#455A64', '#424242',
];

const getFallbackColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return BANNER_COLORS[Math.abs(hash) % BANNER_COLORS.length];
};

const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : 'C');

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 380, delay: index * 70,
      easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

export default function StudentClassroomsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => { loadClassrooms(); }, []);

  const loadClassrooms = async () => {
    if (!user?.user_id) return;
    try {
      const result = await classroomService.getStudentClassrooms(user.user_id);
      if (result.data) {
        const classroomsWithCount = await Promise.all(
          result.data.map(async (classroom: any) => {
            const countResult = await classroomService.getMemberCount(classroom.id);
            return { ...classroom, memberCount: countResult.data || 0 };
          })
        );
        setClassrooms(classroomsWithCount);
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

  const onRefresh = () => { setRefreshing(true); loadClassrooms(); };

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit invite code');
      return;
    }
    if (!user?.user_id) { Alert.alert('Error', 'You must be logged in'); return; }
    setJoining(true);
    try {
      const result = await classroomService.joinClassroom(user.user_id, inviteCode.trim().toUpperCase());
      if (result.data) {
        Alert.alert('Success', 'You joined the classroom!');
        setShowJoinModal(false);
        setInviteCode('');
        loadClassrooms();
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join classroom');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveClassroom = (classroomId: string, classroomName: string) => {
    Alert.alert('Leave Classroom', `Are you sure you want to leave "${classroomName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          if (!user?.user_id) return;
          const result = await classroomService.leaveClassroom(classroomId, user.user_id);
          if (result.error) Alert.alert('Error', result.error);
          else loadClassrooms();
        },
      },
    ]);
  };

  const handleCardOptions = (item: any) => {
    Alert.alert(item.name, 'Choose an action', [
      { text: 'Open Classroom', onPress: () => navigation.navigate('StudentClassroomDetail', { classroomId: item.id }) },
      { text: 'Unenroll', style: 'destructive', onPress: () => handleLeaveClassroom(item.id, item.name) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderClassroom = ({ item, index }: { item: any; index: number }) => {
    const cover = item.cover_color || getFallbackColor(item.id);
    const initial = getInitial(item.name);
    return (
      <AnimatedCard index={index}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('StudentClassroomDetail', { classroomId: item.id })}
          activeOpacity={0.88}
        >
          <View style={[styles.cardBanner, { backgroundColor: cover }]}>
            <View style={styles.bannerTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                {item.description ? <Text style={styles.cardSection} numberOfLines={1}>{item.description}</Text> : null}
                <Text style={styles.cardTeacher} numberOfLines={1}>
                  {item.teacher_first_name} {item.teacher_last_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => handleCardOptions(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.bannerBottom}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardBody}>
            <View style={styles.cardMeta}>
              <Ionicons name="people-outline" size={16} color="#5F6368" />
              <Text style={styles.cardMetaText}>
                {item.memberCount} {item.memberCount === 1 ? 'student' : 'students'}
              </Text>
            </View>
            <View style={styles.codeChip}>
              <Ionicons name="key-outline" size={13} color="#5F6368" />
              <Text style={styles.codeText}>{item.invite_code}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#202124" />
        <Text style={styles.loadingText}>Loading classrooms...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#3C4043" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>My Classrooms</Text>
      </View>

      <FlatList
        data={classrooms}
        renderItem={renderClassroom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={72} color="#BCC0C6" />
            <Text style={styles.emptyTitle}>No classrooms yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to join a classroom using an invite code</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowJoinModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Join Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Classroom</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={22} color="#5F6368" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Enter Invite Code</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#BCC0C6"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.submitButton, joining && { opacity: 0.6 }]}
              onPress={handleJoinClassroom}
              disabled={joining}
            >
              {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Join</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#5F6368' },

  // App Bar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { padding: 4, marginRight: 8 },
  appBarTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: '#202124' },

  // List
  listContent: { padding: 16, paddingBottom: 88 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  cardBanner: { height: 96, padding: 14 },
  bannerTop: { flexDirection: 'row', flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 20 },
  cardSection: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardTeacher: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  moreBtn: { padding: 4 },
  bannerBottom: { alignItems: 'flex-end' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#202124' },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8EAED' },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { fontSize: 13, color: '#5F6368' },
  codeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F3F4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  codeText: { fontSize: 12, color: '#5F6368', fontWeight: '600', letterSpacing: 0.5 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#202124', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#3C4043', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9AA0A6', textAlign: 'center', lineHeight: 20, marginTop: 8 },

  // Join Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#202124' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#5F6368', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeInput: {
    borderWidth: 1.5, borderColor: '#E8EAED', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, fontWeight: '700', color: '#202124', textAlign: 'center', letterSpacing: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#202124', borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
