import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { authService, AuthProfile } from '../services/authService';
import { profileService } from '../services/profileService';
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

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // Use profileService to get the user's role and profile
      const result = await profileService.getUserRole(userId);
      
      if (result.error || !result.data || !result.data.role || !result.data.profile) {
        console.log('No profile found for user:', userId);
        setUser(null);
        return;
      }

      // Combine profile with role
      const userProfile = {
        ...result.data.profile,
        role: result.data.role as UserRole,
      } as AuthProfile;
      
      console.log('Loaded user profile:', userProfile.email, 'Role:', userProfile.role);
      setUser(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
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
    try {
      const result = await authService.signInWithGoogle(role);
      if (result.error) return { error: result.error };
      if (result.data) {
        setUser(result.data);
      }
      return {};
    } catch (error: any) {
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