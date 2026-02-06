import { supabase, clearSupabaseSession } from '../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';
import type { User, ApiResponse, UserRole } from '../types';
import { profileService, StudentProfile, TeacherProfile } from './profileService';

// Required for expo-web-browser to properly close after auth
WebBrowser.maybeCompleteAuthSession();

// Combined profile type for auth responses
export type AuthProfile = (StudentProfile | TeacherProfile) & { role: UserRole };

// Store pending role for OAuth callback
let pendingOAuthRole: UserRole | null = null;

export const getPendingOAuthRole = () => pendingOAuthRole;
export const clearPendingOAuthRole = () => { pendingOAuthRole = null; };
export const setPendingOAuthRole = (role: UserRole) => { pendingOAuthRole = role; };

/**
 * Get the redirect URL for OAuth.
 * In a development build, the custom scheme 'nexad://' is registered natively,
 * so we use it directly. This avoids the exp:// URL matching issues in Expo Go.
 */
const getRedirectUrl = (): string => {
  // For dev builds: use the native custom scheme directly
  const url = makeRedirectUri({
    scheme: 'nexad',
    path: 'auth/callback',
  });
  console.log('🔵 [OAuth] Redirect URL:', url);
  return url;
};

export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<ApiResponse<AuthProfile>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check which profile table the user is in
      const roleResult = await profileService.getUserRole(data.user.id);
      
      if (roleResult.error || !roleResult.data?.role || !roleResult.data?.profile) {
        throw new Error('User profile not found. Please sign up first.');
      }

      // Update last login based on role
      if (roleResult.data.role === 'student') {
        await profileService.updateStudentLastLogin(data.user.id);
      } else {
        await profileService.updateTeacherLastLogin(data.user.id);
      }

      return { data: { ...roleResult.data.profile, role: roleResult.data.role } as AuthProfile };
    } catch (error: any) {
      return { error: error.message || 'Sign in failed' };
    }
  },

  /**
   * Sign in with email magic link (passwordless)
   */
  async signInWithMagicLink(email: string, role: UserRole): Promise<ApiResponse<null>> {
    try {
      const redirectUrl = getRedirectUrl();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: role, // Store role for later use when creating profile
          },
        },
      });

      if (error) throw error;

      return { data: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to send magic link' };
    }
  },

  /**
   * Sign in with Google OAuth
   * Uses the official Supabase + Expo Go pattern:
   * 1. Get OAuth URL from Supabase with skipBrowserRedirect
   * 2. Open in-app browser with openAuthSessionAsync
   * 3. Extract tokens from redirect URL using expo-auth-session QueryParams
   * 4. Set session manually with supabase.auth.setSession
   */
  async signInWithGoogle(role: UserRole): Promise<ApiResponse<AuthProfile>> {
    try {
      pendingOAuthRole = role;
      
      const redirectTo = getRedirectUrl();
      console.log('🔵 [OAuth] Starting Google OAuth');
      console.log('🔵 [OAuth] Redirect URL:', redirectTo);
      console.log('🔵 [OAuth] Role:', role);

      // Step 1: Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('🔴 [OAuth] Supabase error:', error.message);
        pendingOAuthRole = null;
        return { error: error.message };
      }

      if (!data?.url) {
        console.error('🔴 [OAuth] No OAuth URL');
        pendingOAuthRole = null;
        return { error: 'Failed to get Google sign-in URL' };
      }

      console.log('🔵 [OAuth] Opening browser...');

      // Step 2: Open browser — redirectTo is used as the URL prefix to match
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
        { showInRecents: true }
      );
      
      console.log('🟡 [OAuth] Browser result type:', result.type);

      // Step 3: Handle the result
      if (result.type === 'success' && 'url' in result) {
        console.log('🟢 [OAuth] Got redirect URL back from browser');
        const session = await this.createSessionFromUrl(result.url);
        if (session) {
          console.log('🟢 [OAuth] Session created for:', session.user.email);
          const authResult = await this.handleAuthenticatedUser(session.user.id, role);
          pendingOAuthRole = null;
          return authResult;
        }
        // Session extraction failed but browser said success
        console.log('🔴 [OAuth] Could not extract session from URL');
      }

      if (result.type === 'cancel') {
        console.log('🟡 [OAuth] User cancelled');
        pendingOAuthRole = null;
        return { error: 'Sign in was cancelled' };
      }

      // "dismiss" — browser closed without capturing redirect URL.
      // This happens when the redirect URL scheme isn't caught by the browser.
      // The deep link handler in App.tsx may have set the session instead.
      console.log('🟡 [OAuth] Browser dismissed — polling for session...');
      
      for (let attempt = 1; attempt <= 20; attempt++) {
        await new Promise(r => setTimeout(r, 500));
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('🟢 [OAuth] Session found after polling (attempt', attempt + ')');
            const authResult = await this.handleAuthenticatedUser(session.user.id, role);
            pendingOAuthRole = null;
            return authResult;
          }
        } catch (e) {
          // keep polling
        }
        
        if (attempt % 5 === 0) {
          console.log('🔵 [OAuth] Still polling... attempt', attempt);
        }
      }

      console.log('🔴 [OAuth] No session after 10s of polling');
      pendingOAuthRole = null;
      return { 
        error: `Google sign-in did not complete.\n\nMake sure this EXACT URL is in your Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:\n\n${redirectTo}` 
      };

    } catch (error: any) {
      console.error('🔴 [OAuth] Exception:', error);
      pendingOAuthRole = null;
      return { error: error.message || 'Google sign in failed' };
    }
  },

  /**
   * Extract tokens from redirect URL and create a Supabase session.
   * Uses expo-auth-session's QueryParams for reliable parsing of both
   * hash fragments (#access_token=...) and query params (?access_token=...).
   */
  async createSessionFromUrl(url: string): Promise<{ user: any } | null> {
    try {
      console.log('🔵 [OAuth] Parsing tokens from URL...');
      const { params, errorCode } = getQueryParams(url);
      
      if (errorCode) {
        console.error('🔴 [OAuth] URL error code:', errorCode);
        return null;
      }

      const { access_token, refresh_token } = params;
      
      if (!access_token) {
        console.log('🔴 [OAuth] No access_token in URL params');
        console.log('🔵 [OAuth] URL was:', url);
        console.log('🔵 [OAuth] Parsed params:', Object.keys(params));
        return null;
      }

      console.log('🔵 [OAuth] Setting session with tokens...');
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || '',
      });

      if (error) {
        console.error('🔴 [OAuth] setSession error:', error.message);
        return null;
      }

      return data.session;
    } catch (error) {
      console.error('🔴 [OAuth] createSessionFromUrl error:', error);
      return null;
    }
  },

  /**
   * Helper to handle authenticated user after OAuth
   */
  async handleAuthenticatedUser(userId: string, role: UserRole): Promise<ApiResponse<AuthProfile>> {
    console.log('🔵 [handleAuthenticatedUser] Processing user:', userId, 'with role:', role);
    
    const roleResult = await profileService.getUserRole(userId);

    if (roleResult.data?.profile) {
      console.log('🟢 [handleAuthenticatedUser] Found existing profile');
      if (roleResult.data.role === 'student') {
        await profileService.updateStudentLastLogin(userId);
      } else {
        await profileService.updateTeacherLastLogin(userId);
      }
      return { data: { ...roleResult.data.profile, role: roleResult.data.role } as AuthProfile };
    }
    
    // No profile found - create one
    console.log('🟡 [handleAuthenticatedUser] No profile found, creating new one');
    
    // Get user data from Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('🔴 [handleAuthenticatedUser] User data not found:', userError);
      return { error: 'User data not found' };
    }

    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const nameParts = fullName.split(' ');

    const newProfile = {
      email: user.email || '',
      first_name: nameParts[0] || 'User',
      last_name: nameParts.slice(1).join(' ') || '',
      profile_photo_url: user.user_metadata?.avatar_url || null,
    };

    console.log('🔵 [handleAuthenticatedUser] Creating profile:', newProfile);

    let createdProfile;
    let createError: string | undefined;

    if (role === 'student') {
      const result = await profileService.createStudentProfile(userId, newProfile);
      createdProfile = result.data;
      createError = result.error;
    } else {
      const result = await profileService.createTeacherProfile(userId, newProfile);
      createdProfile = result.data;
      createError = result.error;
    }

    if (createError) {
      console.error('🔴 [handleAuthenticatedUser] Failed to create profile:', createError);
      
      // Retry once - might be a race condition
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryResult = await profileService.getUserRole(userId);
      if (retryResult.data?.profile) {
        console.log('🟢 [handleAuthenticatedUser] Found profile on retry');
        return { data: { ...retryResult.data.profile, role: retryResult.data.role } as AuthProfile };
      }
      
      // Create fallback user object
      console.log('🟡 [handleAuthenticatedUser] Using fallback user object');
      const fallbackUser = {
        id: '',
        user_id: userId,
        email: user.email || '',
        first_name: nameParts[0] || 'User',
        last_name: nameParts.slice(1).join(' ') || '',
        profile_photo_url: user.user_metadata?.avatar_url || null,
        role: role,
        notification_preferences: { email: true, push: true, sms: false },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      } as AuthProfile;
      
      return { data: fallbackUser };
    }

    console.log('🟢 [handleAuthenticatedUser] Profile created successfully');
    return { data: { ...createdProfile, role } as AuthProfile };
  },

  /**
   * Sign up new user - creates auth user and profile in appropriate table
   */
  async signUp(
    email: string,
    password: string,
    userData: Partial<User>
  ): Promise<ApiResponse<AuthProfile>> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: userData.role || 'student',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const role = userData.role || 'student';

      // Create profile in the appropriate table based on role
      if (role === 'student') {
        const result = await profileService.createStudentProfile(authData.user.id, {
          email,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          student_id: userData.student_id,
          phone: userData.phone,
          department: userData.department,
          year_level: userData.year_level,
          profile_photo_url: userData.profile_photo_url,
        });

        if (result.error) throw new Error(result.error);
        return { data: { ...result.data!, role: 'student' } };
      } else if (role === 'teacher') {
        const result = await profileService.createTeacherProfile(authData.user.id, {
          email,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          phone: userData.phone,
          department: userData.department,
          profile_photo_url: userData.profile_photo_url,
          expertise_tags: userData.expertise_tags,
          bio: userData.bio,
        });

        if (result.error) throw new Error(result.error);
        return { data: { ...result.data!, role: 'teacher' } };
      }

      throw new Error('Invalid role specified');
    } catch (error: any) {
      return { error: error.message || 'Sign up failed' };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.auth.signOut();
      // Even if signOut fails, clear the local session data to prevent refresh token errors
      await clearSupabaseSession();
      if (error) {
        console.error('Sign out error (session cleared anyway):', error);
      }
      return { data: null };
    } catch (error: any) {
      // Force clear session even on error
      await clearSupabaseSession();
      console.error('Sign out exception (session cleared anyway):', error);
      return { data: null }; // Return success since we cleared the session
    }
  },

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<ApiResponse<AuthProfile>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { error: 'No active session' };
      }

      // Check which profile table the user is in
      const roleResult = await profileService.getUserRole(session.user.id);
      
      if (roleResult.error || !roleResult.data?.role || !roleResult.data?.profile) {
        return { error: 'User profile not found' };
      }

      return { data: { ...roleResult.data.profile, role: roleResult.data.role } as AuthProfile };
    } catch (error: any) {
      return { error: error.message || 'Failed to get current user' };
    }
  },

  /**
   * Update user profile - routes to correct table based on role
   */
  async updateProfile(
    userId: string, 
    role: UserRole,
    updates: Partial<StudentProfile | TeacherProfile>
  ): Promise<ApiResponse<AuthProfile>> {
    try {
      if (role === 'student') {
        const result = await profileService.updateStudentProfile(userId, updates);
        if (result.error) throw new Error(result.error);
        return { data: { ...result.data!, role: 'student' } };
      } else if (role === 'teacher') {
        const result = await profileService.updateTeacherProfile(userId, updates);
        if (result.error) throw new Error(result.error);
        return { data: { ...result.data!, role: 'teacher' } };
      }
      
      throw new Error('Invalid role');
    } catch (error: any) {
      return { error: error.message || 'Profile update failed' };
    }
  },
};
