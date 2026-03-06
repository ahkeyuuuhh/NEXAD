import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { conversationService } from '../../services/conversationService';
import { C, S, R } from '../../config/theme';
import type { Conversation } from '../../types';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1)   return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffH < 24)  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 168) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_ICON: Record<string, any> = {
  CONSULTATION:       'calendar-outline',
  ANNOUNCEMENT_THREAD:'megaphone-outline',
  INQUIRY:            'chatbubble-outline',
};
const TYPE_LABEL: Record<string, string> = {
  CONSULTATION:       'Consultation',
  ANNOUNCEMENT_THREAD:'Announcement',
  INQUIRY:            'Inquiry',
};

export default function InboxScreen({ navigation }: any) {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const result = await conversationService.getConversations(userId);
    if (result.data) {
      setConversations(result.data);
    } else if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openChat = (conv: Conversation) => {
    const other = conv.other_user as any;
    const title =
      conv.title ||
      (other ? `${other.first_name} ${other.last_name}` : 'Chat');
    navigation.navigate('Chat', {
      conversationId: conv.id,
      title,
      type: conv.type,
      consultationRequestId: conv.consultation_request_id,
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const other = item.other_user as any;
    const name =
      item.title ||
      (other ? `${other.first_name} ${other.last_name}` : 'Chat');
    const initials = other
      ? ((other.first_name?.[0] || '') + (other.last_name?.[0] || '')).toUpperCase()
      : '?';
    const unread = item.my_unread_count || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openChat(item)}
        activeOpacity={0.75}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <Text
              style={[styles.name, unread > 0 && styles.nameUnread]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(item.last_message_at)}</Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.typeTag}>
              <Ionicons
                name={TYPE_ICON[item.type] || 'chatbubble-outline'}
                size={10}
                color={C.ink4}
                style={{ marginRight: 3 }}
              />
              <Text style={styles.typeLabel}>{TYPE_LABEL[item.type] || item.type}</Text>
            </View>
            <Text
              style={[styles.preview, unread > 0 && styles.previewUnread]}
              numberOfLines={1}
            >
              {item.last_message_preview || 'No messages yet'}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </View>
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
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={C.ink3} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink3} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={56} color={C.ink5} />
              <Text style={styles.emptyTitle}>{error ? 'Error loading inbox' : 'No conversations yet'}</Text>
              <Text style={styles.emptySub}>
                {error || 'Accepted consultations, announcement replies, and direct messages will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink1 },

  centred: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { paddingVertical: S.sm, paddingBottom: 32 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.glass,
    marginHorizontal: S.md,
    marginVertical: 4,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: S.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 0,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.ink1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  cardContent: { flex: 1, minWidth: 0 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: { fontSize: 14, color: C.ink2, fontWeight: '500', flex: 1, marginRight: S.sm },
  nameUnread: { color: C.ink1, fontWeight: '700' },
  time: { fontSize: 11, color: C.ink4, flexShrink: 0 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  typeLabel: {
    fontSize: 9,
    color: C.ink4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },

  preview: { fontSize: 12, color: C.ink4, flex: 1 },
  previewUnread: { color: C.ink2, fontWeight: '500' },

  badge: {
    backgroundColor: C.ink1,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  empty: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: S.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.ink2,
    marginTop: S.md,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: C.ink4,
    marginTop: S.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});
