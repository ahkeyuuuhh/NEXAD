import React, { useState, useEffect, useCallback } from "react";
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
  StatusBar,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { classroomService } from "../../services/classroomService";
import { supabase } from "../../config/supabase";
import { Ionicons } from "@expo/vector-icons";
import { C, shadow } from "../../config/theme";

type Tab = "Classwork" | "People";

const getBannerColor = (coverColor: string | null | undefined) => {
  // Use the classroom's cover_color if set, otherwise default to black
  return coverColor || '#202124';
};

export default function ClassroomDetailScreen({ navigation, route }: any) {
  const { classroomId } = route.params as { classroomId: string };

  const [classroom, setClassroom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attachmentBins, setAttachmentBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Classwork");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);
  const [itemMenuTarget, setItemMenuTarget] = useState<{ id: string; type: "announcement" | "bin"; item: any } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadClassroomData();
    }, [classroomId])
  );

  // Real-time sync: reload when announcements or bins change in this classroom
  useEffect(() => {
    const ch = supabase
      .channel(`classroom-detail-rt:${classroomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'announcements',
        filter: `classroom_id=eq.${classroomId}`,
      }, () => loadClassroomData())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'attachment_bins',
        filter: `classroom_id=eq.${classroomId}`,
      }, () => loadClassroomData())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'classroom_memberships',
        filter: `classroom_id=eq.${classroomId}`,
      }, () => loadClassroomData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [classroomId]);

  const loadClassroomData = async () => {
    try {
      const [classroomResult, membersResult, announcementsResult, binsResult] = await Promise.all([
        classroomService.getClassroom(classroomId),
        classroomService.getClassroomMembers(classroomId),
        classroomService.getClassroomAnnouncements(classroomId),
        classroomService.getClassroomAttachmentBins(classroomId),
      ]);
      if (classroomResult.data) setClassroom(classroomResult.data);
      if (membersResult.data) setMembers(membersResult.data);
      if (announcementsResult.data) setAnnouncements(announcementsResult.data);
      if (binsResult.data) setAttachmentBins(binsResult.data);
    } catch (error) {
      console.error("Error loading classroom data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadClassroomData(); };

  // ── Ellipsis menu ────────────────────────────────────────────────────────
  const handleDeleteClassroom = () => {
    setShowEllipsisMenu(false);
    Alert.alert("Delete Classroom", `Delete "${classroom?.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await classroomService.deleteClassroom(classroomId);
          if (result.error) Alert.alert("Error", result.error);
          else navigation.goBack();
        },
      },
    ]);
  };

  const handleUnenrollStudent = (student: any) => {
    Alert.alert(
      "Unenroll Student",
      `Remove ${student.first_name} ${student.last_name} from this classroom?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unenroll",
          style: "destructive",
          onPress: async () => {
            const result = await classroomService.removeStudentFromClassroom(classroomId, student.id);
            if (result.error) {
              Alert.alert("Error", result.error);
            } else {
              setMembers(prev => prev.filter(m => m.id !== student.id));
            }
          },
        },
      ]
    );
  };

  // ── Per-card item actions ────────────────────────────────────────────────
  const handleDeleteAnnouncement = (item: any) => {
    setItemMenuTarget(null);
    Alert.alert("Delete Announcement", `Delete "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const result = await classroomService.deleteAnnouncement(item.id);
          if (result.error) Alert.alert("Error", result.error);
          else setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
        },
      },
    ]);
  };

  const handleEditAnnouncement = (item: any) => {
    setItemMenuTarget(null);
    navigation.navigate("CreateAnnouncement", {
      classroomId, classroomName: classroom?.name || "", editMode: true, announcement: item,
    });
  };

  const handleDeleteBin = (item: any) => {
    setItemMenuTarget(null);
    Alert.alert("Delete Bin", `Delete "${item.title}"? All submissions will be lost.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const result = await classroomService.deleteAttachmentBin(item.id);
          if (result.error) Alert.alert("Error", result.error);
          else setAttachmentBins((prev) => prev.filter((b) => b.id !== item.id));
        },
      },
    ]);
  };

  const handleEditBin = (item: any) => {
    setItemMenuTarget(null);
    navigation.navigate("CreateAttachmentBin", { classroomId, editMode: true, bin: item });
  };

  // ── Tab content ──────────────────────────────────────────────────────────
  const tabs: Tab[] = ["Classwork", "People"];

  const renderAnnouncement = ({ item }: { item: any }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityIconWrap}>
        <Ionicons name="megaphone" size={20} color="#202124" />
      </View>
      <View style={styles.activityContent}>
        {item.is_pinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={10} color="#fff" />
            <Text style={styles.pinnedText}>PINNED</Text>
          </View>
        )}
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityBody} numberOfLines={3}>{item.content}</Text>
        <Text style={styles.activityDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity
        style={styles.cardEllipsisBtn}
        onPress={() => setItemMenuTarget({ id: item.id, type: "announcement", item })}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#5F6368" />
      </TouchableOpacity>
    </View>
  );

  const renderBin = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => navigation.navigate("TeacherBinReview", { binId: item.id, classroomId })}
      activeOpacity={0.85}
    >
      <View style={styles.activityIconWrap}>
        <Ionicons name="clipboard" size={20} color="#202124" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.activityBody} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.binMetaRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{item.submission_count || 0} turned in</Text>
          </View>
          {item.deadline && (
            <Text style={styles.activityDate}>
              Due {new Date(item.deadline).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cardEllipsisBtn}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setItemMenuTarget({ id: item.id, type: "bin", item });
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#5F6368" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  type ListItem =
    | { type: "announcement"; data: any }
    | { type: "bin"; data: any };

  const getListData = (): ListItem[] => {
    if (activeTab === "People") return [];
    // Classwork shows both announcements and bins
    return [
      ...announcements.map((d): ListItem => ({ type: "announcement", data: d })),
      ...attachmentBins.map((d): ListItem => ({ type: "bin", data: d })),
    ];
  };

  const listData = getListData();
  const bannerColor = classroom ? getBannerColor(classroom.cover_color) : '#202124';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.ink2} />
      </View>
    );
  }

  if (!classroom) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: C.ink4 }}>Classroom not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={bannerColor} />

      {/* Class Banner Header */}
      <View style={[styles.banner, { backgroundColor: bannerColor }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.bannerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.bannerBackBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEllipsisMenu(true)} style={styles.bannerMenuBtn}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{classroom.name}</Text>
            <View style={styles.inviteCodePill}>
              <Ionicons name="key" size={12} color="#fff" />
              <Text style={styles.inviteCodeText}>{classroom.invite_code}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <View key={tab} style={styles.tabWrapper}>
            <TouchableOpacity
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'People' ? (
        <FlatList
          data={members.filter(m => !m.is_teacher)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text style={styles.peopleSectionTitle}>Students ({members.filter(m => !m.is_teacher).length})</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.personCard}>
              {item.profile_photo_url ? (
                <Image source={{ uri: item.profile_photo_url }} style={styles.personAvatarImage} />
              ) : (
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarText}>
                    {item.first_name?.charAt(0) || item.email?.charAt(0) || 'S'}
                  </Text>
                </View>
              )}
              <Text style={styles.personName}>
                {item.first_name && item.last_name 
                  ? `${item.first_name} ${item.last_name}`
                  : item.email || 'Student'}
              </Text>
              <TouchableOpacity
                style={styles.unenrollBtn}
                onPress={() => handleUnenrollStudent(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle-outline" size={22} color="#D93025" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={60} color="#DADCE0" />
              <Text style={styles.emptyTitle}>No students yet</Text>
              <Text style={styles.emptyText}>Students will appear here when they join</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) => `${item.type}-${item.data.id}-${i}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) =>
            item.type === "announcement"
              ? renderAnnouncement({ item: item.data })
              : renderBin({ item: item.data })
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="clipboard-outline"
                size={60}
                color="#DADCE0"
              />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>
                Tap + to add content
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowFabMenu(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Ellipsis dropdown menu - Modal Style */}
      <Modal
        visible={showEllipsisMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEllipsisMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowEllipsisMenu(false)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowEllipsisMenu(false);
                navigation.navigate("CreateClassroom", { editMode: true, classroom });
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Edit Classroom</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowEllipsisMenu(false);
                navigation.navigate("EnrolledStudents", {
                  classroomId,
                  classroomName: classroom?.name || "",
                });
              }}
            >
              <Ionicons name="people-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Enrolled Students</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowEllipsisMenu(false);
                navigation.navigate("InviteCode", {
                  classroomName: classroom?.name || "",
                  inviteCode: classroom?.invite_code || "",
                });
              }}
            >
              <Ionicons name="key-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>Invite Code</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteClassroom}>
              <Ionicons name="trash-outline" size={20} color="#D93025" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: "#D93025" }]}>Delete Classroom</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FAB dropdown (bottom-right) */}
      <Modal
        visible={showFabMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFabMenu(false)}
      >
        <TouchableOpacity
          style={styles.fabDropOverlay}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        >
          <View style={styles.fabDropMenu}>
            <View style={styles.fabDropHeader}>
              <Text style={styles.fabDropTitle}>Create</Text>
            </View>
            <View style={styles.ellipsisDivider} />
            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() => {
                setShowFabMenu(false);
                navigation.navigate("CreateAnnouncement", { classroomId, classroomName: classroom?.name || "" });
              }}
            >
              <View style={styles.fabDropIconWrap}>
                <Ionicons name="megaphone-outline" size={18} color="#202124" />
              </View>
              <View>
                <Text style={styles.ellipsisItemText}>Announcement</Text>
                <Text style={styles.fabDropSub}>Post an update to your class</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.ellipsisDivider} />
            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() => {
                setShowFabMenu(false);
                navigation.navigate("CreateAttachmentBin", { classroomId });
              }}
            >
              <View style={styles.fabDropIconWrap}>
                <Ionicons name="folder-open-outline" size={18} color="#202124" />
              </View>
              <View>
                <Text style={styles.ellipsisItemText}>Attachment Bin</Text>
                <Text style={styles.fabDropSub}>Collect documents from students</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Per-card item menu */}
      <Modal
        visible={!!itemMenuTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setItemMenuTarget(null)}
      >
        <TouchableOpacity style={styles.itemMenuOverlay} activeOpacity={1} onPress={() => setItemMenuTarget(null)}>
          <View style={styles.itemMenu}>
            <View style={styles.itemMenuTitleRow}>
              <Ionicons
                name={itemMenuTarget?.type === "announcement" ? "megaphone-outline" : "folder-outline"}
                size={14} color="#9AA0A6"
              />
              <Text style={styles.itemMenuTypeLabel}>
                {itemMenuTarget?.type === "announcement" ? "Announcement" : "Attachment Bin"}
              </Text>
            </View>
            <View style={styles.ellipsisDivider} />
            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() =>
                itemMenuTarget?.type === "announcement"
                  ? handleEditAnnouncement(itemMenuTarget.item)
                  : handleEditBin(itemMenuTarget!.item)
              }
            >
              <Ionicons name="pencil-outline" size={17} color="#202124" style={styles.ellipsisIcon} />
              <Text style={styles.ellipsisItemText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.ellipsisDivider} />
            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() =>
                itemMenuTarget?.type === "announcement"
                  ? handleDeleteAnnouncement(itemMenuTarget.item)
                  : handleDeleteBin(itemMenuTarget!.item)
              }
            >
              <Ionicons name="trash-outline" size={17} color="#D93025" style={styles.ellipsisIcon} />
              <Text style={[styles.ellipsisItemText, { color: "#D93025" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#F8F9FA' },

  // Banner Header
  banner: { paddingBottom: 24 },
  bannerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8 },
  bannerBackBtn: { padding: 8 },
  bannerMenuBtn: { padding: 8 },
  bannerContent: { paddingHorizontal: 24, paddingTop: 16 },
  bannerTitle: { fontSize: 28, fontWeight: '400', color: '#fff', marginBottom: 16 },
  inviteCodePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start',
  },
  inviteCodeText: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 1 },

  // Tabs - Pill shaped
  tabBar: { 
    flexDirection: "row", 
    backgroundColor: C.bg, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    gap: 8,
  },
  tabWrapper: { flex: 1 },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: '#E8E8E8',
    borderRadius: 999,
  },
  tabActive: { backgroundColor: '#202124' },
  tabText: { fontSize: 14, fontWeight: "600" as const, color: "#5F6368" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "600" as const },

  // List content
  scrollContent: { flex: 1, backgroundColor: '#F8F9FA' },
  listContent: { padding: 16, paddingBottom: 100 },

  // Activity Cards
  activityCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#DADCE0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  activityIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: '600', color: '#202124', marginBottom: 6 },
  activityBody: { fontSize: 14, color: '#5F6368', lineHeight: 20, marginBottom: 8 },
  activityDate: { fontSize: 12, color: '#9AA0A6' },
  cardEllipsisBtn: { padding: 4 },

  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#202124', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8,
  },
  pinnedText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  binMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#E8F0FE', borderRadius: 12,
  },
  statusBadgeText: { fontSize: 12, color: '#1967D2', fontWeight: '600' },

  // People Section
  peopleSectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#5F6368', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16,
  },
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#DADCE0',
  },
  personAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  personAvatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  personAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  personName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#202124' },
  unenrollBtn: { padding: 4 },

  // Empty state
  emptyWrap: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "500" as const, color: "#5F6368", marginTop: 16 },
  emptyText: { fontSize: 14, color: "#9AA0A6", marginTop: 6, textAlign: "center" },

  // FAB
  fab: {
    position: "absolute", bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#202124",
    justifyContent: "center", alignItems: "center",
    elevation: 6, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },

  // FAB dropdown
  fabDropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-end" as const,
    alignItems: "flex-end" as const,
    paddingBottom: 96,
    paddingRight: 14,
  },
  fabDropMenu: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 260,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  fabDropHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  fabDropTitle: { fontSize: 12, fontWeight: "700" as const, color: "#9AA0A6", textTransform: "uppercase" as const, letterSpacing: 0.8 },
  fabDropIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F1F3F4", justifyContent: "center" as const, alignItems: "center" as const,
    marginRight: 12,
  },
  fabDropSub: { fontSize: 12, color: "#9AA0A6", marginTop: 2 },
  ellipsisItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ellipsisIcon: { marginRight: 12 },
  ellipsisItemText: { fontSize: 15, fontWeight: "500" as const, color: "#202124" },
  ellipsisDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },

  // Per-card item menu
  itemMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  itemMenu: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 240,
    paddingVertical: 6,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  itemMenuTitleRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  itemMenuTypeLabel: { fontSize: 12, color: "#9AA0A6", fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5 },

  // Modal Menu - Positioned near ellipses, smaller size  
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 20 },
  menuModal: {
    backgroundColor: '#fff', borderRadius: 12, width: 200,
    paddingVertical: 6, elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  menuIcon: { marginRight: 16 },
  menuItemText: { fontSize: 16, color: '#202124', fontWeight: '500' },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8EAED', marginHorizontal: 20 },
});
