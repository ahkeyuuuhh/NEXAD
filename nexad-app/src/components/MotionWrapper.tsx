import React from 'react';
import { View, ViewStyle } from 'react-native';

interface MotionWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const MotionWrapper: React.FC<MotionWrapperProps> = ({
  children,
  style
}) => {
  return (
    <View style={{ flex: 1, ...style }}>
      {children}
    </View>
  );
};

export const MotionScreen: React.FC<MotionWrapperProps> = ({
  children,
  style
}) => {
  return (
    <View style={{ flex: 1, ...style }}>
      {children}
    </View>
  );
};

// Simple placeholder for AnimatePresence
export const AnimatePresence: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};