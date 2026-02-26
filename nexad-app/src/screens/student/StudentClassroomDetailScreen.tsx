import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';

export default function StudentClassroomDetailScreen({ navigation, route }: any) {
  const { classroomId } = route.params as { classroomId: string };

  const [classroom, setClassroom] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attachmentBins, setAttachmentBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.ink3} />
      </View>
    );
  }

  if (!classroom) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Classroom not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={C.ink1} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {classroom.name}
          </Text>
        </View>

        {/* Classroom Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{classroom.name}</Text>
          {classroom.description && (
            <Text style={styles.infoDescription}>{classroom.description}</Text>
          )}
          <View style={styles.teacherInfo}>
            <Ionicons name="person" size={16} color={C.ink3} />
            <Text style={styles.teacherText}>
              Teacher: {classroom.teacher_first_name} {classroom.teacher_last_name}
            </Text>
          </View>
        </View>

        {/* Announcements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="megaphone" size={20} color={C.ink2} />
            <Text style={styles.sectionTitle}>Announcements</Text>
          </View>

          {announcements.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={48} color={C.ink5} />
              <Text style={styles.emptyText}>No announcements yet</Text>
            </View>
          ) : (
            announcements.map((announcement) => (
              <View
                key={announcement.id}
                style={[
                  styles.announcementCard,
                  announcement.is_pinned && styles.announcementCardPinned,
                ]}
              >
                {announcement.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color={C.actionText} />
                    <Text style={styles.pinnedText}>Pinned</Text>
                  </View>
                )}
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementContent}>{announcement.content}</Text>
                <Text style={styles.announcementDate}>
                  {new Date(announcement.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Attachment Bins Section */}
        <View style={[styles.section, { marginBottom: S.xxl + S.sm }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="folder" size={20} color={C.ink2} />
            <Text style={styles.sectionTitle}>Attachment Bins</Text>
          </View>

          {attachmentBins.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={48} color={C.ink5} />
              <Text style={styles.emptyText}>No attachment bins yet</Text>
            </View>
          ) : (
            attachmentBins.map((bin) => (
              <TouchableOpacity
                key={bin.id}
                style={styles.binCard}
                onPress={() =>
                  navigation.navigate('AttachmentBinSubmission', { binId: bin.id })
                }
              >
                <View style={styles.binHeader}>
                  <View style={styles.binIconContainer}>
                    <Ionicons name="folder" size={24} color={C.ink2} />
                  </View>
                  <View style={styles.binInfo}>
                    <Text style={styles.binTitle}>{bin.title}</Text>
                    {bin.description && (
                      <Text style={styles.binDescription} numberOfLines={2}>
                        {bin.description}
                      </Text>
                    )}
                    <View style={styles.binMeta}>
                      {bin.deadline && (
                        <View style={styles.binMetaItem}>
                          <Ionicons name="time-outline" size={14} color={C.red} />
                          <Text style={styles.binDeadline}>
                            Due: {new Date(bin.deadline).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.binMetaItem}>
                        <Ionicons name="document-outline" size={14} color={C.ink3} />
                        <Text style={styles.binSubmissions}>
                          {bin.submission_count || 0} submissions
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={C.ink5} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: S.xl,
    paddingTop: S.lg,
    paddingBottom: S.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: R.full,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
    ...shadow.soft,
  },
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: C.ink1,
    flex: 1,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: C.surface,
    margin: S.lg,
    padding: S.xl,
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.sm,
  },
  infoDescription: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    lineHeight: 21,
    marginBottom: S.md,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs + 2,
  },
  teacherText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
  },
  section: {
    backgroundColor: C.surface,
    marginHorizontal: S.lg,
    marginBottom: S.lg,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: S.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: S.xxl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink4,
    marginTop: S.md,
  },
  announcementCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  announcementCardPinned: {
    backgroundColor: C.surfaceRaised,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.action,
    alignSelf: 'flex-start',
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.xs,
    marginBottom: S.sm,
    gap: S.xs,
  },
  pinnedText: {
    color: C.actionText,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.sm,
  },
  announcementContent: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink2,
    lineHeight: 21,
    marginBottom: S.sm,
  },
  announcementDate: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink4,
  },
  binCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  binHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  binIconContainer: {
    width: 48,
    height: 48,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
  },
  binInfo: {
    flex: 1,
  },
  binTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.xs,
  },
  binDescription: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    marginBottom: S.sm,
  },
  binMeta: {
    flexDirection: 'row',
    gap: S.lg,
  },
  binMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
  },
  binDeadline: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.red,
  },
  binSubmissions: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink3,
  },
});
