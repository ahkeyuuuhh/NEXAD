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
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import type { ConsultationRequest } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';

export default function RequestManagementScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ConsultationRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const { user } = useAuth();
  const userId = user?.user_id;

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await consultationService.getTeacherRequests(
        userId,
        filter === 'pending' ? 'pending' : undefined,
        1,
        50
      );

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      setPendingRequests(result.data?.data || []);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load consultation requests');
    }
  }, [userId, filter]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadRequests();
      setIsLoading(false);
    };
    init();
  }, [loadRequests]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRequests();
    setIsRefreshing(false);
  };

  const handleRequestPress = (request: ConsultationRequest) => {
    navigation.navigate('RequestApproval', { request });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation Requests</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.requestsList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>
          {filter === 'pending' ? 'Pending Requests' : 'All Requests'}
        </Text>

        {pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {filter === 'pending' 
                ? 'No pending requests at the moment'
                : 'No consultation requests found'}
            </Text>
          </View>
        ) : (
          pendingRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => handleRequestPress(request)}
            >
              <View style={styles.requestHeader}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.avatarText}>
                    {request.student?.first_name?.[0] || 'S'}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.studentName}>
                    {request.student?.first_name || 'Student'} {request.student?.last_name || 'Name'}
                  </Text>
                  <Text style={styles.requestSubject} numberOfLines={2}>
                    {request.subject_line}
                  </Text>
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {request.description}
                  </Text>
                  <View style={styles.requestMeta}>
                    <Text style={styles.requestDate}>
                      {formatDate(request.submitted_at)}
                    </Text>
                    {request.urgency === 'urgent' && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>URGENT</Text>
                      </View>
                    )}
                  </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
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
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: C.action,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  filterTextActive: {
    color: C.actionText,
  },
  requestsList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink2,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: C.ink4,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink3,
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
    fontWeight: '400' as const,
    color: C.ink1,
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 13,
    color: C.ink3,
    marginBottom: 8,
    lineHeight: 18,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 12,
    color: C.ink4,
    marginRight: 8,
  },
  urgentBadge: {
    backgroundColor: C.ink2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: C.actionText,
  },
});
