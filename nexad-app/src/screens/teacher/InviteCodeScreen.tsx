import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Clipboard,
  StatusBar,
  ToastAndroid,
  Platform,
  Animated,
  Easing,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../config/theme";
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export default function InviteCodeScreen({ navigation, route }: any) {
  const { classroomName, inviteCode } = route.params as {
    classroomName: string;
    inviteCode: string;
  };

  // Animated values
  const fadeLabel = useRef(new Animated.Value(0)).current;
  const slideCard = useRef(new Animated.Value(40)).current;
  const fadeCard = useRef(new Animated.Value(0)).current;
  const pulseCode = useRef(new Animated.Value(1)).current;
  const fadeBtn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger entrance
    Animated.stagger(120, [
      Animated.timing(fadeLabel, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeCard, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideCard, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(fadeBtn, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Gentle pulse loop on code
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseCode, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseCode, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const [saving, setSaving] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(inviteCode)}&color=202124&bgcolor=ffffff&margin=12`;

  const handleCopy = () => {
    Clipboard.setString(inviteCode);
    if (Platform.OS === "android") {
      ToastAndroid.show("Code copied!", ToastAndroid.SHORT);
    }
  };

  // Save / download QR code directly to gallery
  const handleSaveQR = async () => {
    setSaving(true);
    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Gallery permission is required to save the QR code.', ToastAndroid.LONG);
        }
        return;
      }
      // Download QR image to cache
      const localPath = `${cacheDirectory}nexad_qr_${inviteCode}.png`;
      await downloadAsync(qrImageUrl, localPath);
      // Save to gallery
      await MediaLibrary.saveToLibraryAsync(localPath);
      if (Platform.OS === 'android') {
        ToastAndroid.show('QR code saved to your gallery!', ToastAndroid.SHORT);
      }
    } catch (e) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to save QR code. Please try again.', ToastAndroid.SHORT);
      }
    } finally {
      setSaving(false);
    }
  };

  // Combined share: text invite + QR image attachment
  const handleShare = async () => {
    const msg = `Join "${classroomName}" on Nexad!\n\nInvite Code: ${inviteCode}`;
    try {
      const localPath = `${cacheDirectory}qr_share_${inviteCode}.png`;
      await downloadAsync(qrImageUrl, localPath);
      if (Platform.OS === 'ios') {
        await Share.share({ message: msg, url: localPath });
      } else {
        await Share.share({ message: `${msg}\n\nQR Image: ${qrImageUrl}` });
      }
    } catch {
      await Share.share({ message: msg });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#202124" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Code</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Classroom name label */}
        <Animated.Text style={[styles.classroomLabel, { opacity: fadeLabel }]}>
          {classroomName}
        </Animated.Text>

        {/* Combined QR and Code card */}
        <Animated.View style={[styles.qrCard, { opacity: fadeCard, transform: [{ translateY: slideCard }] }]}>
          <Text style={styles.qrLabel}>QR Code</Text>
          <Image
            source={{ uri: qrImageUrl }}
            style={styles.qrImage}
            resizeMode="contain"
          />
          <Text style={styles.qrHint}>Students can scan this to join</Text>
          
          {/* Invite code section below QR */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Invite Code</Text>
            <Animated.Text style={[styles.codeText, { transform: [{ scale: pulseCode }] }]}>
              {inviteCode}
            </Animated.Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.75}>
              <Ionicons name="copy-outline" size={16} color="#5F6368" />
              <Text style={styles.copyText}>Tap to copy</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.hint}>
          Share the code or QR with your students so they can join.
        </Text>

        {/* Action buttons */}
        <Animated.View style={[styles.btnRow, { opacity: fadeBtn }]}>
          <TouchableOpacity
            style={[styles.outlineBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveQR}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color="#202124" />
              : <Ionicons name="download-outline" size={18} color="#202124" />
            }
            <Text style={styles.outlineBtnText}>Save QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 14,
    paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#202124",
    textAlign: "center",
  },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 60,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  classroomLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5F6368",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 24,
  },

  // QR code section
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  qrLabel: {
    fontSize: 13,
    color: "#9AA0A6",
    fontWeight: "500",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrHint: {
    fontSize: 12,
    color: "#9AA0A6",
    marginTop: 12,
    marginBottom: 24,
    textAlign: "center",
  },

  // Code section within QR card
  codeSection: {
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F4",
    width: "100%",
  },
  codeLabel: {
    fontSize: 13,
    color: "#9AA0A6",
    fontWeight: "500",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#202124",
    letterSpacing: 4,
    marginBottom: 16,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F3F4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  copyText: { fontSize: 13, color: "#5F6368", fontWeight: "500" },

  hint: {
    fontSize: 14,
    color: "#9AA0A6",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 8,
  },

  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#202124",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Button row
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#202124",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  outlineBtnText: {
    color: "#202124",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // QR display size bumped for better scan accuracy
  qrDisplayImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
});
