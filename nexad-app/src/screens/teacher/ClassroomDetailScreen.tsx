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

type Tab = "All" | "Announcements" | "Bins";

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
  const [activeTab, setActiveTab] = useState<Tab>("All");

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
  const handleEllipsisMenu = () => {
    Alert.alert(
      "Classroom Options",
      undefined,
      [
        {
          text: "Edit Classroom",
          onPress: () => {
            navigation.navigate("CreateClassroom", { editMode: true, classroom });
          },
        },
        {
          text: "Enrolled Students",
          onPress: () => {
            navigation.navigate("EnrolledStudents", {
              classroomId,
              classroomName: classroom?.name || "",
            });
          },
        },
        {
          text: "Invite Code",
          onPress: () => {
            navigation.navigate("InviteCode", {
              classroomName: classroom?.name || "",
              inviteCode: classroom?.invite_code || "",
            });
          },
        },
        {
          text: "Delete Classroom",
          style: "destructive",
          onPress: () => handleDeleteClassroom(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteClassroom = () => {
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
  const handleAnnouncementMenu = (item: any) => {
    Alert.alert(
      "Announcement Options",
      undefined,
      [
        {
          text: "Edit",
          onPress: () => {
            navigation.navigate("CreateAnnouncement", {
              classroomId, classroomName: classroom?.name || "", editMode: true, announcement: item,
            });
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteAnnouncement(item),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAnnouncement = (item: any) => {
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

  const handleBinMenu = (item: any) => {
    Alert.alert(
      "Assignment Options",
      undefined,
      [
        {
          text: "Edit",
          onPress: () => {
            navigation.navigate("CreateAttachmentBin", { classroomId, editMode: true, bin: item });
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteBin(item),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteBin = (item: any) => {
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

  const handleFabMenu = () => {
    Alert.alert(
      "Create Content",
      undefined,
      [
        {
          text: "Announcement",
          onPress: () => {
            navigation.navigate("CreateAnnouncement", { classroomId, classroomName: classroom?.name || "" });
          },
        },
        {
          text: "Assignment",
          onPress: () => {
            navigation.navigate("CreateAttachmentBin", { classroomId });
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  // ── Tab content ──────────────────────────────────────────────────────────
  const tabs: Tab[] = ["All", "Announcements", "Bins"];

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
        onPress={() => handleAnnouncementMenu(item)}
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
            handleBinMenu(item);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#5F6368" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderStudent = ({ item }: { item: any }) => (
    <View style={styles.activityCard}>
      <View style={styles.personAvatar}>
        {item.profile_photo_url ? (
          <Image source={{ uri: item.profile_photo_url }} style={styles.personAvatarImage} />
        ) : (
          <Text style={styles.personAvatarText}>
            {item.first_name ? item.first_name[0].toUpperCase() : 'S'}
          </Text>
        )}
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>
          {item.first_name} {item.last_name}
        </Text>
        {item.student_id && (
          <Text style={styles.activityBody}>ID: {item.student_id}</Text>
        )}
        {item.department && (
          <Text style={styles.activityDate}>{item.department}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.unenrollBtn}
        onPress={() => handleUnenrollStudent(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="person-remove" size={18} color="#D93025" />
      </TouchableOpacity>
    </View>
  );

  type ListItem =
    | { type: "announcement"; data: any }
    | { type: "bin"; data: any }
    | { type: "student"; data: any };

  const getListData = (): ListItem[] => {
    if (activeTab === "Announcements") {
      return announcements.map((d): ListItem => ({ type: "announcement", data: d }));
    }
    if (activeTab === "Bins") {
      return attachmentBins.map((d): ListItem => ({ type: "bin", data: d }));
    }
    // "All" shows both announcements and bins
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
            <View style={styles.bannerCenter}>
              <Text style={styles.bannerTitle}>{classroom.name}</Text>
            </View>
            <TouchableOpacity onPress={handleEllipsisMenu} style={styles.bannerMenuBtn}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.bannerContent}>
            <View style={styles.inviteCodePill}>
              <Ionicons name="key" size={12} color="#fff" />
              <Text style={styles.inviteCodeText}>{classroom.invite_code}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        style={styles.tabBarContainer}
        bounces={false}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <FlatList
        data={listData}
        keyExtractor={(item, i) => `${item.type}-${item.data.id}-${i}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          if (item.type === "announcement") {
            return renderAnnouncement({ item: item.data });
          } else if (item.type === "bin") {
            return renderBin({ item: item.data });
          } else if (item.type === "student") {
            return renderStudent({ item: item.data });
          }
          return null;
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name={activeTab === "Announcements" ? "megaphone-outline" : 
                   activeTab === "Bins" ? "clipboard-outline" : 
                   "reader-outline"}
              size={60}
              color="#DADCE0"
            />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              {activeTab === "Announcements" ? "No announcements posted" : 
               activeTab === "Bins" ? "No assignments posted" : 
               "Tap + to add content"}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleFabMenu} activeOpacity={0.85}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#F8F9FA' },

  // Banner Header
  banner: { paddingBottom: 24 },
  bannerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingTop: 8 
  },
  bannerBackBtn: { padding: 8 },
  bannerCenter: { flex: 1, alignItems: 'center' },
  bannerMenuBtn: { padding: 8 },
  bannerContent: { paddingHorizontal: 24, paddingTop: 8, alignItems: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: '600', color: '#fff', textAlign: 'center' },
  inviteCodePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start',
  },
  inviteCodeText: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 1 },

  // Tab Bar - Responsive carousel-style tabs
  tabBarContainer: { 
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    maxHeight: 60,
  },
  tabBar: { 
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    borderRadius: 999,
    minWidth: 80,
  },
  tabActive: { backgroundColor: '#202124' },
  tabText: { fontSize: 14, fontWeight: "600" as const, color: "#5F6368" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "600" as const },

  // List content
  scrollContent: { flex: 1, backgroundColor: '#F8F9FA' },
  listContent: { padding: 16, paddingBottom: 100 },

  // Activity Cards
  activityCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#DADCE0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  activityIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  activityContent: { flex: 1, backgroundColor: 'transparent' },
  activityTitle: { fontSize: 15, fontWeight: '600', color: '#202124', marginBottom: 6, backgroundColor: 'transparent' },
  activityBody: { fontSize: 14, color: '#5F6368', lineHeight: 20, marginBottom: 8, backgroundColor: 'transparent' },
  activityDate: { fontSize: 12, color: '#9AA0A6', backgroundColor: 'transparent' },
  cardEllipsisBtn: { padding: 4 },

  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#202124', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8,
  },
  pinnedText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  binMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, backgroundColor: 'transparent' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(25, 103, 210, 0.15)', borderRadius: 12,
  },
  statusBadgeText: { fontSize: 12, color: '#1967D2', fontWeight: '600' },

  // People Section
  peopleSectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#5F6368', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16,
  },
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#DADCE0',
  },
  personAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  personAvatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  personAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '500', color: '#202124', marginBottom: 2 },
  personStudentId: { fontSize: 12, color: '#5F6368' },
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
});
