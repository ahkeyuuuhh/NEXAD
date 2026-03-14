/**
 * ConfirmModal — iOS-style alert dialog
 * Drop-in replacement for Alert.alert() confirmations across the app.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';

export interface ConfirmButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ConfirmButton[];
  onClose: () => void;
}

export default function ConfirmModal({ visible, title, message, buttons, onClose }: Props) {
  const isStacked = buttons.length > 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Prevent tap-through to the dialog itself */}
        <Pressable style={styles.dialog}>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          <View style={styles.separator} />

          <View style={[styles.buttonContainer, isStacked && styles.buttonContainerStacked]}>
            {buttons.map((btn, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <View
                    style={isStacked ? styles.horizontalSeparator : styles.verticalSeparator}
                  />
                )}
                <TouchableOpacity
                  style={[styles.button, !isStacked && { flex: 1 }]}
                  activeOpacity={0.5}
                  onPress={() => {
                    onClose();
                    btn.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'cancel' && styles.cancelText,
                      btn.style === 'destructive' && styles.destructiveText,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dialog: {
    backgroundColor: 'rgba(242,242,247,0.98)',
    borderRadius: 14,
    width: 270,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    color: '#3C3C43',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.29)',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  buttonContainerStacked: {
    flexDirection: 'column',
  },
  verticalSeparator: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.29)',
  },
  horizontalSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.29)',
  },
  button: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    color: '#E8705A',   // orange for default actions
  },
  cancelText: {
    fontWeight: '600',
    color: '#3D3D3D',   // dark grey for cancel
  },
  destructiveText: {
    color: '#FF3B30',   // stays red for destructive
  },
});
