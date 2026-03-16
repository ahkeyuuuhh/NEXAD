import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface IOSAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface IOSAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: IOSAlertButton[];
  onDismiss?: () => void;
}

export const IOSAlert: React.FC<IOSAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
}) => {
  const handleButtonPress = (button: IOSAlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={styles.alertContent}>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
          
          <View style={[
            styles.buttonContainer,
            buttons.length === 2 && styles.buttonContainerRow
          ]}>
            {buttons.map((button, index) => (
              <React.Fragment key={index}>
                {index > 0 && buttons.length === 2 && <View style={styles.buttonDividerVertical} />}
                {index > 0 && buttons.length !== 2 && <View style={styles.buttonDividerHorizontal} />}
                <TouchableOpacity
                  style={[
                    styles.button,
                    buttons.length === 2 && styles.buttonHalf,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.4}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelButtonText,
                      button.style === 'destructive' && styles.destructiveButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  alertContainer: {
    width: 270,
    backgroundColor: 'rgba(248, 248, 248, 0.98)',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  alertContent: {
    paddingTop: 19,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    color: '#000',
    marginTop: 4,
    lineHeight: 18,
  },
  buttonContainer: {
    borderTopWidth: 0.5,
    borderTopColor: '#D1D1D6',
  },
  buttonContainerRow: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonHalf: {
    flex: 1,
  },
  buttonDividerVertical: {
    width: 0.5,
    backgroundColor: '#D1D1D6',
  },
  buttonDividerHorizontal: {
    height: 0.5,
    backgroundColor: '#D1D1D6',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#007AFF',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: '#FF3B30',
  },
});
