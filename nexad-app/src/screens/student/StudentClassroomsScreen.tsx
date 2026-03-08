import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { classroomService } from '../../services/classroomService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R } from '../../config/theme';
import * as ImagePicker from 'expo-image-picker';
import { uploadAsync, FileSystemUploadType, copyAsync, deleteAsync, cacheDirectory } from 'expo-file-system/legacy';

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
  const authContext = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>();
  const menuAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const { unreadCount, refresh: refreshNotifCount } = useRealtimeNotifications(user?.user_id);

  const displayName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Student' : 'Student';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const openMenu = () => {
    setShowMenu(true);
    menuAnim.setValue(300);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(menuAnim, {
        toValue: 0, damping: 28, stiffness: 280, mass: 0.8,
        overshootClamping: true, useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: 250,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: 300, duration: 200,
        easing: Easing.in(Easing.bezier(0.4, 0, 1, 1)), useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0, duration: 160,
        easing: Easing.in(Easing.quad), useNativeDriver: true,
      }),
    ]).start(({ finished }) => { if (finished) setShowMenu(false); });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => authContext.signOut() },
    ]);
  };

  useEffect(() => {
    if (user?.user_id) {
      profileService.getStudentProfile(user.user_id).then(result => {
        if (result.data?.profile_photo_url) setStudentPhotoUrl(result.data.profile_photo_url);
      });
    }
  }, [user?.user_id]);

  useFocusEffect(useCallback(() => {
    loadClassrooms();
    refreshNotifCount();
  }, [user?.user_id, refreshNotifCount]));

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

  const handleJoinClassroom = async (codeOverride?: string) => {
    const code = codeOverride ?? inviteCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit invite code');
      return;
    }
    if (!user?.user_id) { Alert.alert('Error', 'You must be logged in'); return; }
    setJoining(true);
    try {
      const result = await classroomService.joinClassroom(user.user_id, code);
      if (result.data) {
        Alert.alert('Success', 'You joined the classroom!');
        setShowJoinModal(false);
        setInviteCode('');
        loadClassrooms();
        // Notify the classroom's teacher
        const classroomId = result.data?.classroom_id;
        if (classroomId) {
          classroomService.getClassroom(classroomId).then(({ data: cls }) => {
            if (cls?.teacher_id) {
              notificationService.createNotification(
                cls.teacher_id,
                'New Student Joined',
                `${user.first_name} ${user.last_name} joined ${cls.name}`,
                'classroom_announcement',
                undefined,
                cls.id
              ).catch(() => {});
            }
          }).catch(() => {});
        }
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join classroom');
    } finally {
      setJoining(false);
    }
  };

  const decodeQRFromUri = async (uri: string): Promise<string | null> => {
    let uploadUri = uri;
    let tempPath: string | null = null;
    try {
      // Android image picker can return content:// URIs — copy to cache for uploadAsync
      if (!uri.startsWith('file://')) {
        tempPath = `${cacheDirectory}qr_decode_${Date.now()}.jpg`;
        await copyAsync({ from: uri, to: tempPath });
        uploadUri = tempPath;
      }
      const response = await uploadAsync(
        'https://api.qrserver.com/v1/read-qr-code/',
        uploadUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: 'image/jpeg',
        }
      );
      const result = JSON.parse(response.body);
      const symbol = result?.[0]?.symbol?.[0];
      // API returns error string when no QR found
      if (!symbol || symbol.error) return null;
      const decoded: string = (symbol.data ?? '').trim().toUpperCase();
      // Accept any non-empty decoded string; join validation checks length
      return decoded.length > 0 ? decoded : null;
    } catch {
      return null;
    } finally {
      if (tempPath) deleteAsync(tempPath, { idempotent: true }).catch(() => {});
    }
  };

  const handleScanQR = () => {
    setShowJoinModal(false);
    // Navigate to the real-time QR scanner; callback fires when code is detected
    navigation.navigate('QRScanner', {
      onCodeScanned: async (code: string) => {
        setQrLoading(true);
        try {
          await handleJoinClassroom(code);
        } finally {
          setQrLoading(false);
        }
      },
    });
  };

  const handlePickQR = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Gallery access is required to upload QR codes');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setQrLoading(true);
      try {
        const code = await decodeQRFromUri(result.assets[0].uri);
        if (code) {
          await handleJoinClassroom(code);
        } else {
          Alert.alert('Not found', 'Could not read a valid invite code. Make sure the image contains a Nexad classroom QR code.');
        }
      } finally {
        setQrLoading(false);
      }
    }
  };

  const handleLeaveClassroom = (classroomId: string, classroomName: string, teacherId?: string) => {
    Alert.alert('Leave Classroom', `Are you sure you want to leave "${classroomName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          if (!user?.user_id) return;
          setClassrooms(prev => prev.filter((c: any) => c.id !== classroomId));
          const result = await classroomService.leaveClassroom(classroomId, user.user_id);
          if (result.error) {
            Alert.alert('Error', result.error);
            loadClassrooms();
          } else {
            // Notify the classroom's teacher
            if (teacherId) {
              notificationService.createNotification(
                teacherId,
                'Student Unenrolled',
                `${user.first_name} ${user.last_name} left "${classroomName}"`,
                'classroom_announcement',
                undefined,
                classroomId
              ).catch(() => {});
            }
          }
        },
      },
    ]);
  };

  const handleCardOptions = (item: any) => {
    Alert.alert(item.name, 'Choose an action', [
      { text: 'Open Classroom', onPress: () => navigation.navigate('StudentClassroomDetail', { classroomId: item.id }) },
      { text: 'Unenroll', style: 'destructive', onPress: () => handleLeaveClassroom(item.id, item.name, item.teacher_id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderClassroom = ({ item, index }: { item: any; index: number }) => {
    const cover = item.cover_color || getFallbackColor(item.id);
    const initial = getInitial(item.name);
    const isImageCover = cover.startsWith('http');
    return (
      <AnimatedCard index={index}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('StudentClassroomDetail', { classroomId: item.id })}
          activeOpacity={0.88}
        >
          <View style={[styles.cardBanner, !isImageCover && { backgroundColor: cover }]}>
            {isImageCover && <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
            {isImageCover && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.40)' }]} />}
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
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* App Bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>My Classrooms</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color="#3C4043" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
            <Ionicons name="menu" size={26} color="#3C4043" />
          </TouchableOpacity>
        </View>
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
            {/* QR Code options */}
            <View style={styles.qrDivider}>
              <View style={styles.qrDividerLine} />
              <Text style={styles.qrDividerText}>or use QR code</Text>
              <View style={styles.qrDividerLine} />
            </View>
            <View style={styles.qrOptRow}>
              <TouchableOpacity
                style={styles.qrOptBtn}
                onPress={handleScanQR}
                disabled={qrLoading || joining}
                activeOpacity={0.75}
              >
                <Ionicons name="camera-outline" size={22} color="#202124" />
                <Text style={styles.qrOptText}>Scan QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.qrOptBtn}
                onPress={handlePickQR}
                disabled={qrLoading || joining}
                activeOpacity={0.75}
              >
                <Ionicons name="image-outline" size={22} color="#202124" />
                <Text style={styles.qrOptText}>Upload QR</Text>
              </TouchableOpacity>
            </View>
            {qrLoading && <ActivityIndicator size="small" color="#202124" style={{ marginBottom: 12 }} />}
            <TouchableOpacity
              style={[styles.submitButton, (joining || qrLoading) && { opacity: 0.6 }]}
              onPress={() => handleJoinClassroom()}
              disabled={joining || qrLoading}
            >
              {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Join</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Burger Menu Drawer */}
      <Modal visible={showMenu} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeMenu} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: menuAnim }] }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                {studentPhotoUrl ? (
                  <Image source={{ uri: studentPhotoUrl }} style={styles.drawerAvatarImg} />
                ) : (
                  <Text style={styles.drawerAvatarText}>{displayInitial}</Text>
                )}
              </View>
              <View style={styles.drawerHeaderInfo}>
                <Text style={styles.drawerName}>{displayName}</Text>
                <Text style={styles.drawerRole}>Student</Text>
              </View>
              <TouchableOpacity onPress={closeMenu} style={styles.drawerClose}>
                <Ionicons name="close" size={20} color={C.ink3} />
              </TouchableOpacity>
            </View>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('StudentDashboard'); }}>
              <Ionicons name="home-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu()}>
              <Ionicons name="book-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>My Classes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('FindTeacher'); }}>
              <Ionicons name="search-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Find a Teacher</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('StudentConsultations'); }}>
              <Ionicons name="calendar-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>My Consultations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('Notifications'); }}>
              <Ionicons name="notifications-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Notifications</Text>
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); handleSignOut(); }}>
              <Ionicons name="log-out-outline" size={20} color={C.red} style={styles.drawerItemIcon} />
              <Text style={[styles.drawerItemText, { color: C.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
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
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  appBarTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: '#202124', paddingLeft: 8 },
  appBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#D93025', borderRadius: 10, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#fff',
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' as const },
  menuBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

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

  // QR join options
  qrDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 4 },
  qrDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#E8EAED' },
  qrDividerText: { fontSize: 11, color: '#9AA0A6', paddingHorizontal: 10, fontWeight: '500' },
  qrOptRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  qrOptBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: '#E8EAED', borderRadius: 12, paddingVertical: 14,
  },
  qrOptText: { fontSize: 12, color: '#202124', fontWeight: '600' },

  // Drawer
  drawerOverlay: { flex: 1 },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, right: 0,
    width: 300, backgroundColor: '#fff',
    elevation: 16, shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 52,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EAED',
  },
  drawerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#202124', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  drawerAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  drawerAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' as const },
  drawerHeaderInfo: { flex: 1, marginLeft: 12 },
  drawerName: { fontSize: 15, fontWeight: '600' as const, color: '#202124' },
  drawerRole: { fontSize: 12, color: '#5F6368', marginTop: 2 },
  drawerClose: { padding: 4 },
  drawerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8EAED', marginVertical: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  drawerItemIcon: { marginRight: 14 },
  drawerItemText: { fontSize: 15, color: '#202124' },
});
