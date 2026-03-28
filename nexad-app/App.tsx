/**
 * NEXAD - AI-Enhanced Consultation System
 * Main App Entry Point
 */
import 'react-native-gesture-handler'; // MUST be at the very top
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Easing, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Updates from 'expo-updates';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DEV_CONFIG } from './src/config/devMode';
import { supabase } from './src/config/supabase';
import { AnimatePresence } from './src/components/MotionWrapper';

// This MUST be called at the top level of the file that the redirect lands on
WebBrowser.maybeCompleteAuthSession();

// Auth Screens
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';

// App Screens
import StudentDashboard from './src/screens/student/StudentDashboard';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import FindTeacherScreen from './src/screens/student/FindTeacherScreen';
import ConsultationRequestScreen from './src/screens/student/ConsultationRequestScreen';
import RequestManagementScreen from './src/screens/teacher/RequestManagementScreen';
import RequestApprovalScreen from './src/screens/teacher/RequestApprovalScreen';
import TeacherConsultationsScreen from './src/screens/teacher/TeacherConsultationsScreen';
import StudentConsultationsScreen from './src/screens/student/StudentConsultationsScreen';
import TeacherConsultationHistoryScreen from './src/screens/teacher/ConsultationHistoryScreen';
import StudentConsultationHistoryScreen from './src/screens/student/ConsultationHistoryScreen';
import AllRequestsScreen from './src/screens/teacher/AllRequestsScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import PendingRequestsScreen from './src/screens/student/PendingRequestsScreen';

// Classroom Hub Screens - Teacher
import ClassroomHubScreen from './src/screens/teacher/ClassroomHubScreen';
import CreateClassroomScreen from './src/screens/teacher/CreateClassroomScreen';
import ClassroomDetailScreen from './src/screens/teacher/ClassroomDetailScreen';
import CreateAnnouncementScreen from './src/screens/teacher/CreateAnnouncementScreen';
import CreateAttachmentBinScreen from './src/screens/teacher/CreateAttachmentBinScreen';
import TeacherBinReviewScreen from './src/screens/teacher/TeacherBinReviewScreen';
import EnrolledStudentsScreen from './src/screens/teacher/EnrolledStudentsScreen';
import InviteCodeScreen from './src/screens/teacher/InviteCodeScreen';
import StudentWorksScreen from './src/screens/teacher/StudentWorksScreen';

// Classroom Hub Screens - Student
import StudentClassroomsScreen from './src/screens/student/StudentClassroomsScreen';
import StudentClassroomDetailScreen from './src/screens/student/StudentClassroomDetailScreen';
import AttachmentBinSubmissionScreen from './src/screens/student/AttachmentBinSubmissionScreen';
import QRScannerScreen from './src/screens/student/QRScannerScreen';

// Profile & Settings
import TeacherProfileScreen from './src/screens/teacher/TeacherProfileScreen';
import StudentProfileScreen from './src/screens/student/StudentProfileScreen';
import AccountSettingsScreen from './src/screens/shared/AccountSettingsScreen';
import TeacherSetupScreen from './src/screens/auth/TeacherSetupScreen';

// Shared
import BinCommentsScreen from './src/screens/shared/BinCommentsScreen';
import AnnouncementCommentsScreen from './src/screens/shared/AnnouncementCommentsScreen';
import InboxScreen from './src/screens/shared/InboxScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import ArchivedInboxScreen from './src/screens/shared/ArchivedInboxScreen';
import NotificationToast from './src/components/NotificationToast';
import { AlertContainer } from './src/utils/Alert';

// Virtual Consultation Screens
import TeacherConsultationScreen from './src/screens/teacher/TeacherConsultationScreen';
import StudentJoinConsultationScreen from './src/screens/student/StudentJoinConsultationScreen';
import ConsultationQRScannerScreen from './src/screens/ConsultationQRScannerScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';

function HomeScreen() {
  const { user, signOut } = useAuth();
  return (
    <View style={styles.homeContainer}>
      <Text style={styles.welcomeText}>
        Welcome, {user?.first_name} {user?.last_name}!
      </Text>
      <Text style={styles.roleText}>
        Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
      </Text>
      <Text style={styles.emailText}>{user?.email}</Text>
      <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const Stack = createStackNavigator();

// ─── Enhanced transition configs (preserving original auth transitions) ──────
// Smooth horizontal slide transition (iOS-style) - Enhanced
const slideTransition = {
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 300, easing: Easing.out(Easing.poly(2)) } },
    close: { animation: 'timing' as const, config: { duration: 250, easing: Easing.in(Easing.poly(2)) } },
  },
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};

