/**
 * NEXAD - AI-Enhanced Consultation System
 * Main App Entry Point
 */
import 'react-native-gesture-handler'; // MUST be at the very top
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
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
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
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
