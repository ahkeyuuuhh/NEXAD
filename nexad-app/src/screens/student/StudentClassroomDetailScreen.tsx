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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { classroomService } from '../../services/classroomService';
import { notificationService } from '../../services/notificationService';
import { supabase } from '../../config/supabase';
import { conversationService } from '../../services/conversationService';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, shadow } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../utils/Alert';

type Tab = 'All' | 'Announcements' | 'Bins';
const TABS: Tab[] = ['All', 'Announcements', 'Bins'];
type ListItem = { type: 'announcement'; data: any } | { type: 'bin'; data: any };

const getBannerColor = (coverColor: string | null | undefined) => {
  // Use the classroom's cover_color if set, otherwise default to black
  return coverColor || '#202124';
};

export default function StudentClassroomDetailScreen({ navigation, route }: any) {
  const { classroomId } = route.params as { classroomId: string };
  const { user } = useAuth();

  const [classroom, setClassroom] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attachmentBins, setAttachmentBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadClassroomData();
  }, []);

  // Real-time sync: reload when announcements or bins change in this classroom
  useEffect(() => {
    const ch = supabase
      .channel(`student-classroom-detail-rt:${classroomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'announcements',
        filter: `classroom_id=eq.${classroomId}`,
      }, () => loadClassroomData())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'attachment_bins',
        filter: `classroom_id=eq.${classroomId}`,
      }, () => loadClassroomData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [classroomId]);

  const loadClassroomData = async () => {
    try {
      const [classroomResult, membersResult, announcementsResult, binsResult] = await Promise.all([
        classroomService.getClassroom(classroomId),
        classroomService.getClassroomMembers(classroomId),
        classroomService.getClassroomAnnouncements(classroomId),
        classroomService.getClassroomAttachmentBins(classroomId),
      ]);
      if (classroomResult.data) setClassroom(classroomResult.data);
      if (membersResult.data) {
        setMembers(membersResult.data);
      }
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
    if (activeTab === 'Announcements') {
      return announcements.map((d) => ({ type: 'announcement' as const, data: d }));
    }
    if (activeTab === 'Bins') {
      return attachmentBins.map((d) => ({ type: 'bin' as const, data: d }));
    }
    // 'All' shows both announcements and bins
    return [
      ...announcements.map((d) => ({ type: 'announcement' as const, data: d })),
      ...attachmentBins.map((d) => ({ type: 'bin' as const, data: d })),
    ];
  };

  const upcomingDeadlines = attachmentBins
    .filter(b => b.deadline && new Date(b.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  // Get teacher info from members list
  const teacherProfile = members.find(m => m.is_teacher === true);
  const studentMembers = members.filter(m => m.is_teacher !== true);

  const handleUnenroll = () => {
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

  const handleMenuPress = () => {
    Alert.alert(
      'Classroom Options',
      undefined,
      [
        {
          text: 'View Invite Code',
          onPress: () => {
            navigation.navigate('InviteCode', {
              classroomName: classroom?.name,
              inviteCode: classroom?.invite_code,
            });
          },
        },
        {
          text: 'View Classmates',
          onPress: () => {
            navigation.navigate('EnrolledStudents', { classroomId });
          },
        },
        {
          text: 'Unenroll from Class',
          onPress: handleUnenroll,
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };



  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'announcement') {
      const ann = item.data;
      return (
        <View style={styles.activityCard}>
          <View style={styles.activityIconWrap}>
            <Ionicons name="megaphone" size={20} color="#202124" />
          </View>
          <View style={styles.activityContent}>
            {ann.is_pinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={10} color="#fff" />
                <Text style={styles.pinnedText}>PINNED</Text>
              </View>
            )}
            <Text style={styles.activityTitle}>{ann.title}</Text>
            <Text style={styles.activityBody} numberOfLines={3}>{ann.content}</Text>
            <View style={styles.activityFooter}>
              <Text style={styles.activityDate}>
                {new Date(ann.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <TouchableOpacity
                style={styles.commentBtn}
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
                <Ionicons name="chatbubble-outline" size={14} color="#5F6368" />
                <Text style={styles.commentBtnText}>Add comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const bin = item.data;
    const isOverdue = bin.deadline && new Date(bin.deadline) < new Date();
    return (
      <TouchableOpacity
        style={styles.activityCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AttachmentBinSubmission', { binId: bin.id })}
      >
        <View style={styles.activityIconWrap}>
          <Ionicons name="clipboard" size={20} color="#202124" />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{bin.title}</Text>
          {bin.description ? (
            <Text style={styles.activityBody} numberOfLines={2}>{bin.description}</Text>
          ) : null}
          <View style={styles.activityFooter}>
            {bin.deadline ? (
              <View style={[styles.dueBadge, isOverdue && styles.dueBadgeOverdue]}>
                <Ionicons name="time-outline" size={12} color={isOverdue ? '#D93025' : '#5F6368'} />
                <Text style={[styles.dueText, isOverdue && styles.dueTextOverdue]}>
                  Due {new Date(bin.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#DADCE0" />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={activeTab === 'Announcements' ? 'megaphone-outline' : activeTab === 'Bins' ? 'clipboard-outline' : 'reader-outline'}
        size={56}
        color="#DADCE0"
      />
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'Announcements' ? 'No announcements posted' : 
         activeTab === 'Bins' ? 'No assignments posted' : 
         'No content to show'}
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

  const bannerColor = classroom ? getBannerColor(classroom.cover_color) : '#202124';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={bannerColor} />

      {/* Class Banner Header */}
      <View style={[styles.banner, { backgroundColor: bannerColor }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.bannerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.bannerBackBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.bannerCenter}>
              <Text style={styles.bannerTitle}>{classroom?.name || 'Classroom'}</Text>
            </View>
            <TouchableOpacity onPress={handleMenuPress} style={styles.bannerMenuBtn}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.bannerContent}>
            <View style={styles.inviteCodePill}>
              <Ionicons name="key" size={12} color="#fff" />
              <Text style={styles.inviteCodeText}>{classroom?.invite_code || '------'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tab Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        style={styles.tabBarContainer}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <FlatList
        style={styles.feed}
        data={getListData()}
        keyExtractor={(item, i) => `${item.type}-${item.data?.id ?? i}`}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },

  // Banner Header
  banner: { paddingBottom: 24 },
  bannerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingTop: 8 
  },
  bannerBackBtn: { padding: 8 },
  bannerCenter: { flex: 1, alignItems: 'center' },
  bannerMenuBtn: { padding: 8 },
  bannerContent: { paddingHorizontal: 24, paddingTop: 8, alignItems: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: '600', color: '#fff', textAlign: 'center' },
  inviteCodePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start',
  },
  inviteCodeText: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 1 },

  // Tab Bar - Pill shaped carousel
  tabBarContainer: { 
    backgroundColor: C.bg,
    paddingVertical: 12,
  },
  tabBar: { 
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    borderRadius: 999,
    minWidth: 60,
  },
  tabActive: { backgroundColor: '#202124' },
  tabText: { fontSize: 14, color: '#5F6368', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Content Layout
  scrollContent: { flex: 1, backgroundColor: '#F8F9FA' },

  // Feed
  feed: { flex: 1, backgroundColor: '#F8F9FA' },
  feedContent: { padding: 16, paddingBottom: 100 },

  // Activity Cards
  activityCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#DADCE0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  activityIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  activityContent: { flex: 1, backgroundColor: 'transparent' },
  activityTitle: { fontSize: 15, fontWeight: '600', color: '#202124', marginBottom: 6, backgroundColor: 'transparent' },
  activityBody: { fontSize: 14, color: '#5F6368', lineHeight: 20, marginBottom: 10, backgroundColor: 'transparent' },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
  activityDate: { fontSize: 12, color: '#9AA0A6', backgroundColor: 'transparent' },
  commentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'transparent', borderRadius: 16,
  },
  commentBtnText: { fontSize: 12, color: '#5F6368', fontWeight: '500' },

  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#202124', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8,
  },
  pinnedText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  dueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 12,
  },
  dueBadgeOverdue: { backgroundColor: '#FCE8E6' },
  dueText: { fontSize: 12, color: '#5F6368', fontWeight: '500' },
  dueTextOverdue: { color: '#D93025' },

  // People Section
  peopleSection: { padding: 16 },
  peopleSectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#5F6368', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#DADCE0',
  },
  personAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  personAvatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  personAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  personName: { fontSize: 15, fontWeight: '500', color: '#202124' },
  upcomingEmpty: { fontSize: 13, color: '#9AA0A6', textAlign: 'center', paddingVertical: 12 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: '#5F6368', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9AA0A6', marginTop: 6 },
});