// Original fade + slide transition for auth screens (RESTORED)
const fadeSlideTransition = {
  cardStyleInterpolator: ({ current, layouts }: any) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width * 0.03, 0],
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    return {
      cardStyle: { transform: [{ translateX }], opacity },
    };
  },
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 250, easing: Easing.out(Easing.ease) } },
    close: { animation: 'timing' as const, config: { duration: 200, easing: Easing.in(Easing.ease) } },
  },
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};

// Enhanced fade + slide transition - No overlapping, preserves backgrounds
const enhancedFadeSlideTransition = {
  cardStyleInterpolator: ({ current, next, layouts }: any) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width * 0.1, 0],
      extrapolate: 'clamp',
    });
    
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.9, 1],
      extrapolate: 'clamp',
    });

    // Scale effect for depth
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.96, 1],
      extrapolate: 'clamp',
    });

    return {
      cardStyle: { 
        transform: [{ translateX }, { scale }], 
        opacity,
      },
    };
  },
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 350, easing: Easing.out(Easing.poly(3)) } },
    close: { animation: 'timing' as const, config: { duration: 280, easing: Easing.in(Easing.poly(2)) } },
  },
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};

// Clean slide transition - No overlapping, preserves backgrounds
const cleanSlideTransition = {
  cardStyleInterpolator: ({ current, next, layouts }: any) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
      extrapolate: 'clamp',
    });

    // Ensure previous screen is properly hidden during transition
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.01, 1],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    });

    return {
      cardStyle: { 
        transform: [{ translateX }],
        opacity,
      },
    };
  },
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 320, easing: Easing.out(Easing.poly(2)) } },
    close: { animation: 'timing' as const, config: { duration: 260, easing: Easing.in(Easing.poly(2)) } },
  },
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};

