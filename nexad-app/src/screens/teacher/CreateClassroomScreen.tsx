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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, R, shadow } from '../../config/theme';

export default function CreateClassroomScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a classroom name');
      return;
    }

    if (!user?.user_id) {
      Alert.alert('Error', 'You must be logged in to create a classroom');
      return;
    }

    setLoading(true);
    try {
      const result = await classroomService.createClassroom(
        user.user_id,
        name.trim(),
        description.trim() || undefined
      );

      if (result.data) {
        Alert.alert(
          'Success',
          `Classroom "${name}" created!\n\nInvite Code: ${result.data.invite_code}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error creating classroom:', error);
      Alert.alert('Error', 'Failed to create classroom');
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
        <Text style={styles.title}>Create Classroom</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={C.ink3} />
          <Text style={styles.infoText}>
            A unique 6-digit invite code will be generated for students to join your classroom
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Classroom Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., CS101 - Introduction to Programming"
            placeholderTextColor={C.ink4}
            maxLength={100}
          />
          <Text style={styles.hint}>{name.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add details about this classroom..."
            placeholderTextColor={C.ink4}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.hint}>{description.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.actionText} />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={C.actionText} />
              <Text style={styles.createButtonText}>Create Classroom</Text>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: C.surfaceAlt,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.xl2,
    gap: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    lineHeight: 20,
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
    minHeight: 120,
    paddingTop: S.lg,
  },
  hint: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink4,
    marginTop: S.xs,
    textAlign: 'right',
  },
  createButton: {
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
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
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
