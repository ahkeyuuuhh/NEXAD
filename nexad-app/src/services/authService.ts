import { supabase } from '../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
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

// Get the current redirect URL dynamically
const getRedirectUrl = (): string => {
  const redirectUrl = Linking.createURL('auth/callback');
  console.log('Using redirect URL:', redirectUrl);
  return redirectUrl;
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
   * This opens the browser and returns immediately.
   * The auth state listener in AuthContext will handle the rest.
   */
  async signInWithGoogle(role: UserRole): Promise<ApiResponse<AuthProfile>> {
    try {
      // Store the role for when auth completes
      pendingOAuthRole = role;
      
      const redirectUrl = getRedirectUrl();
      console.log('🔵 [OAuth] Starting Google OAuth');
      console.log('🔵 [OAuth] Redirect URL:', redirectUrl);
      console.log('🔵 [OAuth] Pending role:', role);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('🔴 [OAuth] Setup error:', error);
        pendingOAuthRole = null;
        throw error;
      }

      if (!data?.url) {
        console.error('🔴 [OAuth] No OAuth URL received');
        pendingOAuthRole = null;
        return { error: 'No OAuth URL received' };
      }

      console.log('🔵 [OAuth] Opening browser...');
      
      // Open browser - don't wait for specific result
      // The auth state listener will handle the session
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log('🟡 [OAuth] Browser closed with type:', result.type);

      // Give time for the deep link to be processed
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if we got a session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log('🟢 [OAuth] Session found for:', sessionData.session.user.email);
        const userId = sessionData.session.user.id;
        const authResult = await this.handleAuthenticatedUser(userId, role);
        pendingOAuthRole = null;
        return authResult;
      }

      // If browser was explicitly cancelled by user
      if (result.type === 'cancel') {
        console.log('🔴 [OAuth] User cancelled');
        pendingOAuthRole = null;
        return { error: 'Authentication cancelled by user' };
      }

      // For 'dismiss' or 'success' without immediate session,
      // the auth state listener might pick it up
      console.log('🟡 [OAuth] Waiting for auth state change...');
      
      // Wait and check again
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { data: retrySession } = await supabase.auth.getSession();
      if (retrySession?.session) {
        console.log('🟢 [OAuth] Session found on retry!');
        const userId = retrySession.session.user.id;
        const authResult = await this.handleAuthenticatedUser(userId, role);
        pendingOAuthRole = null;
        return authResult;
      }

      console.log('🔴 [OAuth] No session after waiting');
      pendingOAuthRole = null;
      return { 
        error: 'Authentication did not complete. Please ensure you completed the Google sign-in and try again.' 
      };

    } catch (error: any) {
      console.error('🔴 [OAuth] Error:', error);
      pendingOAuthRole = null;
      return { error: error.message || 'Google sign in failed' };
    }
  },

  /**
   * Helper to handle authenticated user after OAuth
   */
  async handleAuthenticatedUser(userId: string, role: UserRole): Promise<ApiResponse<AuthProfile>> {
    const roleResult = await profileService.getUserRole(userId);

    if (roleResult.data?.profile) {
      if (roleResult.data.role === 'student') {
        await profileService.updateStudentLastLogin(userId);
      } else {
        await profileService.updateTeacherLastLogin(userId);
      }
      return { data: { ...roleResult.data.profile, role: roleResult.data.role } as AuthProfile };
    } else {
      // Get user data from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'User data not found' };
      }

      const fullName = user.user_metadata?.full_name || '';
      const nameParts = fullName.split(' ');

      const newProfile = {
        email: user.email || '',
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        profile_photo_url: user.user_metadata?.avatar_url || null,
      };

      if (role === 'student') {
        const { data: createdProfile, error: createError } = await profileService.createStudentProfile(userId, newProfile);
        if (createError) throw new Error(createError);
        return { data: { ...createdProfile, role: 'student' } as AuthProfile };
      } else {
        const { data: createdProfile, error: createError } = await profileService.createTeacherProfile(userId, newProfile);
        if (createError) throw new Error(createError);
        return { data: { ...createdProfile, role: 'teacher' } as AuthProfile };
      }
    }
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
      if (error) throw error;
      return { data: null };
    } catch (error: any) {
      return { error: error.message || 'Sign out failed' };
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