// Modal transition (vertical slide from bottom) - Enhanced, preserves backgrounds
const enhancedModalTransition = {
  cardStyleInterpolator: ({ current, layouts }: any) => {
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.height, 0],
      extrapolate: 'clamp',
    });

    const opacity = current.progress.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.9, 1],
      extrapolate: 'clamp',
    });

    return {
      cardStyle: { 
        transform: [{ translateY }], 
        opacity,
      },
    };
  },
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 400, easing: Easing.out(Easing.poly(3)) } },
    close: { animation: 'timing' as const, config: { duration: 300, easing: Easing.in(Easing.poly(2)) } },
  },
  gestureEnabled: true,
  gestureDirection: 'vertical' as const,
};

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' }, ...fadeSlideTransition }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useAuth();
  
  // Determine initial route — new teachers without specialties go to setup first
  const needsTeacherSetup =
    user?.role === 'teacher' &&
    (!(user as any).expertise_tags || (user as any).expertise_tags.length === 0);

  const initialRoute = needsTeacherSetup
    ? 'TeacherSetup'
    : user?.role === 'student'
    ? 'StudentDashboard'
    : user?.role === 'teacher'
    ? 'TeacherDashboard'
    : 'Home';
  
  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' }, ...cleanSlideTransition }}>
      <Stack.Screen 
        name="StudentDashboard" 
        component={StudentDashboard} 
        options={{ title: 'NEXAD - Student Dashboard' }} 
      />
      <Stack.Screen 
        name="TeacherDashboard" 
        component={TeacherDashboard} 
        options={{ title: 'NEXAD - Teacher Dashboard' }} 
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'NEXAD' }} 
      />
      <Stack.Screen 
        name="FindTeacher" 
        component={FindTeacherScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ConsultationRequest" 
        component={ConsultationRequestScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="RequestManagement" 
        component={RequestManagementScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="RequestApproval" 
        component={RequestApprovalScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="TeacherConsultations" 
        component={TeacherConsultationsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="StudentConsultations" 
        component={StudentConsultationsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ConsultationHistory" 
        component={user?.role === 'teacher' ? TeacherConsultationHistoryScreen : StudentConsultationHistoryScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AllRequests" 
        component={AllRequestsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="PendingRequests" 
        component={PendingRequestsScreen} 
        options={{ headerShown: false }} 
      />
      {/* Classroom Hub - Teacher Routes */}
      <Stack.Screen 
        name="ClassroomHub" 
        component={ClassroomHubScreen} 
        options={{ headerShown: false, ...enhancedFadeSlideTransition }} 
      />
      <Stack.Screen 
        name="CreateClassroom" 
        component={CreateClassroomScreen} 
        options={{ headerShown: false, ...enhancedModalTransition }} 
      />
      <Stack.Screen 
        name="ClassroomDetail" 
        component={ClassroomDetailScreen} 
        options={{ headerShown: false, ...enhancedFadeSlideTransition }} 
      />
      <Stack.Screen 
        name="CreateAnnouncement" 
        component={CreateAnnouncementScreen} 
        options={{ headerShown: false, ...enhancedModalTransition }} 
      />
      <Stack.Screen 
        name="CreateAttachmentBin" 
        component={CreateAttachmentBinScreen} 
        options={{ headerShown: false, ...enhancedModalTransition }} 
      />
      {/* Classroom Hub - Student Routes */}
      <Stack.Screen 
        name="StudentClassrooms" 
        component={StudentClassroomsScreen} 
        options={{ headerShown: false, ...enhancedFadeSlideTransition }} 
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{ headerShown: false, presentation: 'modal', ...enhancedModalTransition }} 
      />
      <Stack.Screen 
        name="StudentClassroomDetail" 
        component={StudentClassroomDetailScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="AttachmentBinSubmission" 
        component={AttachmentBinSubmissionScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="TeacherBinReview" 
        component={TeacherBinReviewScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="EnrolledStudents" 
        component={EnrolledStudentsScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="InviteCode" 
        component={InviteCodeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="StudentWorks" 
        component={StudentWorksScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="BinComments" 
        component={BinCommentsScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="AnnouncementComments" 
        component={AnnouncementCommentsScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      {/* Profile & Settings */}
      <Stack.Screen
        name="TeacherProfile"
        component={TeacherProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentProfile"
        component={StudentProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TeacherSetup"
        component={TeacherSetupScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      {/* Unified Messaging */}
      <Stack.Screen 
        name="Inbox" 
        component={InboxScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ArchivedInbox" 
        component={ArchivedInboxScreen} 
        options={{ headerShown: false }} 
      />
      {/* Virtual Consultation */}
      <Stack.Screen 
        name="TeacherConsultation" 
        component={TeacherConsultationScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="StudentJoinConsultation" 
        component={StudentJoinConsultationScreen} 
        options={{ headerShown: false, ...cleanSlideTransition }} 
      />
      <Stack.Screen 
        name="ConsultationQRScanner" 
        component={ConsultationQRScannerScreen} 
        options={{ headerShown: false, presentation: 'modal', ...enhancedModalTransition }} 
      />
      <Stack.Screen 
        name="VideoCall" 
        component={VideoCallScreen} 
        options={{ headerShown: false, gestureEnabled: false }} 
      />
    </Stack.Navigator>
  );
}

// Deep linking configuration for OAuth callbacks and consultation joins
const linking: LinkingOptions<any> = {
  prefixes: [
    'nexad://',
    Linking.createURL('/'),
  ],
  config: {
    screens: {
      Welcome: 'welcome',
      Login: 'login',
      SignUp: 'signup',
      RoleSelection: 'role',
      StudentJoinConsultation: 'join/:code',
    },
  },
  // Handle the auth callback URL
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      console.log('🔵 [DeepLink] Initial URL:', url);
      await handleAuthCallback(url);
    }
    return url;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('🔵 [DeepLink] Received URL:', url);
      await handleAuthCallback(url);
      listener(url);
    });
    return () => subscription.remove();
  },
};

/**
 * Handle auth callback URLs from OAuth.
 * Uses getQueryParams from expo-auth-session for reliable token extraction
 * from both hash fragments and query parameters.
 */
async function handleAuthCallback(url: string) {
  try {
    // Check if this URL contains auth tokens
    if (!url.includes('access_token') && !url.includes('error')) {
      return;
    }

    console.log('🔵 [DeepLink] Processing auth callback...');
    const { params, errorCode } = getQueryParams(url);

    if (errorCode) {
      console.error('🔴 [DeepLink] Error code from OAuth:', errorCode);
      return;
    }

    const { access_token, refresh_token } = params;

    if (access_token) {
      console.log('🔵 [DeepLink] Setting session from deep link tokens...');
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || '',
      });
      if (error) {
        console.error('🔴 [DeepLink] setSession error:', error.message);
      } else {
        console.log('🟢 [DeepLink] Session set successfully!');
      }
    } else {
      console.log('🟡 [DeepLink] No access_token in URL params');
    }
  } catch (error) {
    console.error('🔴 [DeepLink] Error handling auth callback:', error);
  }
}

function Navigation() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Log the redirect URL on mount so user can verify it's in Supabase
    try {
      const { makeRedirectUri } = require('expo-auth-session');
      const redirectUrl = makeRedirectUri();
      console.log('========================================');
      console.log('🔵 NEXAD REDIRECT URL (add to Supabase):');
      console.log(redirectUrl);
      console.log('========================================');
    } catch (e) {
      const url = Linking.createURL('');
      console.log('========================================');
      console.log('🔵 NEXAD REDIRECT URL (add to Supabase):');
      console.log(url);
      console.log('========================================');
    }

    // Add manual update check function to global scope for debugging
    (global as any).checkForUpdates = async () => {
      try {
        console.log('🔵 Manual update check triggered...');
        if (__DEV__) {
          console.log('🟡 DEV mode - cannot check for updates');
          return;
        }
        
        if (!Updates.isEnabled) {
          console.log('🟡 Updates not enabled');
          return;
        }

        const update = await Updates.checkForUpdateAsync();
        console.log('🔵 Update check result:', update);
        
        if (update.isAvailable) {
          console.log('🟢 Update available! Fetching...');
          await Updates.fetchUpdateAsync();
          console.log('🟢 Update fetched! Reloading...');
          await Updates.reloadAsync();
        } else {
          console.log('🟡 No updates available');
        }
      } catch (error: any) {
        console.error('🔴 Manual update check failed:', error);
      }
    };
  }, []);

  // DEV MODE: Skip authentication for testing
  if (DEV_CONFIG.SKIP_AUTH) {
    console.log('🚀 DEV MODE ACTIVE: Skipping authentication');
    console.log('Mock User:', DEV_CONFIG.MOCK_USER);
    
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator>
          {DEV_CONFIG.MOCK_USER.role === 'student' ? (
            <Stack.Screen 
              name="StudentDashboard" 
              component={StudentDashboard} 
              options={{ 
                title: 'NEXAD - Dashboard (DEV MODE)',
                headerStyle: { backgroundColor: '#fbbf24' },
              }} 
              initialParams={{ devModeUser: DEV_CONFIG.MOCK_USER }}
            />
          ) : (
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ 
                title: 'NEXAD (DEV MODE)',
                headerStyle: { backgroundColor: '#fbbf24' },
              }} 
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Normal authentication flow
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('./assets/NEXAD GIF.gif')} 
          style={styles.loadingGif}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <AnimatePresence>
        {user ? <AppStack /> : <AuthStack />}
      </AnimatePresence>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Milker':       require('./assets/fonts/Milker.otf'),
    'Garet-Book':   require('./assets/fonts/garet.book.ttf'),
    'Garet-Heavy':  require('./assets/fonts/garet.heavy.ttf'),
  });

  useEffect(() => {
    // Set up Android notification channel with sound (required for Android 8+)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'NEXAD Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#111111',
        enableVibrate: true,
        showBadge: true,
      }).catch(() => {});
    }

    // Check for OTA updates on app start
    async function checkForUpdates() {
      try {
        if (__DEV__) {
          console.log('🟡 DEV mode - skipping update check');
          return;
        }
        
        if (!Updates.isEnabled) {
          console.log('🟡 Updates not enabled');
          return;
        }

        console.log('🔵 Checking for updates...');
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          console.log('🟢 Update available! Fetching...');
          await Updates.fetchUpdateAsync();
          console.log('🟢 Update fetched! Reloading...');
          await Updates.reloadAsync();
        } else {
          console.log('🟡 No updates available');
        }
      } catch (error: any) {
        console.error('🔴 Update check failed:', error?.message);
      }
    }

    checkForUpdates();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('./assets/NEXAD GIF.gif')} 
          style={styles.loadingGif}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      {/* Premium radial gradient background - bright white center to gray edges */}
      <View style={StyleSheet.absoluteFill}>
        {/* Base light gray background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E5E7EB' }]} />
        {/* Main radial gradient effect - bright white center fading to transparent */}
        <LinearGradient
          colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0.3 }} 
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Horizontal radial spread */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }} 
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle top-to-bottom gradient for depth */}
        <LinearGradient
          colors={['rgba(229,231,235,0.3)', 'transparent', 'rgba(156,163,175,0.2)']}
          start={{ x: 0.5, y: 0 }} 
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <SafeAreaProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
        <NotificationToast />
        <AlertContainer />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingGif: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleText: {
    fontSize: 18,
    color: '#2563eb',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 32,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
