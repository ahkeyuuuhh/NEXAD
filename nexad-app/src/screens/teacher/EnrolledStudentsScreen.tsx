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
  StatusBar,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { classroomService } from "../../services/classroomService";
import { C } from "../../config/theme";

export default function EnrolledStudentsScreen({ navigation, route }: any) {
  const { classroomId, classroomName, viewOnly } = route.params as {
    classroomId: string;
    classroomName: string;
    viewOnly?: boolean;
  };

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchUnenrolling, setBatchUnenrolling] = useState(false);

  const enterSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(members.map((m) => m.id)));
  };

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [classroomId])
  );

  const loadMembers = async () => {
    try {
      const result = await classroomService.getClassroomMembers(classroomId);
      
      if (result.data) {
        // Filter to show only students (not teachers)
        const students = result.data.filter(member => !member.is_teacher);
        setMembers(students);
      } else if (result.error) {
        console.error('Error loading members:', result.error);
        Alert.alert('Error', 'Failed to load enrolled students');
      }
    } catch (err) {
      console.error("Error loading members:", err);
      Alert.alert('Error', 'Failed to load enrolled students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const handleUnenroll = (student: any) => {
    Alert.alert(
      "Unenroll Student",
      `Remove ${student.first_name} ${student.last_name} from this classroom? They can rejoin with the invite code.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unenroll",
          style: "destructive",
          onPress: async () => {
            setUnenrolling(student.id);
            const result = await classroomService.removeStudentFromClassroom(
              classroomId,
              student.id
            );
            setUnenrolling(null);
            if (result.error) {
              Alert.alert("Error", result.error);
            } else {
              setMembers((prev) => prev.filter((m) => m.id !== student.id));
            }
          },
        },
      ]
    );
  };

  const handleBatchUnenroll = () => {
    const count = selectedIds.size;
    Alert.alert(
      "Unenroll Students",
      `Remove ${count} selected student${count > 1 ? "s" : ""}? They can rejoin with the invite code.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unenroll",
          style: "destructive",
          onPress: async () => {
            setBatchUnenrolling(true);
            const ids = Array.from(selectedIds);
            await Promise.all(
              ids.map((id) => classroomService.removeStudentFromClassroom(classroomId, id))
            );
            setBatchUnenrolling(false);
            setMembers((prev) => prev.filter((m) => !selectedIds.has(m.id)));
            cancelSelection();
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        activeOpacity={0.75}
        onPress={() => {
          if (selectionMode) {
            toggleSelect(item.id);
          } else if (!viewOnly) {
            navigation.navigate("StudentWorks", {
              classroomId, classroomName,
              studentId: item.id,
              studentName: `${item.first_name} ${item.last_name}`,
            });
          }
        }}
        onLongPress={() => {
          if (!selectionMode && !viewOnly) enterSelection(item.id);
        }}
      >
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
        )}
        <View style={styles.avatarCircle}>
          {item.profile_photo_url ? (
            <Image source={{ uri: item.profile_photo_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {(item.first_name?.[0] || "?").toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {item.first_name} {item.last_name}
          </Text>
          {item.email ? (
            <Text style={styles.email}>{item.email}</Text>
          ) : null}
            {!selectionMode && !viewOnly && <Text style={styles.tapHint}>Tap to view works • Long press to select</Text>}
        </View>
        {!selectionMode && !viewOnly && (
          unenrolling === item.id ? (
            <ActivityIndicator size="small" color="#D93025" />
          ) : (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleUnenroll(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="person-remove-outline" size={18} color="#D93025" />
            </TouchableOpacity>
          )
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => selectionMode ? cancelSelection() : navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name={selectionMode ? "close" : "chevron-back"} size={22} color="#202124" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {selectionMode ? (
            <Text style={styles.headerTitle}>{selectedIds.size} selected</Text>
          ) : (
            <>
              <Text style={styles.headerTitle}>Enrolled Students</Text>
              <Text style={styles.headerSub}>{classroomName}</Text>
            </>
          )}
        </View>
        {selectionMode ? (
          <TouchableOpacity onPress={selectAll} style={styles.iconBtn}>
            <Text style={styles.selectAllText}>All</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.ink2} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id || item.user_id || String(Math.random())}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <View style={styles.countRow}>
                <Ionicons name="people-outline" size={18} color={C.ink2} />
                <Text style={styles.countText}>
                  {members.length} {members.length === 1 ? "student" : "students"} enrolled
                </Text>
              </View>
              {selectionMode && selectedIds.size > 0 && (
                <TouchableOpacity
                  style={styles.batchUnenrollBtn}
                  onPress={handleBatchUnenroll}
                  disabled={batchUnenrolling}
                  activeOpacity={0.85}
                >
                  {batchUnenrolling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-remove-outline" size={16} color="#fff" />
                      <Text style={styles.batchUnenrollText}>Unenroll {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={60} color="#BCC0C6" />
              <Text style={styles.emptyTitle}>No students yet</Text>
              <Text style={styles.emptySub}>
                Share the invite code so students can join.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 8,
    paddingVertical: 14,
    paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#202124" },
  headerSub: { fontSize: 12, color: "#5F6368", marginTop: 2 },

  list: { padding: 16, paddingBottom: 40 },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  countText: { fontSize: 14, color: "#5F6368", fontWeight: "500" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#202124",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#202124" },
  email: { fontSize: 13, color: "#5F6368", marginTop: 2 },
  tapHint: { fontSize: 11, color: "#BCC0C6", marginTop: 4 },
  removeBtn: {
    padding: 6,
  },

  cardSelected: { borderWidth: 2, borderColor: "#202124", backgroundColor: "#F8F8F8" },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#BCC0C6",
    justifyContent: "center", alignItems: "center",
  },
  checkboxSelected: { backgroundColor: "#202124", borderColor: "#202124" },
  selectAllText: { fontSize: 14, fontWeight: "600", color: C.ink2 },
  batchUnenrollBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#D93025",
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, marginBottom: 14, justifyContent: "center",
  },
  batchUnenrollText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#5F6368", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#BCC0C6", marginTop: 6, textAlign: "center" },
});
