// iOS-style Alert replacement
// Import this instead of 'react-native' Alert

import React from 'react';
import { IOSAlert } from '../components/IOSAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

let alertQueue: Array<{
  title: string;
  message?: string;
  buttons?: AlertButton[];
  id: number;
}> = [];

let currentAlertId = 0;
let setCurrentAlert: ((alert: any) => void) | null = null;

export const Alert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    const id = currentAlertId++;
    alertQueue.push({ title, message, buttons, id });
    
    if (setCurrentAlert && alertQueue.length === 1) {
      setCurrentAlert(alertQueue[0]);
    }
  },
};

export const AlertContainer: React.FC = () => {
  const [currentAlert, _setCurrentAlert] = React.useState<any>(null);

  React.useEffect(() => {
    setCurrentAlert = (alert) => {
      _setCurrentAlert(alert);
    };
    
    if (alertQueue.length > 0) {
      _setCurrentAlert(alertQueue[0]);
    }

    return () => {
      setCurrentAlert = null;
    };
  }, []);

  const handleDismiss = () => {
    alertQueue.shift();
    if (alertQueue.length > 0) {
      _setCurrentAlert(alertQueue[0]);
    } else {
      _setCurrentAlert(null);
    }
  };

  if (!currentAlert) return null;

  return (
    <IOSAlert
      visible={true}
      title={currentAlert.title}
      message={currentAlert.message}
      buttons={currentAlert.buttons}
      onDismiss={handleDismiss}
    />
  );
};
