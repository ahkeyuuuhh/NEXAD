import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { notificationService } from '../../services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, R, shadow } from '../../config/theme';

export default function CreateAnnouncementScreen({ navigation, route }: any) {
  const { classroomId, classroomName = 'your classroom' } = route.params as { classroomId: string; classroomName?: string };
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter announcement content');
      return;
    }

    if (!user?.user_id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);
    try {
      const result = await classroomService.createAnnouncement(
        classroomId,
        user.user_id,
        title.trim(),
        content.trim(),
        isPinned
      );

      if (result.data) {
        // Notify all active classroom members about the new announcement (fire-and-forget)
        classroomService.getClassroomMembers(classroomId).then(membersResult => {
          const studentIds: string[] = (membersResult.data || [])
            .map((m: any) => m.id)
            .filter(Boolean);
          if (studentIds.length > 0) {
            const teacherName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Your teacher';
            notificationService
              .notifyNewAnnouncement(studentIds, teacherName, classroomName, title.trim(), result.data.id)
              .catch(() => {});
          }
        }).catch(() => {});

        Alert.alert('Success', 'Announcement posted successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error posting announcement:', error);
      Alert.alert('Error', 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.title}>New Announcement</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Quiz on Friday"
            placeholderTextColor={C.ink4}
            maxLength={200}
          />
          <Text style={styles.hint}>{title.length}/200</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your announcement here..."
            placeholderTextColor={C.ink4}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.hint}>{content.length}/2000</Text>
        </View>

        <View style={styles.switchGroup}>
          <View style={styles.switchInfo}>
            <Ionicons name="pin" size={20} color={isPinned ? C.ink1 : C.ink4} />
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Pin to Top</Text>
              <Text style={styles.switchHint}>Make this announcement stand out</Text>
            </View>
          </View>
          <Switch
            value={isPinned}
            onValueChange={setIsPinned}
            trackColor={{ false: C.borderLight, true: C.ink3 }}
            thumbColor={C.surface}
          />
        </View>

        <TouchableOpacity
          style={[styles.postButton, loading && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.actionText} />
          ) : (
            <>
              <Ionicons name="megaphone" size={20} color={C.actionText} />
              <Text style={styles.postButtonText}>Post Announcement</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: S.xl,
    paddingTop: S.xxl,
    paddingBottom: S.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
    ...shadow.soft,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: C.ink1,
  },
  form: {
    padding: S.xl,
  },
  inputGroup: {
    marginBottom: S.xl2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink2,
    marginBottom: S.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  textArea: {
    minHeight: 200,
    paddingTop: S.lg,
  },
  hint: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink4,
    marginTop: S.xs,
    textAlign: 'right',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.xl2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  switchHint: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink3,
    marginTop: 2,
  },
  postButton: {
    backgroundColor: C.action,
    borderRadius: R.lg,
    paddingVertical: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    marginTop: S.sm,
    ...shadow.lift,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: C.actionText,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cancelButton: {
    paddingVertical: S.lg,
    alignItems: 'center',
    marginTop: S.md,
  },
  cancelButtonText: {
    color: C.ink3,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
