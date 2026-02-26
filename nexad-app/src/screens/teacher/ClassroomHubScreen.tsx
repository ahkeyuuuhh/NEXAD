import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, R, shadow } from '../../config/theme';

export default function ClassroomHubScreen({ navigation }: any) {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    if (!user?.user_id) return;

    try {
      const result = await classroomService.getTeacherClassrooms(user.user_id);
      if (result.data) {
        const classroomsWithCount = await Promise.all(
          result.data.map(async (classroom) => {
            const countResult = await classroomService.getMemberCount(classroom.id);
            return {
              ...classroom,
              memberCount: countResult.data || 0,
            };
          })
        );
        setClassrooms(classroomsWithCount);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error loading classrooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClassrooms();
  };

  const handleDeleteClassroom = (classroomId: string, classroomName: string) => {
    Alert.alert(
      'Delete Classroom',
      `Are you sure you want to delete "${classroomName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await classroomService.deleteClassroom(classroomId);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              loadClassrooms();
            }
          },
        },
      ]
    );
  };

  const renderClassroom = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.classroomCard}
      onPress={() => navigation.navigate('ClassroomDetail', { classroomId: item.id })}
    >
      <View style={styles.classroomHeader}>
        <View style={styles.classroomIcon}>
          <Ionicons name="school" size={24} color={C.ink1} />
        </View>
        <View style={styles.classroomInfo}>
          <Text style={styles.classroomName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.classroomDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.classroomMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={14} color={C.ink3} />
              <Text style={styles.metaText}>{item.memberCount} students</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="key" size={14} color={C.ink3} />
              <Text style={styles.metaText}>{item.invite_code}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteClassroom(item.id, item.name)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={C.ink4} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.ink3} />
        <Text style={styles.loadingText}>Loading classrooms...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>Classroom Hub</Text>
        <Text style={styles.subtitle}>Manage your virtual classrooms</Text>
      </View>

      <FlatList
        data={classrooms}
        renderItem={renderClassroom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={56} color={C.ink5} />
            <Text style={styles.emptyText}>No classrooms yet</Text>
            <Text style={styles.emptySubtext}>Create your first classroom to get started</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateClassroom')}
      >
        <Ionicons name="add" size={24} color={C.actionText} />
        <Text style={styles.createButtonText}>Create Classroom</Text>
      </TouchableOpacity>
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
  loadingText: {
    marginTop: S.md,
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink3,
  },
  header: {
    backgroundColor: C.surface,
    paddingHorizontal: S.xl,
    paddingTop: S.xxl,
    paddingBottom: S.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: C.ink1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    marginTop: S.xs,
  },
  listContainer: {
    padding: S.lg,
    paddingBottom: 100,
  },
  classroomCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  classroomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  classroomIcon: {
    width: 48,
    height: 48,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
  },
  classroomInfo: {
    flex: 1,
  },
  classroomName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.xs,
  },
  classroomDescription: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    marginBottom: S.sm,
  },
  classroomMeta: {
    flexDirection: 'row',
    gap: S.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink3,
  },
  deleteButton: {
    padding: S.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink4,
    marginTop: S.lg,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink5,
    marginTop: S.sm,
  },
  createButton: {
    position: 'absolute',
    bottom: S.xl2,
    left: S.xl2,
    right: S.xl2,
    backgroundColor: C.action,
    borderRadius: R.lg,
    paddingVertical: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lift,
  },
  createButtonText: {
    color: C.actionText,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: S.sm,
  },
});
