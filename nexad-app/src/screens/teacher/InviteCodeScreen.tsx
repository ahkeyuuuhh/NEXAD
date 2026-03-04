import React, { useEffect, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../config/theme";

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

  const handleCopy = () => {
    Clipboard.setString(inviteCode);
    if (Platform.OS === "android") {
      ToastAndroid.show("Code copied!", ToastAndroid.SHORT);
    }
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join "${classroomName}" on Nexad!\n\nInvite Code: ${inviteCode}`,
    });
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
      <View style={styles.body}>
        {/* Classroom name label */}
        <Animated.Text style={[styles.classroomLabel, { opacity: fadeLabel }]}>
          {classroomName}
        </Animated.Text>

        {/* Code card */}
        <Animated.View style={[styles.codeCard, { opacity: fadeCard, transform: [{ translateY: slideCard }] }]}>
          <Ionicons name="key-outline" size={36} color="#202124" style={{ marginBottom: 12 }} />
          <Text style={styles.codeLabel}>Invite Code</Text>
          <Animated.Text style={[styles.codeText, { transform: [{ scale: pulseCode }] }]}>
            {inviteCode}
          </Animated.Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.75}>
            <Ionicons name="copy-outline" size={16} color="#5F6368" />
            <Text style={styles.copyText}>Tap to copy</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.hint}>
          Share this code with your students so they can join the classroom.
        </Text>

        {/* Share Code button */}
        <Animated.View style={{ opacity: fadeBtn, width: "100%", alignItems: "center" }}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>Share Code</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F3F4" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 14,
    paddingTop: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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

  classroomLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5F6368",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 24,
  },

  codeCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 13,
    color: "#9AA0A6",
    fontWeight: "500",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 38,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#202124",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
