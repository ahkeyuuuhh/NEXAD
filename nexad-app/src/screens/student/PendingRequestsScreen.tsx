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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
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
          <ActivityIndicator size="large" color="#6B4EFF" />
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
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Requests</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>⏳</Text>
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
            <Text style={styles.emptyIcon}>✅</Text>
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
                  <Text style={styles.statusText}>⏳ Pending Review</Text>
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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#6B4EFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 60,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  infoBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#78350f',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  teacherAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teacherAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4f46e5',
  },
  requestInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  requestSubject: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  urgentBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  descriptionContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
