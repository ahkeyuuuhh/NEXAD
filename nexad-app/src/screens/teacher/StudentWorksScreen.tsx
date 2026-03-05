import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { classroomService } from "../../services/classroomService";
import { documentService } from "../../services/documentService";
import { C } from "../../config/theme";

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; fg: string }> = {
  pending_review:         { label: "Pending Review",    icon: "time-outline",        bg: "#F1F3F4", fg: "#5F6368" },
  approved:               { label: "Approved",          icon: "checkmark-circle",    bg: "#202124", fg: "#fff"    },
  revised:                { label: "Revision Needed",   icon: "pencil",              bg: "#3C3C3C", fg: "#fff"    },
  for_consultation:       { label: "Consult Suggested", icon: "chatbubbles-outline", bg: "#5F5F5F", fg: "#fff"    },
  consultation_requested: { label: "Consult Requested", icon: "calendar-outline",    bg: "#3C3C3C", fg: "#fff"    },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;
  return (
    <View style={[badge.wrap, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon as any} size={11} color={s.fg} />
      <Text style={[badge.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
});

export default function StudentWorksScreen({ navigation, route }: any) {
  const { classroomId, classroomName, studentId, studentName } = route.params as {
    classroomId: string;
    classroomName: string;
    studentId: string;
    studentName: string;
  };

  const [bins, setBins] = useState<any[]>([]);
  const [submissionsByBin, setSubmissionsByBin] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBins, setExpandedBins] = useState<Set<string>>(new Set());

  const toggleExpand = (binId: string) => {
    setExpandedBins((prev) => {
      const next = new Set(prev);
      if (next.has(binId)) next.delete(binId);
      else next.add(binId);
      return next;
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [classroomId, studentId])
  );

  const loadData = async () => {
    try {
      const [binsResult, subsResult] = await Promise.all([
        classroomService.getClassroomAttachmentBins(classroomId),
        classroomService.getStudentSubmissionsForClassroom(classroomId, studentId),
      ]);

      const binsData = binsResult.data || [];
      setBins(binsData);

      const map: Record<string, any> = {};
      (subsResult.data || []).forEach((sub: any) => {
        if (sub.attachment_bin_id) {
          // keep most recent per bin
          if (!map[sub.attachment_bin_id]) {
            map[sub.attachment_bin_id] = sub;
          }
        }
      });
      setSubmissionsByBin(map);
    } catch (err) {
      console.error("Error loading student works:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleViewFile = async (submission: any) => {
    try {
      const result = await documentService.getDocumentUrl(submission.storage_path);
      if (result.error || !result.data) {
        Alert.alert("Error", result.error || "Failed to get file link");
        return;
      }
      const supported = await Linking.canOpenURL(result.data);
      if (supported) {
        await Linking.openURL(result.data);
      } else {
        Alert.alert("Error", "Cannot open this file type on your device.");
      }
    } catch {
      Alert.alert("Error", "Failed to open file");
    }
  };

  const submittedCount = Object.keys(submissionsByBin).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#202124" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{studentName}</Text>
          <Text style={styles.headerSub}>{classroomName}</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.ink2} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNum}>{bins.length}</Text>
              <Text style={styles.summaryLabel}>Total Bins</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNum}>{submittedCount}</Text>
              <Text style={styles.summaryLabel}>Submitted</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNum}>{bins.length - submittedCount}</Text>
              <Text style={styles.summaryLabel}>Missing</Text>
            </View>
          </View>

          {bins.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={60} color="#BCC0C6" />
              <Text style={styles.emptyTitle}>No bins yet</Text>
              <Text style={styles.emptySub}>No attachment bins in this classroom.</Text>
            </View>
          ) : (
            bins.map((bin) => {
              const sub = submissionsByBin[bin.id];
              return (
                <View key={bin.id} style={styles.card}>
                  {/* Accordion header — always visible */}
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => toggleExpand(bin.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.binIconWrap}>
                      <Ionicons name="folder" size={18} color="#202124" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.binTitle}>{bin.title}</Text>
                      {bin.deadline && (
                        <Text style={styles.binDue}>
                          Due {new Date(bin.deadline).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    {/* Submitted indicator */}
                    <View style={[styles.submittedDot, { backgroundColor: sub ? "#202124" : "#E0E0E0" }]} />
                    <Ionicons
                      name={expandedBins.has(bin.id) ? "chevron-up" : "chevron-down"}
                      size={16} color="#9AA0A6" style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>

                  {/* Accordion body — only when expanded */}
                  {expandedBins.has(bin.id) && (
                    <View style={styles.accordionBody}>
                      <View style={styles.cardDivider} />
                      {sub ? (
                        <>
                          <StatusBadge status={sub.review_status || "pending_review"} />
                          <View style={styles.fileRow}>
                            <Ionicons name="document-text-outline" size={14} color="#5F6368" />
                            <Text style={styles.fileName} numberOfLines={1}>{sub.file_name}</Text>
                          </View>
                          <Text style={styles.submitDate}>
                            Submitted {new Date(sub.uploaded_at).toLocaleDateString()}
                          </Text>
                          <TouchableOpacity
                            style={styles.viewBtn}
                            onPress={() => handleViewFile(sub)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="eye-outline" size={16} color="#fff" />
                            <Text style={styles.viewBtnText}>View File</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.commentsRow}
                            onPress={() =>
                              navigation.navigate("BinComments", {
                                binId: bin.id, studentId,
                                binTitle: bin.title, studentName, role: "teacher",
                              })
                            }
                          >
                            <Ionicons name="chatbox-ellipses-outline" size={14} color="#9AA0A6" />
                            <Text style={styles.commentsText}>Private Comments</Text>
                            <Ionicons name="chevron-forward" size={13} color="#BCC0C6" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.notSubmitted}>
                          <Ionicons name="close-circle-outline" size={18} color="#BCC0C6" />
                          <Text style={styles.notSubmittedText}>Not submitted</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: 'transparent',
    paddingHorizontal: 8, paddingVertical: 14, paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#202124" },
  headerSub: { fontSize: 12, color: "#5F6368", marginTop: 2 },

  scrollContent: { padding: 16 },

  // Summary
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3,
  },
  summaryBox: { flex: 1, alignItems: "center" },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: "#E0E0E0" },
  summaryNum: { fontSize: 22, fontWeight: "800", color: "#202124" },
  summaryLabel: { fontSize: 12, color: "#9AA0A6", marginTop: 2 },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 14, padding: 0,
    marginBottom: 12, overflow: "hidden",
    elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3,
  },
  accordionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16,
  },
  submittedDot: { width: 8, height: 8, borderRadius: 4 },
  binRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  binIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F1F3F4", justifyContent: "center", alignItems: "center",
  },
  binTitle: { fontSize: 15, fontWeight: "700", color: "#202124" },
  binDue: { fontSize: 12, color: "#9AA0A6", marginTop: 2 },
  accordionBody: { paddingHorizontal: 16, paddingBottom: 16 },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E0E0E0", marginBottom: 12 },

  fileRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 4 },
  fileName: { flex: 1, fontSize: 13, color: "#5F6368" },
  submitDate: { fontSize: 12, color: "#9AA0A6", marginBottom: 12 },

  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#202124",
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, justifyContent: "center",
    marginBottom: 10,
  },
  viewBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  commentsRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#F1F3F4",
  },
  commentsText: { flex: 1, fontSize: 13, color: "#9AA0A6" },

  notSubmitted: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 8, paddingHorizontal: 12,
  },
  notSubmittedText: { fontSize: 14, color: "#BCC0C6", fontWeight: "500" },

  // Empty state
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#5F6368", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#BCC0C6", marginTop: 6, textAlign: "center" },
});
