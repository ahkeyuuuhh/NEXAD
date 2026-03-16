import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { classroomService } from "../../services/classroomService";
import { profileService } from "../../services/profileService";
import { supabase } from "../../config/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, S, R } from "../../config/theme";
import { useRealtimeNotifications } from "../../hooks/useRealtimeNotifications";

// Monochromatic fallback palette matching app aesthetic
const BANNER_COLORS = [
  "#202124","#3C4043","#5F6368","#37474F",
  "#1A1A2E","#2D2D2D","#455A64","#424242",
];

const getFallbackColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return BANNER_COLORS[Math.abs(hash) % BANNER_COLORS.length];
};

const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : "C");

// ── Animated card wrapper for staggered entrance ──────────────────────────────────
function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: index * 70,
      easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function ClassroomHubScreen({ navigation }: any) {
  const authContext = useAuth();
  const { user } = authContext;
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | undefined>();
  const menuAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Derive display name
  const displayName = user?.email?.split("@")[0] || "Teacher";
  const displayInitial = displayName.charAt(0).toUpperCase();

  const { unreadCount, refresh: refreshNotifCount } = useRealtimeNotifications(user?.user_id);

  useEffect(() => {
    if (user?.user_id) {
      profileService.getTeacherProfile(user.user_id).then(result => {
        if (result.data?.profile_photo_url) setTeacherPhotoUrl(result.data.profile_photo_url);
      });
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadClassrooms();
    refreshNotifCount();
  }, [user?.user_id, refreshNotifCount]));

  // Real-time sync: reload whenever any classroom owned by this teacher changes
  useEffect(() => {
    if (!user?.user_id) return;
    const ch = supabase
      .channel(`classroom-hub-rt:${user.user_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'classrooms',
        filter: `created_by=eq.${user.user_id}`,
      }, () => loadClassrooms())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.user_id]);

  const loadClassrooms = async () => {
    if (!user?.user_id) return;
    try {
      const result = await classroomService.getTeacherClassrooms(user.user_id);
      if (result.data) {
        const classroomsWithCount = await Promise.all(
          result.data.map(async (classroom) => {
            const countResult = await classroomService.getMemberCount(classroom.id);
            return { ...classroom, memberCount: countResult.data || 0 };
          })
        );
        setClassrooms(classroomsWithCount);
      } else if (result.error) {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      console.error("Error loading classrooms:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadClassrooms(); };

  const handleDeleteClassroom = (classroomId: string, classroomName: string) => {
    Alert.alert("Delete Classroom", `Are you sure you want to delete "${classroomName}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setClassrooms(prev => prev.filter((c: any) => c.id !== classroomId));
          const result = await classroomService.deleteClassroom(classroomId);
          if (result.error) { Alert.alert("Error", result.error); loadClassrooms(); }
        },
      },
    ]);
  };

  const handleCardOptions = (item: any) => {
    Alert.alert(item.name, "Choose an action", [
      { text: "Open Classroom", onPress: () => navigation.navigate("ClassroomDetail", { classroomId: item.id }) },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteClassroom(item.id, item.name) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openMenu = () => {
    setShowMenu(true);
    menuAnim.setValue(300);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(menuAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 280,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: 300, duration: 200,
        easing: Easing.in(Easing.bezier(0.4, 0, 1, 1)),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0, duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => { if (finished) setShowMenu(false); });
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => authContext.signOut() },
    ]);
  };

  const renderClassroom = ({ item, index }: { item: any; index: number }) => {
    const cover = item.cover_color || getFallbackColor(item.id);
    const isImageCover = cover.startsWith("http");
    const initial = getInitial(item.name);
    return (
      <AnimatedCard index={index}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ClassroomDetail", { classroomId: item.id })}
        activeOpacity={0.88}
      >
        <View style={[styles.cardBanner, !isImageCover && { backgroundColor: cover }]}>
          {isImageCover && (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <View style={[StyleSheet.absoluteFill, isImageCover && { backgroundColor: "rgba(0,0,0,0.35)" }]} />
          <View style={styles.bannerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
              {item.description ? <Text style={styles.cardSection} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => handleCardOptions(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.bannerBottom}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardBody}>
          <View style={styles.cardMeta}>
            <Ionicons name="people-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.cardMetaText}>
              {item.memberCount} {item.memberCount === 1 ? "student" : "students"}
            </Text>
          </View>
          <View style={styles.codeChip}>
            <Ionicons name="key-outline" size={13} color="#FFFFFF" />
            <Text style={styles.codeText}>{item.invite_code}</Text>
          </View>
        </View>
      </TouchableOpacity>
      </AnimatedCard>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1967D2" />
        <Text style={styles.loadingText}>Loading classrooms...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* App Bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Classroom</Text>
        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={22} color="#3C4043" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
            <Ionicons name="menu" size={26} color="#3C4043" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={classrooms}
        renderItem={renderClassroom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={72} color="#BCC0C6" />
            <Text style={styles.emptyTitle}>No classrooms yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first classroom</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("CreateClassroom")} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Burger Menu Drawer */}
      <Modal visible={showMenu} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeMenu} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: menuAnim }] }]}>
            {/* Drawer header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                {teacherPhotoUrl ? (
                  <Image source={{ uri: teacherPhotoUrl }} style={styles.drawerAvatarImg} />
                ) : (
                  <Text style={styles.drawerAvatarText}>{displayInitial}</Text>
                )}
              </View>
              <View style={styles.drawerHeaderInfo}>
                <Text style={styles.drawerName}>{displayName}</Text>
                <Text style={styles.drawerRole}>Teacher</Text>
              </View>
              <TouchableOpacity onPress={closeMenu} style={styles.drawerClose}>
                <Ionicons name="close" size={20} color={C.ink3} />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDivider} />

            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate("TeacherDashboard"); }}>
              <Ionicons name="home-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); }}>
              <Ionicons name="book-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>My Classes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate("AllRequests"); }}>
              <Ionicons name="document-text-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate("TeacherConsultations"); }}>
              <Ionicons name="chatbubble-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Consultations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate("Notifications"); }}>
              <Ionicons name="notifications-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Notifications</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); handleSignOut(); }}>
              <Ionicons name="log-out-outline" size={20} color={C.red} style={styles.drawerItemIcon} />
              <Text style={[styles.drawerItemText, { color: C.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'transparent' },
  loadingText: { marginTop: 12, fontSize: 14, color: "#5F6368" },

  appBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: 'transparent', paddingHorizontal: 8,
    paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  appBarRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#D93025', borderRadius: 10, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#fff',
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' as const },
  menuBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  appBarTitle: { fontSize: 22, fontWeight: "700" as const, color: "#202124", flex: 1 },

  listContent: { padding: 12, paddingBottom: 120 },

  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 8, marginBottom: 12,
    overflow: "hidden", elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4,
  },
  cardBanner: { height: 108, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "space-between", overflow: "hidden" },
  bannerTop: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: { fontSize: 20, fontWeight: "400" as const, color: "#fff", lineHeight: 26, flex: 1 },
  cardSection: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  moreBtn: { padding: 4, marginLeft: 8, marginTop: -2 },
  bannerBottom: { flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end" },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.45)",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "600" as const },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E8EAED" },
  cardBody: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMetaText: { fontSize: 13, color: "rgba(255, 255, 255, 0.9)" },
  codeChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
  },
  codeText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" as const, letterSpacing: 0.5 },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const, color: "#5F6368", marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: "#BCC0C6", marginTop: 6, textAlign: "center" },

  fab: {
    position: "absolute", bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#202124",
    justifyContent: "center", alignItems: "center",
    elevation: 6, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },

  // ── Drawer ───────────────────────────────────────────────────────────────
  drawerOverlay: { flex: 1 },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  drawer: {
    position: "absolute", top: 0, bottom: 0, right: 0,
    width: 300, backgroundColor: "#fff",
    elevation: 16, shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  drawerHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 20, paddingTop: 32,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EAED",
  },
  drawerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#202124",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  drawerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" as const },
  drawerAvatarImg:  { width: 44, height: 44, borderRadius: 22 },
  drawerHeaderInfo: { flex: 1 },
  drawerName: { fontSize: 15, fontWeight: "600" as const, color: "#202124" },
  drawerRole: { fontSize: 12, color: "#5F6368", marginTop: 2 },
  drawerClose: { padding: 4 },
  drawerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E8EAED", marginVertical: 6 },
  drawerItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  drawerItemIcon: { marginRight: 16 },
  drawerItemText: { fontSize: 15, color: C.ink2 },
});
