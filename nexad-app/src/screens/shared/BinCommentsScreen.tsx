import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { notificationService } from '../../services/notificationService';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, R, shadow } from '../../config/theme';

export default function BinCommentsScreen({ navigation, route }: any) {
  const { binId, studentId, binTitle, studentName, role, teacherId } = route.params as {
    binId: string;
    studentId: string;
    binTitle: string;
    studentName: string;
    role: 'teacher' | 'student';
    teacherId?: string;
  };

  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, any>>({});
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadComments();

    // keyboardDidShow gives height from physical screen bottom.
    // We use it directly as paddingBottom (replacing the bottom inset).
    // keyboardDidHide resets to 0 so we fall back to insets.bottom.
    const showSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      (e) => {
        setKeyboardOffset(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setKeyboardOffset(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const loadComments = async () => {
    const result = await classroomService.getBinComments(binId, studentId);
    if (result.data) {
      setComments(result.data);
      // Fetch sender profiles
      const senderIds = [...new Set(result.data.map((c: any) => c.sender_id).filter(Boolean))];
      if (senderIds.length > 0) {
        const { data: stuProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, first_name, last_name, profile_photo_url')
          .in('user_id', senderIds);
        const { data: tchProfiles } = await supabase
          .from('teacher_profiles')
          .select('user_id, first_name, last_name, profile_photo_url')
          .in('user_id', senderIds);
        const profiles: Record<string, any> = {};
        [...(stuProfiles || []), ...(tchProfiles || [])].forEach((p: any) => {
          profiles[p.user_id] = p;
        });
        setSenderProfiles(profiles);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || !user?.user_id) return;

    setSending(true);
    setMessage('');

    const result = await classroomService.addBinComment(
      binId,
      studentId,
      user.user_id,
      role,
      trimmed
    );

    if (result.error) {
      setMessage(trimmed); // restore on error
      Alert.alert('Error', result.error);
    } else if (result.data) {
      setComments((prev) => [...prev, result.data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      // Notify the teacher when a student sends a private comment
      if (role === 'student' && teacherId) {
        notificationService.createNotification(
          teacherId,
          'New Private Comment',
          `${studentName} sent a comment on "${binTitle}"`,
          'classroom_announcement',
          undefined,
          binId
        ).catch(() => {});
      }
    }
    setSending(false);
  };

  const renderComment = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.user_id;
    const isTeacher = item.sender_role === 'teacher';
    const senderProfile = senderProfiles[item.sender_id];
    const senderName = senderProfile
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : (isTeacher ? 'Teacher' : studentName);
    const initials = senderProfile
      ? ((senderProfile.first_name?.[0] || '') + (senderProfile.last_name?.[0] || '')).toUpperCase()
      : (isTeacher ? 'T' : 'S');
    const profilePhotoUrl = senderProfile?.profile_photo_url;

    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
        {!isMe && (
          <View style={styles.bubbleAvatar}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.bubbleAvatarText}>{initials}</Text>
            )}
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && (
            <Text style={styles.senderLabel}>{senderName}</Text>
          )}
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
            {item.message}
          </Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    // edges=["top"] only: SafeAreaView handles status bar (keeps header unchanged),
    // but does NOT absorb bottom inset — so the view extends to physical screen
    // bottom and keyboardOffset (measured from physical bottom) maps 1:1.
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { paddingBottom: keyboardOffset > 0 ? keyboardOffset : insets.bottom }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{binTitle}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {role === 'teacher' ? `Thread with ${studentName}` : 'Private comments with teacher'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.ink3} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={48} color={C.ink5} />
                <Text style={styles.emptyText}>No comments yet. Start the conversation!</Text>
              </View>
            }
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a comment..."
            placeholderTextColor={C.ink4}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={C.actionText} />
            ) : (
              <Ionicons name="send" size={18} color={C.actionText} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: S.lg,
    paddingTop: S.xxl,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: S.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.soft,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600' as const, color: C.ink1 },
  headerSub: { fontSize: 12, fontWeight: '400' as const, color: C.ink3, marginTop: 2 },
  listContent: { padding: S.lg, paddingBottom: S.sm, flexGrow: 1 },
  emptyText: { fontSize: 14, fontWeight: '400' as const, color: C.ink4, textAlign: 'center', marginTop: S.md },

  bubbleRow: { flexDirection: 'row', marginVertical: 3, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },

  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },
  bubbleAvatarText: { fontSize: 10, fontWeight: '700' as const, color: C.ink2 },

  bubble: {
    maxWidth: '78%',
    padding: S.md,
    borderRadius: R.lg,
    marginBottom: S.sm,
    alignSelf: 'flex-start',
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: C.action,
    borderColor: C.action,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
  },
  senderLabel: { fontSize: 11, fontWeight: '600' as const, color: C.ink4, marginBottom: S.xs },
  bubbleText: { fontSize: 14, fontWeight: '400' as const, color: C.ink1, lineHeight: 20 },
  bubbleTextMe: { color: C.actionText },
  bubbleTime: { fontSize: 10, fontWeight: '400' as const, color: C.ink4, marginTop: S.xs, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: S.md,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    gap: S.sm,
  },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: R.full,
    paddingHorizontal: S.lg,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: R.full,
    backgroundColor: C.action,
    justifyContent: 'center', alignItems: 'center',
    ...shadow.soft,
  },
  sendBtnDisabled: { backgroundColor: C.ink5 },
});
