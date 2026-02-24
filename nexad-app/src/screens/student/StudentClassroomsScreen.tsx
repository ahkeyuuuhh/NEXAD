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
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';

export default function StudentClassroomsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    if (!user?.user_id) return;

    try {
      const result = await classroomService.getStudentClassrooms(user.user_id);
      if (result.data) {
        setClassrooms(result.data);
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

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit invite code');
      return;
    }

    if (!user?.user_id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setJoining(true);
    try {
      const result = await classroomService.joinClassroom(
        user.user_id,
        inviteCode.trim().toUpperCase()
      );

      if (result.data) {
        Alert.alert('Success', 'You joined the classroom!');
        setShowJoinModal(false);
        setInviteCode('');
        loadClassrooms();
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error joining classroom:', error);
      Alert.alert('Error', 'Failed to join classroom');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveClassroom = (classroomId: string, classroomName: string) => {
    Alert.alert(
      'Leave Classroom',
      `Are you sure you want to leave "${classroomName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!user?.user_id) return;
            const result = await classroomService.leaveClassroom(classroomId, user.user_id);
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
      onPress={() =>
        navigation.navigate('StudentClassroomDetail', { classroomId: item.id })
      }
    >
      <View style={styles.classroomHeader}>
        <View style={styles.classroomIcon}>
          <Ionicons name="school" size={24} color="#34C759" />
        </View>
        <View style={styles.classroomInfo}>
          <Text style={styles.classroomName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.classroomDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.teacherName}>
            Teacher: {item.teacher_first_name} {item.teacher_last_name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleLeaveClassroom(item.id, item.name)}
          style={styles.leaveButton}
        >
          <Ionicons name="exit-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.loadingText}>Loading classrooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Classrooms</Text>
        <Text style={styles.subtitle}>Join and manage your classes</Text>
      </View>

      <FlatList
        data={classrooms}
        renderItem={renderClassroom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No classrooms yet</Text>
            <Text style={styles.emptySubtext}>Join a classroom using an invite code</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
        <Ionicons name="enter" size={24} color="#fff" />
        <Text style={styles.joinButtonText}>Join Classroom</Text>
      </TouchableOpacity>

      {/* Join Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Classroom</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Enter Invite Code</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#999"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.submitButton, joining && styles.submitButtonDisabled]}
              onPress={handleJoinClassroom}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#E8F5E9',
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
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 12,
    color: '#999',
  },
  leaveButton: {
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
  joinButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#333',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
