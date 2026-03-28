import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DailyIframe from '@daily-co/react-native-daily-js';
import { consultationService } from '../services/consultationService';
import { C, S, R } from '../config/theme';

interface VideoCallScreenProps {
  route: {
    params: {
      roomUrl: string;
      consultationId: string;
      userName: string;
      isHost: boolean;
    };
  };
  navigation: any;
}

export default function VideoCallScreen({ route, navigation }: VideoCallScreenProps) {
  const { roomUrl, consultationId, userName, isHost } = route.params;
  
  const [callObject, setCallObject] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    joinCall();
    
    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, []);

  const joinCall = async () => {
    try {
      console.log('Joining call:', roomUrl);
      
      // Create Daily call object
      const daily = DailyIframe.createCallObject();
      setCallObject(daily);

      // Set up event listeners
      daily
        .on('joined-meeting', handleJoinedMeeting)
        .on('participant-joined', handleParticipantJoined)
        .on('participant-left', handleParticipantLeft)
        .on('error', handleError)
        .on('left-meeting', handleLeftMeeting);

      // Join the meeting
      await daily.join({
        url: roomUrl,
        userName: userName,
      });

    } catch (err: any) {
      console.error('Error joining call:', err);
      setError(err.message || 'Failed to join call');
      setIsJoining(false);
    }
  };

  const handleJoinedMeeting = (event: any) => {
    console.log('Joined meeting successfully');
    setIsJoining(false);
    updateParticipants();
  };

  const handleParticipantJoined = (event: any) => {
    console.log('Participant joined:', event.participant.user_name);
    updateParticipants();
  };

  const handleParticipantLeft = (event: any) => {
    console.log('Participant left:', event.participant.user_name);
    updateParticipants();
  };

  const handleError = (event: any) => {
    console.error('Call error:', event);
    setError(event.errorMsg || 'An error occurred');
  };

  const handleLeftMeeting = () => {
    console.log('Left meeting');
    navigation.goBack();
  };

  const updateParticipants = () => {
    if (callObject) {
      const parts = callObject.participants();
      setParticipants(Object.values(parts));
    }
  };

  const toggleCamera = async () => {
    if (callObject) {
      await callObject.setLocalVideo(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = async () => {
    if (callObject) {
      await callObject.setLocalAudio(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const leaveCall = () => {
    Alert.alert(
      'Leave Consultation',
      'Are you sure you want to leave this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (callObject) {
              await callObject.leave();
            }
            
            // End consultation if host
            if (isHost) {
              await consultationService.endConsultation(consultationId);
            }
            
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isJoining) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.action} />
          <Text style={styles.loadingText}>Joining consultation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Video Container - Daily.co handles video rendering internally */}
      <View style={styles.videoContainer}>
        <View style={styles.participantInfo}>
          <Text style={styles.participantCount}>
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          {/* Toggle Camera */}
          <TouchableOpacity
            style={[styles.controlButton, !isCameraOn && styles.controlButtonOff]}
            onPress={toggleCamera}
          >
            <Ionicons
              name={isCameraOn ? 'videocam' : 'videocam-off'}
              size={28}
              color="#FFF"
            />
          </TouchableOpacity>

          {/* Toggle Mic */}
          <TouchableOpacity
            style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
            onPress={toggleMic}
          >
            <Ionicons
              name={isMicOn ? 'mic' : 'mic-off'}
              size={28}
              color="#FFF"
            />
          </TouchableOpacity>

          {/* Leave Call */}
          <TouchableOpacity
            style={[styles.controlButton, styles.leaveButton]}
            onPress={leaveCall}
          >
            <Ionicons name="call" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  participantInfo: {
    position: 'absolute',
    top: S.lg,
    left: S.lg,
    right: S.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: S.sm,
    borderRadius: R.md,
  },
  participantCount: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlsContainer: {
    backgroundColor: '#000',
    paddingVertical: S.xl,
    paddingHorizontal: S.lg,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S.lg,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: R.full,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonOff: {
    backgroundColor: '#EF4444',
  },
  leaveButton: {
    backgroundColor: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: S.lg,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xl,
    backgroundColor: '#000',
  },
  errorTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: S.xl,
  },
  retryButton: {
    backgroundColor: C.action,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.full,
  },
  retryButtonText: {
    color: C.actionText,
    fontSize: 16,
    fontWeight: '600',
  },
});
