import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 80;
const BUTTON_SIZE = 60;
const SLIDE_THRESHOLD = SLIDER_WIDTH - BUTTON_SIZE - 20;

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const slideX = useRef(new Animated.Value(0)).current;
  const [isSliding, setIsSliding] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsSliding(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, SLIDE_THRESHOLD));
        slideX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsSliding(false);
        if (gestureState.dx >= SLIDE_THRESHOLD * 0.8) {
          // Slide completed - navigate to role selection
          Animated.timing(slideX, {
            toValue: SLIDE_THRESHOLD,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            navigation.replace('RoleSelection');
          });
        } else {
          // Slide back to start
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  // Interpolate background color based on slide progress
  const sliderBgColor = slideX.interpolate({
    inputRange: [0, SLIDE_THRESHOLD],
    outputRange: ['#4a4a4a', '#2563eb'],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>📚</Text>
          </View>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>WELCOME TO</Text>
          <Text style={styles.brandText}>NEXAD</Text>
          <Text style={styles.descriptionText}>
            Your AI-Enhanced Consultation System for seamless student-faculty communication.
          </Text>
        </View>

        {/* Preview/Feature Area */}
        <View style={styles.previewContainer}>
          <View style={styles.previewBox}>
            <View style={styles.movingElementContainer}>
              {/* Animated dots to show it's interactive */}
              <View style={styles.dotsContainer}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
              <Text style={styles.movingElementText}>Smart Consultations</Text>
            </View>
          </View>
        </View>

        {/* Slide to Start Button */}
        <View style={styles.sliderContainer}>
          <Animated.View 
            style={[
              styles.sliderTrack,
              { backgroundColor: sliderBgColor }
            ]}
          >
            <Animated.View
              style={[
                styles.sliderButton,
                {
                  transform: [{ translateX: slideX }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <Text style={styles.arrowIcon}>→</Text>
            </Animated.View>
            <Text style={styles.sliderText}>Slide to Start</Text>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
  },
  textContainer: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
    maxWidth: '80%',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 24,
  },
  previewBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    aspectRatio: 0.75,
    maxHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  movingElementContainer: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4a4a4a',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#2563eb',
    width: 24,
  },
  movingElementText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  sliderContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 64,
    backgroundColor: '#4a4a4a',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sliderButton: {
    position: 'absolute',
    left: 4,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE - 8,
    backgroundColor: '#ef4444',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  sliderText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    letterSpacing: 1,
  },
});
