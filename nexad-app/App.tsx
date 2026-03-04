/**
 * NEXAD - AI-Enhanced Consultation System
 * Main App Entry Point
 */
import 'react-native-gesture-handler'; // MUST be at the very top
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Easing } from 'react-native';
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

// Shared
import BinCommentsScreen from './src/screens/shared/BinCommentsScreen';

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

// ─── Shared transition configs ───────────────────────────────────────────────
const slideTransition = {
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 280, easing: Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1)) } },
    close: { animation: 'timing' as const, config: { duration: 240, easing: Easing.in(Easing.bezier(0.25, 0.1, 0.25, 1)) } },
  },
};

const fadeSlideTransition = {
  cardStyleInterpolator: ({ current, next, layouts }: any) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width * 0.08, 0],
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const overlayOpacity = next
      ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] })
      : 0;
    return {
      cardStyle: { transform: [{ translateX }], opacity },
      overlayStyle: { opacity: overlayOpacity },
    };
  },
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 320, easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)) } },
    close: { animation: 'timing' as const, config: { duration: 260, easing: Easing.in(Easing.bezier(0.16, 1, 0.3, 1)) } },
  },
};

const modalTransition = {
  cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
  transitionSpec: {
    open:  { animation: 'timing' as const, config: { duration: 340, easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)) } },
    close: { animation: 'timing' as const, config: { duration: 280, easing: Easing.in(Easing.bezier(0.25, 0.46, 0.45, 0.94)) } },
  },
};

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false, ...fadeSlideTransition }}
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
  
  // Determine initial route based on user role
  const initialRoute = user?.role === 'student' 
    ? 'StudentDashboard' 
    : user?.role === 'teacher' 
    ? 'TeacherDashboard' 
    : 'Home';
  
  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, ...slideTransition }}>
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
        options={{ headerShown: false, ...fadeSlideTransition }} 
      />
      <Stack.Screen 
        name="CreateClassroom" 
        component={CreateClassroomScreen} 
        options={{ headerShown: false, ...modalTransition }} 
      />
      <Stack.Screen 
        name="ClassroomDetail" 
        component={ClassroomDetailScreen} 
        options={{ headerShown: false, ...fadeSlideTransition }} 
      />
      <Stack.Screen 
        name="CreateAnnouncement" 
        component={CreateAnnouncementScreen} 
        options={{ headerShown: false, ...modalTransition }} 
      />
      <Stack.Screen 
        name="CreateAttachmentBin" 
        component={CreateAttachmentBinScreen} 
        options={{ headerShown: false, ...modalTransition }} 
      />
      {/* Classroom Hub - Student Routes */}
      <Stack.Screen 
        name="StudentClassrooms" 
        component={StudentClassroomsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="StudentClassroomDetail" 
        component={StudentClassroomDetailScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AttachmentBinSubmission" 
        component={AttachmentBinSubmissionScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="TeacherBinReview" 
        component={TeacherBinReviewScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="EnrolledStudents" 
        component={EnrolledStudentsScreen} 
        options={{ headerShown: false }} 
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
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}

// Deep linking configuration for OAuth callbacks
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

  // Log the redirect URL on mount so user can verify it's in Supabase
  useEffect(() => {
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
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
        <TouchableOpacity 
          onPress={() => {
            console.log('🟡 User tapped to skip loading');
          }}
          style={{ marginTop: 24, padding: 12 }}
        >
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>If stuck, restart the app</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {user ? <AppStack /> : <AuthStack />}
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
    // Check for OTA updates on app start
    async function checkForUpdates() {
      try {
        if (!__DEV__) {
          console.log('Checking for updates...');
          const update = await Updates.checkForUpdateAsync();
          
          if (update.isAvailable) {
            console.log('Update available, downloading...');
            await Updates.fetchUpdateAsync();
            console.log('Update downloaded, reloading app...');
            await Updates.reloadAsync();
          } else {
            console.log('No updates available');
          }
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
    
    checkForUpdates();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A0A0A" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
