import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { classroomService } from "../../services/classroomService";
import { Ionicons } from "@expo/vector-icons";
import { C, shadow } from "../../config/theme";

type Tab = "Announcements" | "Bins" | "All";

export default function ClassroomDetailScreen({ navigation, route }: any) {
  const { classroomId } = route.params as { classroomId: string };

  const [classroom, setClassroom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attachmentBins, setAttachmentBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);
  const [itemMenuTarget, setItemMenuTarget] = useState<{ id: string; type: "announcement" | "bin"; item: any } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadClassroomData();
    }, [classroomId])
  );

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
  const tabs: Tab[] = ["All", "Announcements", "Bins"];

  const renderAnnouncement = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={12} color="#fff" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>{item.title}</Text>
        <TouchableOpacity
          style={styles.cardEllipsisBtn}
          onPress={() => setItemMenuTarget({ id: item.id, type: "announcement", item })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#9AA0A6" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardBody} numberOfLines={3}>{item.content}</Text>
      <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  const renderBin = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("TeacherBinReview", { binId: item.id, classroomId })}
      activeOpacity={0.85}
    >
      <View style={styles.binRow}>
        <View style={styles.binIconWrap}>
          <Ionicons name="folder" size={20} color={C.ink2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.cardBody} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.binMeta}>
            <Text style={styles.cardDate}>{item.submission_count || 0} submissions</Text>
            {item.deadline && (
              <Text style={styles.cardDate}>
                Due {new Date(item.deadline).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.cardEllipsisBtn}
          onPress={() => setItemMenuTarget({ id: item.id, type: "bin", item })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#9AA0A6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  type ListItem =
    | { type: "announcement"; data: any }
    | { type: "bin"; data: any };

  const getListData = (): ListItem[] => {
    if (activeTab === "Announcements") return announcements.map((d) => ({ type: "announcement", data: d }));
    if (activeTab === "Bins") return attachmentBins.map((d) => ({ type: "bin", data: d }));
    return [
      ...announcements.map((d): ListItem => ({ type: "announcement", data: d })),
      ...attachmentBins.map((d): ListItem => ({ type: "bin", data: d })),
    ];
  };

  const listData = getListData();

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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{classroom.name}</Text>
        <TouchableOpacity onPress={() => setShowEllipsisMenu(true)} style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={C.ink2} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
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
              name={
                activeTab === "Bins" ? "folder-outline" :
                activeTab === "Announcements" ? "megaphone-outline" : "layers-outline"
              }
              size={60}
              color="#BCC0C6"
            />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Tap + to add a{activeTab === "Bins" ? "n Attachment Bin" : "n Announcement"}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowFabMenu(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Ellipsis dropdown menu */}
      <Modal
        visible={showEllipsisMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEllipsisMenu(false)}
      >
        <TouchableOpacity
          style={styles.ellipsisOverlay}
          activeOpacity={1}
          onPress={() => setShowEllipsisMenu(false)}
        >
          <View style={styles.ellipsisMenu}>
            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() => {
                setShowEllipsisMenu(false);
                navigation.navigate("CreateClassroom", { editMode: true, classroom });
              }}
            >
              <Ionicons name="pencil-outline" size={18} color="#202124" style={styles.ellipsisIcon} />
              <Text style={styles.ellipsisItemText}>Edit Classroom</Text>
            </TouchableOpacity>

            <View style={styles.ellipsisDivider} />

            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() => {
                setShowEllipsisMenu(false);
                navigation.navigate("EnrolledStudents", {
                  classroomId,
                  classroomName: classroom?.name || "",
                });
              }}
            >
              <Ionicons name="people-outline" size={18} color="#202124" style={styles.ellipsisIcon} />
              <Text style={styles.ellipsisItemText}>Enrolled Students</Text>
            </TouchableOpacity>

            <View style={styles.ellipsisDivider} />

            <TouchableOpacity
              style={styles.ellipsisItem}
              onPress={() => {
                setShowEllipsisMenu(false);
                navigation.navigate("InviteCode", {
                  classroomName: classroom?.name || "",
                  inviteCode: classroom?.invite_code || "",
                });
              }}
            >
              <Ionicons name="key-outline" size={18} color="#202124" style={styles.ellipsisIcon} />
              <Text style={styles.ellipsisItemText}>Invite Code</Text>
            </TouchableOpacity>

            <View style={styles.ellipsisDivider} />

            <TouchableOpacity style={styles.ellipsisItem} onPress={handleDeleteClassroom}>
              <Ionicons name="trash-outline" size={18} color="#D93025" style={styles.ellipsisIcon} />
              <Text style={[styles.ellipsisItemText, { color: "#D93025" }]}>Delete Classroom</Text>
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
  container: { flex: 1, backgroundColor: "#F1F3F4" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F3F4" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 14,
    paddingTop: 44,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E0E0E0",
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" as const, color: "#202124", textAlign: "center" },

  // Tabs
  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#202124" },
  tabText: { fontSize: 14, fontWeight: "500" as const, color: "#5F6368" },
  tabTextActive: { color: "#202124", fontWeight: "700" as const },

  // List content
  listContent: { padding: 14, paddingBottom: 100 },

  // Cards
  card: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    marginBottom: 10, elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3,
  },
  cardHeader: { flexDirection: "row" as const, alignItems: "flex-start" as const, marginBottom: 4 },
  cardEllipsisBtn: { padding: 2, marginLeft: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600" as const, color: "#202124", marginBottom: 4 },
  cardBody: { fontSize: 14, color: "#5F6368", lineHeight: 20, marginBottom: 6 },
  cardDate: { fontSize: 12, color: "#9AA0A6" },

  pinnedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#202124", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, alignSelf: "flex-start", marginBottom: 8,
  },
  pinnedText: { color: "#fff", fontSize: 11, fontWeight: "600" as const },

  binRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  binIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#F1F3F4", justifyContent: "center", alignItems: "center",
  },
  binMeta: { flexDirection: "row", gap: 14, marginTop: 4 },

  // Empty state
  emptyWrap: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const, color: "#5F6368", marginTop: 16 },
  emptyText: { fontSize: 14, color: "#BCC0C6", marginTop: 6, textAlign: "center" },

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

  // Ellipsis dropdown
  ellipsisOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 10,
  },
  ellipsisMenu: {
    backgroundColor: "#fff",
    borderRadius: 14,
    width: 230,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
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
});
