import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';

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
        <ActivityIndicator size="large" color="#34C759" />
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#34C759" />
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
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.teacherText}>
            Teacher: {classroom.teacher_first_name} {classroom.teacher_last_name}
          </Text>
        </View>
      </View>

      {/* Announcements Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="megaphone" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Announcements</Text>
        </View>

        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        ) : (
          announcements.map((announcement) => (
            <View key={announcement.id} style={styles.announcementCard}>
              {announcement.is_pinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={12} color="#fff" />
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
      <View style={[styles.section, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="folder" size={20} color="#FF9500" />
          <Text style={styles.sectionTitle}>Attachment Bins</Text>
        </View>

        {attachmentBins.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={48} color="#ccc" />
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
                  <Ionicons name="folder" size={24} color="#FF9500" />
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
                        <Ionicons name="time-outline" size={14} color="#FF3B30" />
                        <Text style={styles.binDeadline}>
                          Due: {new Date(bin.deadline).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.binMetaItem}>
                      <Ionicons name="document-outline" size={14} color="#666" />
                      <Text style={styles.binSubmissions}>
                        {bin.submission_count || 0} submissions
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teacherText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  announcementCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
    gap: 4,
  },
  pinnedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  announcementDate: {
    fontSize: 12,
    color: '#999',
  },
  binCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  binHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  binIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  binInfo: {
    flex: 1,
  },
  binTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  binDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  binMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  binMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  binDeadline: {
    fontSize: 12,
    color: '#FF3B30',
  },
  binSubmissions: {
    fontSize: 12,
    color: '#666',
  },
});
