import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to forcefully clear corrupted session data from AsyncStorage
export const clearSupabaseSession = async (): Promise<void> => {
  try {
    // Get all keys from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    // Find and remove all Supabase-related keys
    const supabaseKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('sb-') ||
      key.includes('auth-token')
    );
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('Cleared Supabase session keys:', supabaseKeys);
    }
  } catch (error) {
    console.error('Error clearing Supabase session:', error);
  }
};

// Database types will be generated from Supabase CLI
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'student' | 'teacher' | 'admin';
          first_name: string;
          last_name: string;
          department: string | null;
          profile_photo_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      consultation_requests: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          topic: 'academic' | 'career' | 'personal' | 'administrative' | 'research' | 'mental_health';
          subject_line: string;
          description: string;
          status: 'pending' | 'ai_processing' | 'awaiting_teacher' | 'accepted' | 'declined' | 'completed' | 'cancelled';
          urgency: 'normal' | 'urgent';
          scheduled_start_time: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consultation_requests']['Row'], 'id' | 'created_at' | 'status'>;
        Update: Partial<Database['public']['Tables']['consultation_requests']['Insert']>;
      };
      // Add more table types as needed
    };
  };
};
