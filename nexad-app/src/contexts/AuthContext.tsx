import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, clearSupabaseSession } from '../config/supabase';
import { authService, AuthProfile, getPendingOAuthRole, clearPendingOAuthRole, setPendingOAuthRole } from '../services/authService';
import { profileService } from '../services/profileService';
import { notificationService } from '../services/notificationService';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<{ error?: string }>;
  signInWithEmail: (email: string, role: UserRole) => Promise<{ error?: string }>;
  signInWithGoogle: (role: UserRole) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Register push token whenever a user logs in (fire-and-forget, never blocks UI)
  useEffect(() => {
    if (user?.user_id) {
      notificationService.registerForPushNotifications(user.user_id).catch(() => {});
    }
  }, [user?.user_id]);

  useEffect(() => {
    console.log('🔵 [AuthProvider] Initializing...');
    
    // Don't load existing sessions - force user to sign in
    // But listen for SIGNED_IN events from OAuth
    setUser(null);
    setLoading(false);
    console.log('🟡 [AuthProvider] Ready for sign-in (existing sessions ignored)');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 [AuthProvider] Auth state changed:', event, session?.user?.email);
      
      // Handle sign out
      if (event === 'SIGNED_OUT') {
        console.log('🟡 [AuthProvider] User signed out');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Handle sign in
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🟢 [AuthProvider] User signed in:', session.user.email);
        setLoading(false); // Immediately set to false to unblock UI
        
        // Load profile asynchronously
        loadUserProfile(session.user.id)
          .then(() => {
            console.log('🟢 [AuthProvider] Profile loaded, navigation should trigger');
          })
          .catch((error: any) => {
            console.error('🔴 [AuthProvider] Error loading profile:', error);
            setUser(null);
          });
        return;
      }
      
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        if (!session) {
          console.log('🔴 [AuthProvider] Token refresh failed');
          await clearSupabaseSession();
          setUser(null);
        }
        setLoading(false);
        return;
      }
      
      // Other events - just set loading false
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    console.log('🔵 [checkUser] Checking for existing session...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Handle invalid refresh token error
      if (error) {
        console.error('🔴 [checkUser] Session error:', error);
        if (error.message?.includes('Refresh Token') || error.name === 'AuthApiError') {
          console.log('🟡 [checkUser] Invalid session detected, clearing...');
          await clearSupabaseSession();
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setLoading(false);
          return;
        }
      }
      
      if (session?.user) {
        console.log('🟢 [checkUser] Found existing session for:', session.user.email);
        await loadUserProfile(session.user.id);
      } else {
        console.log('🟡 [checkUser] No existing session');
        setUser(null);
      }
    } catch (error: any) {
      console.error('🔴 [checkUser] Error:', error);
      if (error?.message?.includes('Refresh Token') || error?.name === 'AuthApiError') {
        await clearSupabaseSession();
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔵 [loadUserProfile] Loading profile for user:', userId);
      
      // Use profileService to get the user's role and profile
      const result = await profileService.getUserRole(userId);
      
      if (result.error) {
        console.error('🔴 [loadUserProfile] Error getting user role:', result.error);
        // Don't give up - try to create a profile
      }

      // If profile exists, use it
      if (result.data?.role && result.data?.profile) {
        const userProfile = {
          ...result.data.profile,
          role: result.data.role as UserRole,
        } as AuthProfile;
        
        console.log('🟢 [loadUserProfile] Loaded existing profile:', userProfile.email, 'Role:', userProfile.role);
        setUser(userProfile);
        return true;
      }

      // No profile found - try to create one automatically
      console.log('🟡 [loadUserProfile] No profile found for user:', userId, '- creating one');
      
      // Get pending OAuth role or default to 'student'
      const pendingRole = getPendingOAuthRole();
      const role: UserRole = pendingRole || 'student';
      
      console.log('🔵 [loadUserProfile] Creating profile with role:', role);

      // Get user data from Supabase auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('🔴 [loadUserProfile] No auth user found:', authError);
        setUser(null);
        return false;
      }

      // Extract name from user metadata
      const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
      const nameParts = fullName.split(' ');

      const newProfileData = {
        email: authUser.email || '',
        first_name: nameParts[0] || 'User',
        last_name: nameParts.slice(1).join(' ') || '',
        profile_photo_url: authUser.user_metadata?.avatar_url || null,
      };

      console.log('🔵 [loadUserProfile] Creating new profile with data:', newProfileData);

      let createdProfile;
      let createError: string | undefined;

      if (role === 'student') {
        const createResult = await profileService.createStudentProfile(userId, newProfileData);
        createdProfile = createResult.data;
        createError = createResult.error;
      } else {
        const createResult = await profileService.createTeacherProfile(userId, newProfileData);
        createdProfile = createResult.data;
        createError = createResult.error;
      }

      if (createError) {
        console.error('🔴 [loadUserProfile] Error creating profile:', createError);
        
        // Retry once - might be a duplicate key error from race condition
        console.log('🟡 [loadUserProfile] Retrying to fetch profile...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryResult = await profileService.getUserRole(userId);
        if (retryResult.data?.profile) {
          const userProfile = { ...retryResult.data.profile, role: retryResult.data.role } as AuthProfile;
          console.log('🟢 [loadUserProfile] Found profile on retry:', userProfile.email);
          setUser(userProfile);
          clearPendingOAuthRole();
          return true;
        }
        
        // Last resort: create a minimal user object from auth data
        console.log('🟡 [loadUserProfile] Using auth data as fallback user');
        const fallbackUser = {
          id: '',
          user_id: userId,
          email: authUser.email || '',
          first_name: nameParts[0] || 'User',
          last_name: nameParts.slice(1).join(' ') || '',
          profile_photo_url: authUser.user_metadata?.avatar_url || null,
          role: role,
          notification_preferences: { email: true, push: true, sms: false },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        } as AuthProfile;
        
        setUser(fallbackUser);
        clearPendingOAuthRole();
        return true;
      }

      clearPendingOAuthRole();

      if (createdProfile) {
        const userProfile = { ...createdProfile, role } as AuthProfile;
        console.log('🟢 [loadUserProfile] Created user profile:', userProfile.email, 'Role:', userProfile.role);
        setUser(userProfile);
        return true;
      }

      console.error('🔴 [loadUserProfile] Failed to create profile - no data returned');
      setUser(null);
      return false;
    } catch (error) {
      console.error('🔴 [loadUserProfile] Exception:', error);
      setUser(null);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authService.signIn(email, password);
      if (result.error) return { error: result.error };
      setUser(result.data || null);
      return {};
    } catch (error: any) {
      return { error: error.message || 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    try {
      const result = await authService.signUp(email, password, userData);
      if (result.error) return { error: result.error };
      setUser(result.data || null);
      return {};
    } catch (error: any) {
      return { error: error.message || 'Sign up failed' };
    }
  };

  const signInWithEmail = async (email: string, role: UserRole) => {
    try {
      const result = await authService.signInWithMagicLink(email, role);
      if (result.error) return { error: result.error };
      return {};
    } catch (error: any) {
      return { error: error.message || 'Failed to send magic link' };
    }
  };

  const signInWithGoogle = async (role: UserRole) => {
    console.log('🔵 [signInWithGoogle] Starting Google sign in with role:', role);
    
    try {
      const result = await authService.signInWithGoogle(role);
      
      if (result.error) {
        console.log('🔴 [signInWithGoogle] Error:', result.error);
        setLoading(false);
        return { error: result.error };
      }
      
      if (result.data) {
        console.log('🟢 [signInWithGoogle] Success! User:', result.data.email);
        setUser(result.data);
        setLoading(false);
        return {};
      }
      
      // OAuth completed but no data returned - wait for onAuthStateChange
      console.log('🟡 [signInWithGoogle] Waiting for auth state change...');
      
      // Give onAuthStateChange a moment to fire
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user was set by onAuthStateChange
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('🟡 [signInWithGoogle] Session exists, loading profile...');
        await loadUserProfile(session.user.id);
        setLoading(false);
        return {};
      }
      
      console.log('🔴 [signInWithGoogle] No session found');
      setLoading(false);
      return { error: 'Sign in did not complete' };
    } catch (error: any) {
      console.error('🔴 [signInWithGoogle] Exception:', error);
      setLoading(false);
      return { error: error.message || 'Google sign in failed' };
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signInWithEmail, 
      signInWithGoogle, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};