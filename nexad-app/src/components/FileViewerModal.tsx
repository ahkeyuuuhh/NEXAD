import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  url: string;
  fileName?: string;
  isImage: boolean;
  onClose: () => void;
}

/** Returns true if the file is an image based on name or MIME type. */
export function isImageFile(fileName?: string | null, fileType?: string | null): boolean {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(name) || type.startsWith('image/');
}

/**
 * Unified in-app file viewer.
 * - Images → full-screen modal with <Image>
 * - Documents → opens in-app browser (Chrome Custom Tabs / SFSafari) via expo-web-browser
 */
export default function FileViewerModal({ visible, url, fileName, isImage, onClose }: Props) {
  // For non-image files, open the in-app browser immediately on mount.
  useEffect(() => {
    if (visible && !isImage && url) {
      WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
      })
        .then(() => onClose())
        .catch(() => onClose());
    }
  }, [visible, isImage, url]);

  // Non-image: no React modal needed (handled by WebBrowser above)
  if (!isImage) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
        <View style={styles.header}>
          <Text style={styles.fileName} numberOfLines={1}>{fileName || 'Image'}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.imageContainer} activeOpacity={1} onPress={onClose}>
          <Image
            source={{ uri: url }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  fileName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
    opacity: 0.85,
  },
  closeBtn: {
    padding: 4,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width,
    height: height * 0.76,
  },
});
