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
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';

interface ConsultationWithStudent extends ConsultationRequest {
  studentName: string;
}

export default function AllRequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<ConsultationWithStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'urgent'>('all');

  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadRequests = useCallback(async () => {
    if (!userId) return;

    try {
      // Get all pending and awaiting requests
      const [pendingResult, urgentResult] = await Promise.all([
        consultationService.getTeacherRequests(userId, 'pending', 1, 100),
        consultationService.getTeacherRequests(userId, 'awaiting_teacher', 1, 100),
      ]);

      const pendingRequests = pendingResult.data?.data || [];
      const urgentRequests = urgentResult.data?.data || [];
      const allRequests = [...pendingRequests, ...urgentRequests];

      // Load student names
      const requestsWithNames = await Promise.all(
        allRequests.map(async (request) => {
          try {
            const profileResponse = await profileService.getStudentProfile(request.student_id);
            const profile = profileResponse.data;
            return {
              ...request,
              studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
            };
          } catch (error) {
            return {
              ...request,
              studentName: 'Unknown Student',
            };
          }
        })
      );

      // Sort by date (newest first)
      requestsWithNames.sort((a, b) => {
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });

      setRequests(requestsWithNames);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadRequests();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        return formatDate(dateString);
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const getFilteredRequests = () => {
    if (filterStatus === 'all') {
      return requests;
    } else if (filterStatus === 'pending') {
      return requests.filter(r => r.status === 'pending' || r.status === 'awaiting_teacher');
    } else if (filterStatus === 'urgent') {
      return requests.filter(r => r.urgency === 'urgent');
    }
    return requests;
  };

  const filteredRequests = getFilteredRequests();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.ink2} />
          <Text style={styles.loadingText}>Loading requests...</Text>
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
          <Ionicons name="chevron-back" size={20} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Requests</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
            All ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'pending' && styles.filterTabActive]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'pending' && styles.filterTabTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'urgent' && styles.filterTabActive]}
          onPress={() => setFilterStatus('urgent')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'urgent' && styles.filterTabTextActive]}>
            Urgent
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color={C.ink4} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No requests found</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => navigation.navigate('RequestApproval', { request })}
            >
              <View style={styles.requestHeader}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>
                    {request.studentName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.studentName}>{request.studentName}</Text>
                  <Text style={styles.requestSubject} numberOfLines={2}>
                    {request.subject_line}
                  </Text>
                  <Text style={styles.requestTime}>{formatTimeAgo(request.submitted_at)}</Text>
                </View>
                {request.urgency === 'urgent' && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>!</Text>
                  </View>
                )}
              </View>

              {request.description && (
                <Text style={styles.requestDescription} numberOfLines={2}>
                  {request.description}
                </Text>
              )}

              <View style={styles.requestFooter}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {request.status === 'pending' ? 'Pending Review' : 'Awaiting Response'}
                  </Text>
                </View>
                <View style={styles.viewDetailsRow}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.ink2} />
                </View>
              </View>
            </TouchableOpacity>
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
    marginTop: 12,
    fontSize: 16,
    color: C.ink3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.xl,
    paddingVertical: S.lg,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: S.xl,
    paddingTop: S.md,
    paddingBottom: S.sm,
    gap: S.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: S.sm + 2,
    borderRadius: R.full,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  filterTabActive: {
    backgroundColor: C.action,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  filterTabTextActive: {
    color: C.actionText,
  },
  content: {
    flex: 1,
    padding: S.xl,
  },
  requestCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.lg,
    marginBottom: S.md,
    ...shadow.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.accent,
  },
  requestInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 4,
  },
  requestSubject: {
    fontSize: 14,
    color: C.ink1,
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: C.ink4,
  },
  urgentBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.warmLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentText: {
    color: C.warm,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  requestDescription: {
    fontSize: 14,
    color: C.ink3,
    marginBottom: 12,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: R.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.accent,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: C.ink4,
    fontWeight: '400' as const,
  },
});
