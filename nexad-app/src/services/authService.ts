import { supabase } from '../config/supabase';
import type { User, ApiResponse } from '../types';

export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) throw userError;

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      return { data: userData };
    } catch (error: any) {
      return { error: error.message || 'Sign in failed' };
    }
  },

  /**
   * Sign up new user
   */
  async signUp(
    email: string,
    password: string,
    userData: Partial<User>
  ): Promise<ApiResponse<User>> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          ...userData,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return { data: profileData };
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
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { error: 'No active session' };
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      return { data: userData };
    } catch (error: any) {
      return { error: error.message || 'Failed to get current user' };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Profile update failed' };
    }
  },
};
