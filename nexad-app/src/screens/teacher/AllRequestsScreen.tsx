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
          <ActivityIndicator size="large" color="#2563eb" />
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
          <Text style={styles.backButtonText}>← Back</Text>
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
            <Text style={styles.emptyIcon}>📋</Text>
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
                <Text style={styles.viewDetailsText}>View Details →</Text>
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
    backgroundColor: '#f5f5f5',
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
    color: '#2563eb',
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
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
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
  },
  requestInfo: {
    flex: 1,
  },
  studentName: {
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
  requestDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
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
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
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
    color: '#9ca3af',
    fontWeight: '500',
  },
});
