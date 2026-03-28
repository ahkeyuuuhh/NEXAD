/**
 * Daily.co Video Consultation Service (Web-based)
 * Uses browser-based approach instead of native SDK
 */

import { ApiResponse } from '../types';

// Daily.co API Configuration
const DAILY_API_KEY = process.env.EXPO_PUBLIC_DAILY_API_KEY || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: {
    exp?: number;
    max_participants?: number;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
  };
}

interface CreateRoomOptions {
  expiresInHours?: number;
  maxParticipants?: number;
  enableChat?: boolean;
  enableScreenshare?: boolean;
}

class DailyService {
  /**
   * Create a new Daily.co room for consultation
   */
  async createRoom(options: CreateRoomOptions = {}): Promise<ApiResponse<DailyRoom>> {
    try {
      const {
        expiresInHours = 24,
        maxParticipants = 2,
        enableChat = true,
        enableScreenshare = false,
      } = options;

      // Calculate expiration time
      const expirationTime = Math.floor(Date.now() / 1000) + (expiresInHours * 3600);

      const response = await fetch(`${DAILY_API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            exp: expirationTime,
            max_participants: maxParticipants,
            enable_chat: enableChat,
            enable_screenshare: enableScreenshare,
            enable_recording: false,
            enable_knocking: false,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create room: ${response.statusText}`);
      }

      const room: DailyRoom = await response.json();
      console.log('Daily.co room created:', room.name);
      
      return { data: room };
    } catch (error: any) {
      console.error('Error creating Daily.co room:', error);
      return { error: error.message || 'Failed to create consultation room' };
    }
  }

  /**
   * Delete a Daily.co room
   */
  async deleteRoom(roomName: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete room: ${response.statusText}`);
      }

      console.log('Daily.co room deleted:', roomName);
      return { data: true };
    } catch (error: any) {
      console.error('Error deleting Daily.co room:', error);
      return { error: error.message || 'Failed to delete consultation room' };
    }
  }

  /**
   * Get room information
   */
  async getRoom(roomName: string): Promise<ApiResponse<DailyRoom>> {
    try {
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to get room: ${response.statusText}`);
      }

      const room: DailyRoom = await response.json();
      return { data: room };
    } catch (error: any) {
      console.error('Error getting Daily.co room:', error);
      return { error: error.message || 'Failed to get consultation room' };
    }
  }
}

export const dailyService = new DailyService();
