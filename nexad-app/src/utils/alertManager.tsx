import React, { createContext, useContext, useState, useCallback } from 'react';
import { IOSAlert } from '../components/IOSAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ title, message, buttons });
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => setAlertConfig(null), 300);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alertConfig && (
        <IOSAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onDismiss={hideAlert}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useIOSAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useIOSAlert must be used within AlertProvider');
  }
  return context;
};

// Global function for backward compatibility with Alert.alert
export const Alert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    // This will be set by the AlertProvider
    if (globalAlertRef.current) {
      globalAlertRef.current.showAlert(title, message, buttons);
    }
  },
};

export const globalAlertRef: { current: AlertContextType | null } = { current: null };
