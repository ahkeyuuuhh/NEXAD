import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../../contexts/AuthContext";
import { classroomService } from "../../services/classroomService";
import { supabase } from "../../config/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";

const COVER_COLORS = [
  { color: "#202124", label: "Charcoal" },
  { color: "#3C4043", label: "Graphite" },
  { color: "#5F6368", label: "Slate" },
  { color: "#37474F", label: "Blue Grey" },
  { color: "#1967D2", label: "Blue" },
  { color: "#0F9D58", label: "Green" },
  { color: "#8430CE", label: "Purple" },
  { color: "#D93025", label: "Red" },
  { color: "#F29900", label: "Amber" },
  { color: "#E91E63", label: "Pink" },
];

export default function CreateClassroomScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COVER_COLORS[0].color);
  const [coverImage, setCoverImage] = useState<string | null>(null); // local URI
  const [loading, setLoading] = useState(false);

  // ── Pick a cover photo from device ──────────────────────────────────────
  const pickCoverImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open image picker");
    }
  };

  // ── Upload image to Supabase storage, return public URL ─────────────────
  const uploadCoverImage = async (uri: string): Promise<string | null> => {
    try {
      const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
      const fileName = `${user!.user_id}_${Date.now()}.${ext}`;
      const filePath = `covers/${fileName}`;
      const fetchResp = await fetch(uri);
      const blob = await fetchResp.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from("classroom-covers")
        .upload(filePath, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (error) { console.warn("Cover upload error:", error.message); return null; }
      const { data } = supabase.storage.from("classroom-covers").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.warn("Cover upload failed:", e);
      return null;
    }
  };

  // ── Create classroom ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert("Error", "Please enter a classroom name"); return; }
    if (!user?.user_id) { Alert.alert("Error", "You must be logged in"); return; }
    setLoading(true);
    try {
      let coverValue = selectedColor;
      if (coverImage) {
        const url = await uploadCoverImage(coverImage);
        if (url) coverValue = url;
      }
      const result = await classroomService.createClassroom(
        user.user_id, name.trim(), description.trim() || undefined, coverValue
      );
      if (result.data) {
        Alert.alert(
          "Classroom Created!",
          `Invite Code: ${result.data.invite_code}`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else if (result.error) {
        Alert.alert("Error", result.error);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to create classroom");
    } finally {
      setLoading(false);
    }
  };

  const coverIsImage = coverImage !== null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#3C4043" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Classroom</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scrollable body */}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>

        {/* Cover preview */}
        <View style={styles.coverWrap}>
          {coverIsImage ? (
            <Image source={{ uri: coverImage! }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPreview, { backgroundColor: selectedColor }]}>
              <Text style={styles.coverPreviewText} numberOfLines={2}>
                {name || "Class name"}
              </Text>
              <View style={styles.coverPreviewAvatar}>
                <Text style={styles.coverPreviewAvatarText}>
                  {name ? name.charAt(0).toUpperCase() : "C"}
                </Text>
              </View>
            </View>
          )}

          {/* Change / Remove photo overlay */}
          <TouchableOpacity style={styles.photoBadge} onPress={coverIsImage ? () => setCoverImage(null) : pickCoverImage}>
            <Ionicons name={coverIsImage ? "close-circle" : "camera"} size={16} color="#fff" />
            <Text style={styles.photoBadgeText}>{coverIsImage ? "Remove" : "Add Photo"}</Text>
          </TouchableOpacity>
        </View>

        {/* Color picker — only shown when no image */}
        {!coverIsImage && (
          <>
            <Text style={styles.sectionLabel}>COVER COLOR</Text>
            <View style={styles.colorGrid}>
              {COVER_COLORS.map(({ color }) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.colorSwatchSelected]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.8}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#5F6368" />
          <Text style={styles.infoText}>
            A unique 6-letter invite code will be auto-generated for students to join.
          </Text>
        </View>

        {/* Name */}
        <Text style={styles.sectionLabel}>CLASSROOM NAME *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., CS101 — Intro to Programming"
          placeholderTextColor="#ABABAB"
          maxLength={100}
        />
        <Text style={styles.charCount}>{name.length}/100</Text>

        {/* Description */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Details about this classroom..."
          placeholderTextColor="#ABABAB"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed bottom buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Classroom</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: 'transparent', paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600" as const, color: "#3C4043" },
  scroll: { padding: 16, paddingBottom: 24 },

  // ── Cover ──
  coverWrap: { marginBottom: 20, borderRadius: 10, overflow: "hidden" },
  coverPreview: {
    height: 130, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    justifyContent: "space-between",
  },
  coverImage: { width: "100%", height: 130, borderRadius: 10 },
  coverPreviewText: { fontSize: 22, fontWeight: "400" as const, color: "#fff", flex: 1 },
  coverPreviewAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
    alignSelf: "flex-end",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.45)",
  },
  coverPreviewAvatarText: { color: "#fff", fontSize: 18, fontWeight: "600" as const },

  photoBadge: {
    position: "absolute", bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  photoBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" as const },

  // ── Colors ──
  sectionLabel: {
    fontSize: 11, fontWeight: "600" as const, color: "#5F6368",
    letterSpacing: 1, marginBottom: 10,
    textTransform: "uppercase" as const,
  },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  colorSwatch: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  colorSwatchSelected: { borderWidth: 3, borderColor: "rgba(255,255,255,0.7)" },

  infoCard: {
    flexDirection: "row", gap: 10,
    backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: "#E8EAED", alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, color: "#5F6368", lineHeight: 18 },

  input: {
    backgroundColor: "#fff", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#202124",
    borderWidth: 1, borderColor: "#E8EAED",
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  charCount: { fontSize: 11, color: "#ABABAB", textAlign: "right" as const, marginTop: 4 },

  // ── Fixed bottom ──
  bottomBar: {
    backgroundColor: "#F1F3F4",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E0E0E0",
    gap: 4,
  },
  createBtn: {
    backgroundColor: "#202124",
    borderRadius: 8, paddingVertical: 14, alignItems: "center",
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" as const },
  cancelBtn: { paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: "#5F6368", fontSize: 15 },
});
