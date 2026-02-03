import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import type { ApiResponse } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<ApiResponse<boolean>> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { error: 'Notification permissions not granted' };
      }

      return { data: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to request permissions' };
    }
  },

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(userId: string): Promise<ApiResponse<string>> {
    try {
      // Request permissions first
      const permissionResult = await this.requestPermissions();
      if (permissionResult.error) {
        return { error: permissionResult.error };
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });

      const token = tokenData.data;

      // Save token to database
      const { error } = await supabase.from('push_tokens').upsert({
        user_id: userId,
        token,
        device_name: Platform.OS,
        device_os: Platform.OS,
        last_used_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      return { data: token };
    } catch (error: any) {
      return { error: error.message || 'Failed to register for push notifications' };
    }
  },

  /**
   * Send local notification
   */
  async sendLocalNotification(title: string, body: string, data?: any): Promise<ApiResponse<string>> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });

      return { data: notificationId };
    } catch (error: any) {
      return { error: error.message || 'Failed to send notification' };
    }
  },

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
  ): Promise<ApiResponse<string>> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: triggerDate,
      });

      return { data: notificationId };
    } catch (error: any) {
      return { error: error.message || 'Failed to schedule notification' };
    }
  },

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<ApiResponse<null>> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return { data: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to cancel notification' };
    }
  },

  /**
   * Get user notifications from database
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch notifications' };
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      return { data: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to mark notification as read' };
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return { data: count || 0 };
    } catch (error: any) {
      return { error: error.message || 'Failed to get unread count' };
    }
  },
};
