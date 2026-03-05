import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import { C, F, S, R, shadow } from '../../config/theme';
import type { ConsultationRequest } from '../../types';

interface ConsultationWithTeacher extends ConsultationRequest {
  teacherName: string;
}

export default function PendingRequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<ConsultationWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadPendingRequests = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await consultationService.getStudentRequests(userId, 1, 100);
      const allRequests = result.data?.data || [];
      
      // Filter for pending requests only
      const pending = allRequests.filter(
        (r: ConsultationRequest) => r.status === 'pending' || r.status === 'awaiting_teacher'
      );

      // Load teacher names
      const requestsWithTeachers = await Promise.all(
        pending.map(async (request) => {
          try {
            const profileResponse = await profileService.getTeacherProfile(request.teacher_id);
            const profile = profileResponse.data;
            return {
              ...request,
              teacherName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Teacher',
            };
          } catch (error) {
            return {
              ...request,
              teacherName: 'Unknown Teacher',
            };
          }
        })
      );

      // Sort by date (newest first)
      requestsWithTeachers.sort((a, b) => {
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });

      setRequests(requestsWithTeachers);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      Alert.alert('Error', 'Failed to load pending requests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadPendingRequests();
    }, [loadPendingRequests])
  );

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadPendingRequests();
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.action} />
          <Text style={styles.loadingText}>Loading pending requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={20} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Requests</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="time-outline" size={28} color={C.ink3} style={styles.infoBannerIcon} />
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Awaiting Teacher Response</Text>
          <Text style={styles.infoBannerText}>
            You have {requests.length} pending consultation request{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={C.ink4} />
            <Text style={styles.emptyText}>All clear!</Text>
            <Text style={styles.emptySubtext}>
              You don't have any pending consultation requests
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.teacherAvatar}>
                  <Text style={styles.teacherAvatarText}>
                    {request.teacherName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.teacherName}>{request.teacherName}</Text>
                  <Text style={styles.requestSubject} numberOfLines={2}>
                    {request.subject_line}
                  </Text>
                  <Text style={styles.requestTime}>Submitted {formatTimeAgo(request.submitted_at)}</Text>
                </View>
                {request.urgency === 'urgent' && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>!</Text>
                  </View>
                )}
              </View>

              {request.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Details:</Text>
                  <Text style={styles.descriptionText} numberOfLines={3}>
                    {request.description}
                  </Text>
                </View>
              )}

              <View style={styles.requestFooter}>
                <View style={styles.statusBadge}>
                  <Ionicons name="time-outline" size={12} color={C.ink3} style={{ marginRight: S.xs }} />
                  <Text style={styles.statusText}>Pending Review</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: S.md,
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink3,
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
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 36,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    padding: S.lg,
    marginHorizontal: S.lg,
    marginTop: S.lg,
    borderRadius: R.md,
  },
  infoBannerIcon: {
    marginRight: S.md,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink2,
    marginBottom: S.xs,
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
  },
  content: {
    flex: 1,
    padding: S.lg,
  },
  requestCard: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.lg,
    marginBottom: S.md,
    ...shadow.card,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: S.md,
  },
  teacherAvatar: {
    width: 48,
    height: 48,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
  },
  teacherAvatarText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink2,
  },
  requestInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.xs,
  },
  requestSubject: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink2,
    marginBottom: S.xs,
  },
  requestTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink4,
  },
  urgentBadge: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    backgroundColor: C.ink2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentText: {
    color: C.actionText,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  descriptionContainer: {
    backgroundColor: C.surfaceRaised,
    padding: S.md,
    borderRadius: R.sm,
    marginBottom: S.md,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.ink3,
    marginBottom: S.xs,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink2,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: R.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink2,
    marginTop: S.lg,
    marginBottom: S.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink4,
    textAlign: 'center',
  },
});
