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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';

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
          <Ionicons name="school" size={24} color="#007AFF" />
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
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.metaText}>{item.memberCount} students</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="key" size={14} color="#666" />
              <Text style={styles.metaText}>{item.invite_code}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteClassroom(item.id, item.name)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading classrooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Ionicons name="school-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No classrooms yet</Text>
            <Text style={styles.emptySubtext}>Create your first classroom to get started</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateClassroom')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create Classroom</Text>
      </TouchableOpacity>
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  classroomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classroomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  classroomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classroomInfo: {
    flex: 1,
  },
  classroomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  classroomDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  classroomMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  createButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
