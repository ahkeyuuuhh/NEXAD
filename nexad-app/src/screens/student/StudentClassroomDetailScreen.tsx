import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { classroomService } from '../../services/classroomService';
import { notificationService } from '../../services/notificationService';
import { conversationService } from '../../services/conversationService';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'All' | 'Announcements' | 'Bins';
const TABS: Tab[] = ['All', 'Announcements', 'Bins'];
type ListItem = { type: 'announcement'; data: any } | { type: 'bin'; data: any };

export default function StudentClassroomDetailScreen({ navigation, route }: any) {
  const { classroomId } = route.params as { classroomId: string };
  const { user } = useAuth();

  const [classroom, setClassroom] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attachmentBins, setAttachmentBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadClassroomData();
  }, []);

  const loadClassroomData = async () => {
    try {
      const [classroomResult, announcementsResult, binsResult] = await Promise.all([
        classroomService.getClassroom(classroomId),
        classroomService.getClassroomAnnouncements(classroomId),
        classroomService.getClassroomAttachmentBins(classroomId),
      ]);
      if (classroomResult.data) setClassroom(classroomResult.data);
      if (announcementsResult.data) setAnnouncements(announcementsResult.data);
      if (binsResult.data) setAttachmentBins(binsResult.data);
    } catch (error) {
      console.error('Error loading classroom data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClassroomData();
  };

  const getListData = (): ListItem[] => {
    if (activeTab === 'Announcements')
      return announcements.map((d) => ({ type: 'announcement', data: d }));
    if (activeTab === 'Bins')
      return attachmentBins.map((d) => ({ type: 'bin', data: d }));
    return [
      ...announcements.map((d) => ({ type: 'announcement' as const, data: d })),
      ...attachmentBins.map((d) => ({ type: 'bin' as const, data: d })),
    ];
  };

  const handleUnenroll = () => {
    setShowMenu(false);
    Alert.alert(
      'Unenroll from Classroom',
      `Are you sure you want to unenroll from "${classroom?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unenroll',
          style: 'destructive',
          onPress: async () => {
            const result = await classroomService.leaveClassroom(classroomId, user!.user_id);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              // Notify the teacher
              if (classroom?.teacher_id) {
                notificationService.createNotification(
                  classroom.teacher_id,
                  'Student Unenrolled',
                  `${user!.first_name} ${user!.last_name} unenrolled from "${classroom.name}"`,
                  'classroom_announcement',
                  undefined,
                  classroomId
                ).catch(() => {});
              }
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleInviteCode = () => {
    setShowMenu(false);
    navigation.navigate('InviteCode', {
      classroomName: classroom?.name,
      inviteCode: classroom?.invite_code,
    });
  };

  const handleClassmates = () => {
    setShowMenu(false);
    navigation.navigate('EnrolledStudents', {
      classroomId,
      classroomName: classroom?.name,
      viewOnly: true,
    });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'announcement') {
      const ann = item.data;
      return (
        <View style={[styles.card, ann.is_pinned && styles.cardPinned]}>
          {ann.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#fff" />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          <View style={styles.cardTypeRow}>
            <Ionicons name="megaphone-outline" size={14} color={C.ink4} />
            <Text style={styles.cardTypeLabel}>Announcement</Text>
          </View>
          <Text style={styles.cardTitle}>{ann.title}</Text>
          <Text style={styles.cardBody}>{ann.content}</Text>
          <Text style={styles.cardDate}>
            {new Date(ann.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            style={styles.replyBtn}
            onPress={async () => {
              if (!user?.user_id || !classroom?.teacher_id) return;
              const result = await conversationService.getOrCreateAnnouncementThread(
                user.user_id,
                classroom.teacher_id,
                ann.id
              );
              if (result.data) {
                navigation.navigate('Chat', {
                  conversationId: result.data,
                  title: `Re: ${ann.title}`,
                  type: 'ANNOUNCEMENT_THREAD',
                });
              }
            }}
          >
            <Ionicons name="chatbubble-outline" size={13} color={C.ink3} />
            <Text style={styles.replyBtnText}>Reply to Teacher</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const bin = item.data;
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardBin]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AttachmentBinSubmission', { binId: bin.id })}
      >
        <View style={styles.binRow}>
          <View style={styles.binIcon}>
            <Ionicons name="folder" size={22} color={C.ink2} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTypeRow}>
              <Ionicons name="folder-outline" size={14} color={C.ink4} />
              <Text style={styles.cardTypeLabel}>Assignment Bin</Text>
            </View>
            <Text style={styles.cardTitle}>{bin.title}</Text>
            {bin.description ? (
              <Text style={styles.cardBody} numberOfLines={2}>{bin.description}</Text>
            ) : null}
            {bin.deadline ? (
              <View style={styles.binMeta}>
                <View style={styles.binMetaItem}>
                  <Ionicons name="time-outline" size={13} color="#D93025" />
                  <Text style={styles.binDeadlineText}>
                    Due {new Date(bin.deadline).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.ink5} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={activeTab === 'Bins' ? 'folder-outline' : 'reader-outline'}
        size={48}
        color={C.ink5}
      />
      <Text style={styles.emptyText}>
        {activeTab === 'Bins' ? 'No bins yet' : 'No announcements yet'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.ink3} />
      </View>
    );
  }

  if (!classroom) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 16, color: C.ink4 }}>Classroom not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{classroom.name}</Text>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.ellipsisBtn} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color={C.ink2} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={getListData()}
        keyExtractor={(item, i) => `${item.type}-${item.data?.id ?? i}`}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Options Menu */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />

            <TouchableOpacity style={styles.menuItem} onPress={handleInviteCode}>
              <Ionicons name="key-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Invite Code</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleClassmates}>
              <Ionicons name="people-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Classmates</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleUnenroll}>
              <Ionicons name="exit-outline" size={20} color="#D93025" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: '#D93025' }]}>Unenroll</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCancel} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#202124', letterSpacing: -0.2 },
  ellipsisBtn: { padding: 4, marginLeft: 8 },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EAED',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#202124' },
  tabText: { fontSize: 14, color: '#9AA0A6', fontWeight: '500' },
  tabTextActive: { color: '#202124', fontWeight: '600' },

  // List
  listContent: { padding: 16, flexGrow: 1 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPinned: { borderColor: '#9AA0A6' },
  cardBin: { paddingVertical: 14 },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardTypeLabel: {
    fontSize: 11,
    color: '#9AA0A6',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#202124', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#5F6368', lineHeight: 20, marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#9AA0A6' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#F1F3F4', borderRadius: 999 },
  replyBtnText: { fontSize: 12, color: '#5F6368', fontWeight: '500' },

  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#202124',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
  },
  pinnedText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  // Bin
  binRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  binIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  binMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  binMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  binDeadlineText: { fontSize: 12, color: '#D93025' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9AA0A6', marginTop: 12 },

  // Modal / Menu Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8EAED',
    alignSelf: 'center',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuIcon: { marginRight: 16 },
  menuItemText: { fontSize: 16, color: '#202124', fontWeight: '400' },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8EAED',
    marginHorizontal: 24,
  },
  menuCancel: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: '#F1F3F4',
    borderRadius: 999,
    alignItems: 'center',
  },
  menuCancelText: { fontSize: 16, fontWeight: '600', color: '#202124' },
});
