import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { conversationService } from '../../services/conversationService';
import { aiService } from '../../services/aiService';
import { supabase } from '../../config/supabase';
import { C, S, R } from '../../config/theme';
import type { ConversationMessage, ConversationType } from '../../types';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatTime(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Insert date separator labels between messages from different days
function withDateSeparators(
  msgs: ConversationMessage[]
): Array<ConversationMessage | { _dateSep: string; id: string }> {
  const out: Array<ConversationMessage | { _dateSep: string; id: string }> = [];
  let lastDate = '';
  for (const m of msgs) {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDate) {
      lastDate = day;
      out.push({ _dateSep: formatDateLabel(m.created_at), id: `sep_${m.created_at}` });
    }
    out.push(m);
  }
  return out;
}

function getFileTypeLabel(fileName?: string, mimeType?: string): string {
  if (mimeType?.includes('pdf')) return 'PDF Document';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'Word Document';
  if (mimeType?.includes('image')) return 'Image File';
  if (fileName?.toLowerCase().endsWith('.pdf')) return 'PDF Document';
  if (fileName?.toLowerCase().endsWith('.docx') || fileName?.toLowerCase().endsWith('.doc')) return 'Word Document';
  if (fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'Image File';
  return 'File Attachment';
}

function formatFileSize(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getFileNameFromUrl(url?: string): string {
  if (!url) return '';
  const withoutQuery = url.split('?')[0];
  const decoded = decodeURIComponent(withoutQuery);
  return decoded.split('/').pop() || '';
}

function getMessageFileName(msg: ConversationMessage): string {
  if (msg.file_name?.trim()) return msg.file_name.trim();

  const contentName = msg.content.replace(/^📎\s*/, '').replace(/^🖼️\s*/, '').trim();
  if (contentName && contentName !== msg.content) return contentName;

  const fromUrl = getFileNameFromUrl(msg.file_url);
  if (fromUrl) return fromUrl;

  return 'Attachment';
}

function isImageAttachment(msg: ConversationMessage): boolean {
  if (msg.file_type?.includes('image')) return true;
  const probe = `${msg.file_name || ''} ${msg.file_url || ''}`.toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/.test(probe);
}

export default function ChatScreen({ navigation, route }: any) {
  const {
    conversationId,
    title,
    type = 'INQUIRY' as ConversationType,
    consultationRequestId,
  } = route.params as {
    conversationId: string;
    title: string;
    type: ConversationType;
    consultationRequestId?: string;
  };

  const { user } = useAuth();
  const userId = user?.user_id || '';
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatTitle, setChatTitle] = useState(title || 'Chat');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Smart Brief modal
  const [showBrief, setShowBrief] = useState(false);
  const [brief, setBrief] = useState<any>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  // Files in conversation modal
  const [showFiles, setShowFiles] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const realtimeRef = useRef<any>(null);

  // ── Load initial messages ──────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    const result = await conversationService.getMessages(conversationId);
    if (result.data) setMessages(result.data);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
    // Mark as read
    conversationService.markAsRead(conversationId, userId).catch(() => {});
  }, [conversationId, userId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Load OTHER participant name for header title ──────────────────────────
  useEffect(() => {
    async function loadParticipantNames() {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);
      if (!parts || parts.length === 0) return;

      // Only look up the OTHER user(s), not the current user
      const otherIds = parts.map((p: any) => p.user_id).filter((id: string) => id !== userId);
      if (otherIds.length === 0) return;

      // Query student_profiles and teacher_profiles (no unified profiles table)
      const [stuRes, tchRes] = await Promise.all([
        supabase.from('student_profiles').select('user_id, first_name, last_name').in('user_id', otherIds),
        supabase.from('teacher_profiles').select('user_id, first_name, last_name').in('user_id', otherIds),
      ]);

      const all = [...(stuRes.data || []), ...(tchRes.data || [])];
      if (all.length === 0) return;

      // Show only the first other participant's name
      const other = all[0] as any;
      const name = `${other.first_name || ''} ${other.last_name || ''}`.trim();
      if (name) setChatTitle(name);
    }
    loadParticipantNames();
  }, [conversationId, userId]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    realtimeRef.current = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as ConversationMessage;
          // Fetch sender profile for the new message
          if (newMsg.sender_id) {
            const [stuRes, tchRes] = await Promise.all([
              supabase.from('student_profiles').select('first_name, last_name, profile_photo_url').eq('user_id', newMsg.sender_id).maybeSingle(),
              supabase.from('teacher_profiles').select('first_name, last_name, profile_photo_url').eq('user_id', newMsg.sender_id).maybeSingle(),
            ]);
            const sp = stuRes.data || tchRes.data;
            if (sp) (newMsg as any).sender = sp;
          }
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
          // Mark as read if it came from someone else
          if (newMsg.sender_id !== userId) {
            conversationService.markAsRead(conversationId, userId).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      realtimeRef.current?.unsubscribe();
    };
  }, [conversationId, userId]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !userId) return;
    setSending(true);
    setText('');
    const result = await conversationService.sendMessage(conversationId, userId, trimmed);
    if (result.error) Alert.alert('Error', result.error);
    setSending(false);
  };

  // ── Select document (show preview, don't auto-send) ───────────────────────
  const handleSelectDocument = async () => {
    setShowAttachMenu(false);
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });

    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];

    if (asset.size && asset.size > MAX_FILE_BYTES) {
      Alert.alert('File Too Large', 'Please choose a file under 10 MB.');
      return;
    }

    setSelectedFile({ ...asset, fileType: 'document' });
    setShowFilePreview(true);
  };

  // ── Select image (show preview, don't auto-send) ──────────────────────────
  const handleSelectImage = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photos to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    // Get proper file size from asset or estimate from dimensions
    const fileSize = (asset as any).fileSize || (asset.width && asset.height ? Math.floor((asset.width * asset.height * 4) / 3) : 500000);
    if (fileSize > MAX_FILE_BYTES) {
      Alert.alert('Image Too Large', 'Please choose an image under 10 MB.');
      return;
    }

    const uriName = asset.uri.split('/').pop() || '';
    const inferredExt = (uriName.split('.').pop() || 'jpg').toLowerCase();
    const fileName = (asset as any).fileName || `image_${Date.now()}.${inferredExt}`;
    const mimeType = (asset as any).mimeType || `image/${inferredExt === 'jpg' ? 'jpeg' : inferredExt}`;

    setSelectedFile({
      uri: asset.uri,
      name: fileName,
      mimeType,
      size: fileSize,
      fileType: 'image',
      width: asset.width,
      height: asset.height
    });
    setShowFilePreview(true);
  };

  // ── Upload and send the selected file ──────────────────────────────────────
  const handleSendFile = async () => {
    if (!selectedFile) return;
    setShowFilePreview(false);
    setUploading(true);
    try {
      let uploadBody: ArrayBuffer | Blob;
      let uploadSize = selectedFile.size || 0;

      try {
        const fetchResp = await fetch(selectedFile.uri);
        if (!fetchResp.ok) throw new Error('Cannot read file from device');
        const arrayBuffer = await fetchResp.arrayBuffer();
        uploadBody = arrayBuffer;
        if (!uploadSize) uploadSize = arrayBuffer.byteLength;
      } catch {
        const blob = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new Error('Cannot read file from device'));
          xhr.responseType = 'blob';
          xhr.open('GET', selectedFile.uri, true);
          xhr.send(null);
        });
        uploadBody = blob;
        if (!uploadSize) uploadSize = blob.size;
      }

      const ext = selectedFile.name.split('.').pop();
      const path = `${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conversation-files')
        .upload(path, uploadBody, {
          contentType: selectedFile.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('conversation-files')
        .getPublicUrl(uploadData.path);

      const messageContent = selectedFile.fileType === 'image' ? `🖼️ ${selectedFile.name}` : `📎 ${selectedFile.name}`;
      
      await conversationService.sendMessage(
        conversationId,
        userId,
        messageContent,
        { url: publicUrl, name: selectedFile.name, type: selectedFile.mimeType || 'file', size: uploadSize }
      );
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload file.');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  // ── Smart Brief ────────────────────────────────────────────────────────────
  const openSmartBrief = async () => {
    if (!consultationRequestId) return;
    setShowBrief(true);
    if (brief) return; // already loaded
    setLoadingBrief(true);
    const result = await aiService.getSmartBrief(consultationRequestId);
    setBrief(result.data || null);
    setLoadingBrief(false);
  };

  // ── Files in conversation ──────────────────────────────────────────────────
  const fileMessages = messages.filter((m) => m.file_url);

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('conversation_messages')
                .delete()
                .eq('id', messageId);
              if (error) throw error;
              setMessages(prev => prev.filter(m => m.id !== messageId));
            } catch (err: any) {
              Alert.alert('Error', 'Could not delete message.');
            }
          },
        },
      ],
    );
  };

  // ── Delete entire conversation ─────────────────────────────────────────────
  const handleDeleteConversation = () => {
    setShowHeaderMenu(false);
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this entire conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);
              if (error) throw error;
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', 'Could not delete conversation.');
            }
          },
        },
      ],
    );
  };

  // ── Render each message bubble ─────────────────────────────────────────────
  const renderItem = ({ item }: { item: any }) => {
    if (item._dateSep) {
      return (
        <View style={styles.dateSepRow}>
          <Text style={styles.dateSepText}>{item._dateSep}</Text>
        </View>
      );
    }

    const msg = item as ConversationMessage;
    const isMe = msg.sender_id === userId;
    const sender = msg.sender as any;
    const initials = sender
      ? ((sender.first_name?.[0] || '') + (sender.last_name?.[0] || '')).toUpperCase()
      : '?';
    const profilePhotoUrl = sender?.profile_photo_url;

    return (
      <TouchableOpacity
        style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}
        onLongPress={() => handleDeleteMessage(msg.id)}
        activeOpacity={0.8}
      >
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
          {msg.file_url ? (
            isImageAttachment(msg) ? (
              <View>
                <TouchableOpacity onPress={() => Linking.openURL(msg.file_url!)}>
                  <Image 
                    source={{ uri: msg.file_url }} 
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                {getMessageFileName(msg) && (
                  <View style={styles.imageMetaWrap}>
                    <Text
                      style={[styles.imageFileName, isMe ? styles.imageFileNameMe : styles.imageFileNameThem]}
                      numberOfLines={1}
                    >
                      {getMessageFileName(msg)}
                    </Text>
                    {msg.file_size_bytes && (
                      <Text
                        style={[styles.imageSizeText, isMe ? styles.imageSizeTextMe : styles.imageSizeTextThem]}
                      >
                        {formatFileSize(msg.file_size_bytes)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => Linking.openURL(msg.file_url!)}
                style={styles.fileRow}
              >
                <Ionicons
                  name={msg.file_type?.includes('pdf') ? 'document-outline' : 'document-text-outline'}
                  size={18}
                  color={isMe ? 'rgba(255,255,255,0.8)' : C.ink2}
                  style={{ marginRight: 8 }}
                />
                <View style={styles.fileMetaWrap}>
                  <Text
                    style={[styles.fileName, isMe ? styles.fileNameMe : styles.fileNameThem]}
                    numberOfLines={1}
                  >
                    {getMessageFileName(msg)}
                  </Text>
                  <Text
                    style={[styles.fileTypeText, isMe ? styles.fileTypeTextMe : styles.fileTypeTextThem]}
                    numberOfLines={1}
                  >
                    {getFileTypeLabel(getMessageFileName(msg), msg.file_type)}
                    {msg.file_size_bytes && msg.file_size_bytes > 0 ? ` • ${formatFileSize(msg.file_size_bytes)}` : ''}
                  </Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={14}
                  color={isMe ? 'rgba(255,255,255,0.6)' : C.ink4}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            )
          ) : (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
              {msg.content}
            </Text>
          )}
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
            {formatTime(msg.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatTitle}</Text>
          <Text style={styles.headerSub}>{type.replace('_', ' ')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowHeaderMenu(true)}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={C.ink3} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showHeaderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.headerMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View style={[styles.headerMenuSheet, { marginTop: insets.top + 54 }]}>
            <TouchableOpacity style={styles.headerMenuItem} onPress={handleDeleteConversation}>
              <Ionicons name="trash-outline" size={18} color={C.red} style={styles.headerMenuIcon} />
              <Text style={[styles.headerMenuText, { color: C.red }]}>Delete Conversation</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Contextual shortcuts for CONSULTATION chats */}
      {type === 'CONSULTATION' && consultationRequestId && (
        <View style={styles.shortcuts}>
          <TouchableOpacity style={styles.shortcutBtn} onPress={openSmartBrief}>
            <Ionicons name="bulb-outline" size={14} color={C.ink2} style={{ marginRight: 4 }} />
            <Text style={styles.shortcutText}>Smart Brief</Text>
          </TouchableOpacity>
          <View style={styles.shortcutDivider} />
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => setShowFiles(true)}
            disabled={fileMessages.length === 0}
          >
            <Ionicons name="attach-outline" size={14} color={fileMessages.length > 0 ? C.ink2 : C.ink5} style={{ marginRight: 4 }} />
            <Text style={[styles.shortcutText, fileMessages.length === 0 && { color: C.ink5 }]}>
              Files {fileMessages.length > 0 ? `(${fileMessages.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        key={Platform.OS === 'android' ? (isKeyboardVisible ? 'kb-open' : 'kb-closed') : 'kb-ios'}
        style={styles.chatArea}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 12) : 0}
      >
        {/* Message list */}
        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={C.ink3} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={withDateSeparators(messages)}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={40} color={C.ink5} />
                <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setShowAttachMenu(true)}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size="small" color={C.ink3} />
              : <Ionicons name="add-circle-outline" size={22} color={C.ink3} />
            }
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={C.ink4}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={16} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Smart Brief Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showBrief}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrief(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons name="bulb-outline" size={20} color={C.ink2} style={{ marginRight: S.sm }} />
              <Text style={styles.modalTitle}>Smart Brief</Text>
              <TouchableOpacity onPress={() => setShowBrief(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.ink3} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loadingBrief ? (
                <ActivityIndicator size="large" color={C.ink3} style={{ marginTop: 40 }} />
              ) : brief ? (
                <>
                  {brief.summary && (
                    <View style={styles.briefSection}>
                      <Text style={styles.briefSectionTitle}>Summary</Text>
                      <Text style={styles.briefBody}>{brief.summary}</Text>
                    </View>
                  )}
                  {brief.key_points?.length > 0 && (
                    <View style={styles.briefSection}>
                      <Text style={styles.briefSectionTitle}>Key Points</Text>
                      {brief.key_points.map((p: string, i: number) => (
                        <View key={i} style={styles.bulletRow}>
                          <Text style={styles.bullet}>·</Text>
                          <Text style={styles.briefBody}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {brief.student_concerns?.length > 0 && (
                    <View style={styles.briefSection}>
                      <Text style={styles.briefSectionTitle}>Student Concerns</Text>
                      {brief.student_concerns.map((c: string, i: number) => (
                        <View key={i} style={styles.bulletRow}>
                          <Text style={styles.bullet}>·</Text>
                          <Text style={styles.briefBody}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {brief.suggested_prep_materials?.length > 0 && (
                    <View style={styles.briefSection}>
                      <Text style={styles.briefSectionTitle}>Suggested Prep</Text>
                      {brief.suggested_prep_materials.map((m: string, i: number) => (
                        <View key={i} style={styles.bulletRow}>
                          <Text style={styles.bullet}>·</Text>
                          <Text style={styles.briefBody}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {brief.estimated_consultation_duration_minutes && (
                    <View style={styles.briefSection}>
                      <Text style={styles.briefSectionTitle}>Estimated Duration</Text>
                      <Text style={styles.briefBody}>
                        ~{brief.estimated_consultation_duration_minutes} minutes
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.briefEmpty}>
                  <Ionicons name="alert-circle-outline" size={36} color={C.ink5} />
                  <Text style={styles.briefEmptyText}>No smart brief available yet.</Text>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Files in Conversation Modal ───────────────────────────────────── */}
      <Modal
        visible={showFiles}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiles(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons name="folder-outline" size={20} color={C.ink2} style={{ marginRight: S.sm }} />
              <Text style={styles.modalTitle}>Files</Text>
              <TouchableOpacity onPress={() => setShowFiles(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.ink3} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {fileMessages.length === 0 ? (
                <View style={styles.briefEmpty}>
                  <Text style={styles.briefEmptyText}>No files shared yet.</Text>
                </View>
              ) : (
                fileMessages.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.fileListRow}
                    onPress={() => m.file_url && Linking.openURL(m.file_url)}
                  >
                    <Ionicons
                      name={m.file_type?.includes('pdf') ? 'document-outline' : 'document-text-outline'}
                      size={22}
                      color={C.ink2}
                      style={{ marginRight: S.md }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileListName} numberOfLines={1}>{m.file_name || 'Attachment'}</Text>
                      <Text style={styles.fileListMeta}>
                        {m.file_size_bytes ? `${(m.file_size_bytes / 1024).toFixed(0)} KB` : ''} · {formatTime(m.created_at)}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={C.ink4} />
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Attach Menu Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity 
          style={styles.attachMenuOverlay} 
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={[styles.attachMenuSheet, { marginBottom: Math.max(insets.bottom, S.sm) + 64 }]}>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleSelectImage}>
              <Ionicons name="image-outline" size={18} color={C.ink2} style={styles.attachMenuItemIcon} />
              <Text style={styles.attachMenuText}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleSelectDocument}>
              <Ionicons name="document-outline" size={18} color={C.ink2} style={styles.attachMenuItemIcon} />
              <Text style={styles.attachMenuText}>Document</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── File Preview Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showFilePreview}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowFilePreview(false); setSelectedFile(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons 
                name={selectedFile?.fileType === 'image' ? 'image-outline' : 'document-attach-outline'} 
                size={20} 
                color={C.ink2} 
                style={{ marginRight: S.sm }} 
              />
              <Text style={styles.modalTitle}>
                {selectedFile?.fileType === 'image' ? 'Send Image' : 'Send File'}
              </Text>
              <TouchableOpacity onPress={() => { setShowFilePreview(false); setSelectedFile(null); }} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.ink3} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalBody, { paddingBottom: S.xl }]}>
              {selectedFile && (
                <View style={styles.filePreviewCard}>
                  {selectedFile.fileType === 'image' ? (
                    <Image 
                      source={{ uri: selectedFile.uri }} 
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons
                      name={selectedFile.mimeType?.includes('pdf') ? 'document-outline' : 'document-text-outline'}
                      size={48}
                      color={C.ink2}
                    />
                  )}
                  <Text style={styles.filePreviewName} numberOfLines={2}>{selectedFile.name}</Text>
                  {selectedFile.size > 0 && (
                    <Text style={styles.filePreviewSize}>
                      {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                    </Text>
                  )}
                </View>
              )}
              <View style={styles.filePreviewActions}>
                <TouchableOpacity
                  style={[styles.filePreviewBtn, styles.filePreviewBtnCancel]}
                  onPress={() => { setShowFilePreview(false); setSelectedFile(null); }}
                >
                  <Text style={styles.filePreviewBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filePreviewBtn, styles.filePreviewBtnSend]}
                  onPress={handleSendFile}
                >
                  <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.filePreviewBtnTextSend}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    paddingHorizontal: S.sm,
    paddingVertical: S.sm,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600', color: C.ink1 },
  headerSub: {
    fontSize: 10,
    color: C.ink4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },

  shortcuts: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    paddingHorizontal: S.md,
    paddingVertical: S.sm - 2,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
  },
  shortcutText: { fontSize: 12, fontWeight: '500', color: C.ink2 },
  shortcutDivider: { width: S.sm },

  centred: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatArea: { flex: 1 },

  messageList: { paddingHorizontal: S.md, paddingTop: S.md, paddingBottom: S.md },

  dateSepRow: { alignItems: 'center', marginVertical: S.md },
  dateSepText: {
    fontSize: 11,
    color: C.ink4,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: S.md,
    paddingVertical: 3,
    borderRadius: R.full,
    overflow: 'hidden',
  },

  bubbleRow: { flexDirection: 'row', marginVertical: 3, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },

  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },
  bubbleAvatarText: { fontSize: 10, fontWeight: '700', color: C.ink2 },

  bubble: {
    maxWidth: '74%',
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  bubbleMe: {
    backgroundColor: C.ink1,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderBottomLeftRadius: 4,
  },

  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: C.ink1 },

  timeText: { fontSize: 10, marginTop: 3 },
  timeTextMe: { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  timeTextThem: { color: C.ink4 },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 230 },
  fileMetaWrap: { flex: 1, minWidth: 0 },
  fileName: { flex: 1, fontSize: 13, fontWeight: '500' },
  fileNameMe: { color: 'rgba(255,255,255,0.9)' },
  fileNameThem: { color: C.ink1 },
  fileTypeText: { fontSize: 11, marginTop: 1 },
  fileTypeTextMe: { color: 'rgba(255,255,255,0.7)' },
  fileTypeTextThem: { color: C.ink4 },

  emptyChat: { alignItems: 'center', paddingTop: 80, paddingHorizontal: S.xl },
  emptyChatText: { fontSize: 14, color: C.ink4, marginTop: S.md, textAlign: 'center' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    gap: S.sm,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.md,
    paddingVertical: Platform.OS === 'ios' ? S.sm : 6,
    fontSize: 14,
    color: C.ink1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.ink1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: C.ink5 },

  headerMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'flex-end',
    paddingHorizontal: S.md,
  },
  headerMenuSheet: {
    width: 220,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.md,
    paddingVertical: S.md,
  },
  headerMenuIcon: { marginRight: S.sm },
  headerMenuText: { fontSize: 14, fontWeight: '500' },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '80%',
    paddingTop: S.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: S.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: C.ink1 },
  modalClose: { padding: 4 },
  modalBody: { paddingHorizontal: S.lg, paddingTop: S.md },

  briefSection: { marginBottom: S.lg },
  briefSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: S.sm,
  },
  briefBody: { fontSize: 14, color: C.ink2, lineHeight: 21, flex: 1 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bullet: { fontSize: 18, color: C.ink3, lineHeight: 21, marginRight: 6, marginTop: -2 },
  briefEmpty: { alignItems: 'center', paddingVertical: 40 },
  briefEmptyText: { fontSize: 14, color: C.ink4, marginTop: S.md },

  fileListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  fileListName: { fontSize: 14, color: C.ink1, fontWeight: '500' },
  fileListMeta: { fontSize: 11, color: C.ink4, marginTop: 2 },

  // Message image
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: R.md,
    marginBottom: S.xs,
  },
  imageMetaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 6,
  },
  imageFileName: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  imageFileNameMe: { color: 'rgba(255,255,255,0.85)' },
  imageFileNameThem: { color: C.ink2 },
  imageSizeText: {
    fontSize: 10,
    flexShrink: 0,
  },
  imageSizeTextMe: { color: 'rgba(255,255,255,0.7)' },
  imageSizeTextThem: { color: C.ink4 },

  // Attach menu
  attachMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: S.md,
  },
  attachMenuSheet: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    width: 180,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  attachMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.md,
    paddingVertical: S.md,
  },
  attachMenuItemIcon: { marginRight: S.sm },
  attachMenuText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink2,
  },

  // File preview modal
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: R.md,
    marginBottom: S.md,
  },
  filePreviewCard: {
    alignItems: 'center',
    padding: S.xl,
    backgroundColor: C.surfaceAlt,
    borderRadius: R.lg,
    marginBottom: S.lg,
  },
  filePreviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink1,
    marginTop: S.md,
    textAlign: 'center',
  },
  filePreviewSize: {
    fontSize: 13,
    color: C.ink4,
    marginTop: S.xs,
  },
  filePreviewActions: {
    flexDirection: 'row',
    gap: S.md,
  },
  filePreviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.md,
    borderRadius: R.lg,
  },
  filePreviewBtnCancel: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  filePreviewBtnSend: {
    backgroundColor: C.ink1,
  },
  filePreviewBtnTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.ink2,
  },
  filePreviewBtnTextSend: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
