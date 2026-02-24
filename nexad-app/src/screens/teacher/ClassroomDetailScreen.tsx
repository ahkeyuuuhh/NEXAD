import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';

export default function ClassroomDetailScreen({ navigation, route }: any) {
  const { classroomId } = route.params as { classroomId: string };

  const [classroom, setClassroom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attachmentBins, setAttachmentBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadClassroomData();
  }, []);

  const loadClassroomData = async () => {
    try {
      const [classroomResult, membersResult, announcementsResult, binsResult] = await Promise.all([
        classroomService.getClassroom(classroomId),
        classroomService.getClassroomMembers(classroomId),
        classroomService.getClassroomAnnouncements(classroomId),
        classroomService.getClassroomAttachmentBins(classroomId),
      ]);

      if (classroomResult.data) setClassroom(classroomResult.data);
      if (membersResult.data) setMembers(membersResult.data);
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

  const handleShareInviteCode = async () => {
    if (!classroom) return;
    
    try {
      await Share.share({
        message: `Join my classroom "${classroom.name}" on Nexad!\n\nInvite Code: ${classroom.invite_code}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{classroom.name}</Text>
      </View>

      {/* Invite Code Card */}
      <View style={styles.inviteCard}>
        <View style={styles.inviteHeader}>
          <Ionicons name="key" size={24} color="#007AFF" />
          <Text style={styles.inviteTitle}>Invite Code</Text>
        </View>
        <Text style={styles.inviteCode}>{classroom.invite_code}</Text>
        <Text style={styles.inviteHint}>Share this code with your students</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareInviteCode}>
          <Ionicons name="share-outline" size={20} color="#007AFF" />
          <Text style={styles.shareButtonText}>Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#34C759" />
          <Text style={styles.statNumber}>{members.length}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="megaphone" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{announcements.length}</Text>
          <Text style={styles.statLabel}>Announcements</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="folder" size={24} color="#FF9500" />
          <Text style={styles.statNumber}>{attachmentBins.length}</Text>
          <Text style={styles.statLabel}>Bins</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateAnnouncement', { classroomId, classroomName: classroom?.name || '' })}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="megaphone" size={24} color="#007AFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Post Announcement</Text>
            <Text style={styles.actionSubtitle}>Share updates with students</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateAttachmentBin', { classroomId })}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="folder-open" size={24} color="#FF9500" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Create Attachment Bin</Text>
            <Text style={styles.actionSubtitle}>Collect documents from students</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Members Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Students ({members.length})</Text>
        {members.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No students yet</Text>
            <Text style={styles.emptySubtext}>Share the invite code to add students</Text>
          </View>
        ) : (
          members.slice(0, 5).map((member, index) => (
            <View key={member.id} style={styles.memberItem}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {member.first_name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.memberName}>
                {member.first_name} {member.last_name}
              </Text>
            </View>
          ))
        )}
        {members.length > 5 && (
          <Text style={styles.moreText}>+ {members.length - 5} more students</Text>
        )}
      </View>

      {/* Recent Announcements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Announcements</Text>
        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        ) : (
          announcements.slice(0, 3).map((announcement) => (
            <View key={announcement.id} style={styles.announcementItem}>
              {announcement.is_pinned && (
                <Ionicons name="pin" size={16} color="#FF3B30" style={styles.pinIcon} />
              )}
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementContent} numberOfLines={2}>
                {announcement.content}
              </Text>
              <Text style={styles.announcementDate}>
                {new Date(announcement.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Attachment Bins */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>Attachment Bins</Text>
        {attachmentBins.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No attachment bins yet</Text>
          </View>
        ) : (
          attachmentBins.map((bin) => (
            <View key={bin.id} style={styles.binItem}>
              <View style={styles.binHeader}>
                <Ionicons name="folder" size={20} color="#FF9500" />
                <Text style={styles.binTitle}>{bin.title}</Text>
              </View>
              {bin.description && (
                <Text style={styles.binDescription} numberOfLines={2}>
                  {bin.description}
                </Text>
              )}
              <View style={styles.binFooter}>
                <Text style={styles.binSubmissions}>
                  {bin.submission_count || 0} submissions
                </Text>
                {bin.deadline && (
                  <Text style={styles.binDeadline}>
                    Due: {new Date(bin.deadline).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
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
  inviteCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
    marginVertical: 8,
  },
  inviteHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 14,
    color: '#333',
  },
  moreText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  announcementItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pinIcon: {
    marginBottom: 4,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  announcementContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 12,
    color: '#999',
  },
  binItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  binHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  binTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  binDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  binFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  binSubmissions: {
    fontSize: 12,
    color: '#666',
  },
  binDeadline: {
    fontSize: 12,
    color: '#FF3B30',
  },
});
