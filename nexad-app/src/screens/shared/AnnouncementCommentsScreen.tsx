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
import { Alert } from '../../utils/Alert';
import { MotionScreen } from '../../components/MotionWrapper';

export default function AnnouncementCommentsScreen({ navigation, route }: any) {
  const { announcementId, announcementTitle, classroomId, role } = route.params as {
    announcementId: string;
    announcementTitle: string;
    classroomId: string;
    role: 'teacher' | 'student';
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
    const result = await classroomService.getAnnouncementComments(announcementId);
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

    const result = await classroomService.addAnnouncementComment(
      announcementId,
      user.user_id,
      role,
      trimmed
    );

    if (result.error) {
      setMessage(trimmed); // restore on error
      Alert.alert('Error', result.error);
    } else if (result.data) {
      setComments((prev) => [...prev, result.data]);
      
      // Load profile for the new comment sender if not already loaded
      if (!senderProfiles[user.user_id]) {
        const { data: stuProfile } = await supabase
          .from('student_profiles')
          .select('user_id, first_name, last_name, profile_photo_url')
          .eq('user_id', user.user_id)
          .single();
        const { data: tchProfile } = await supabase
          .from('teacher_profiles')
          .select('user_id, first_name, last_name, profile_photo_url')
          .eq('user_id', user.user_id)
          .single();
        
        const profile = stuProfile || tchProfile;
        if (profile) {
          setSenderProfiles(prev => ({
            ...prev,
            [user.user_id]: profile
          }));
        }
      }
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await classroomService.deleteComment(commentId, 'announcement_comments');
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              setComments(prev => prev.filter(c => c.id !== commentId));
            }
          }
        }
      ]
    );
  };

  const renderComment = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.user_id;
    const isTeacher = item.sender_role === 'teacher';
    const senderProfile = senderProfiles[item.sender_id];
    const senderName = senderProfile
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : (isTeacher ? 'Teacher' : 'Student');
    const initials = senderProfile
      ? ((senderProfile.first_name?.[0] || '') + (senderProfile.last_name?.[0] || '')).toUpperCase()
      : (isTeacher ? 'T' : 'S');
    const profilePhotoUrl = senderProfile?.profile_photo_url;

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentAvatar}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.commentAvatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentName}>{senderName}</Text>
            {isTeacher && (
              <View style={styles.teacherBadge}>
                <Text style={styles.teacherBadgeText}>Teacher</Text>
              </View>
            )}
            {isMe && !isTeacher && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
            <Text style={styles.commentTime}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <TouchableOpacity
                onPress={() => handleDeleteComment(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color={C.ink4} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentText}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <MotionScreen>
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
          <Text style={styles.headerTitle} numberOfLines={1}>{announcementTitle}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Comments</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.center}>
            <Image 
              source={require('../../../assets/NEXAD GIF.gif')} 
              style={styles.loadingGif}
              resizeMode="contain"
            />
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
    </MotionScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xxl },
  loadingGif: { width: 200, height: 200 },
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
  listContent: { paddingVertical: S.sm, flexGrow: 1 },
  emptyText: { fontSize: 14, fontWeight: '400' as const, color: C.ink4, textAlign: 'center', marginTop: S.md },

  // Comment styles
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: S.sm,
    paddingHorizontal: S.lg,
    gap: S.sm,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarText: { fontSize: 12, fontWeight: '700' as const, color: C.ink2 },
  commentContent: { flex: 1 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
    flexWrap: 'wrap' as const,
  },
  commentName: { fontSize: 13, fontWeight: '600' as const, color: C.ink1 },
  teacherBadge: {
    backgroundColor: C.ink1,
    borderRadius: R.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  teacherBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  youBadge: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: C.border,
  },
  youBadgeText: { fontSize: 9, fontWeight: '600' as const, color: C.ink3 },
  commentTime: { fontSize: 11, color: C.ink4, marginLeft: 'auto' as any },
  deleteBtn: { marginLeft: 8 },
  commentText: { fontSize: 14, color: C.ink1, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: S.md,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    gap: S.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
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