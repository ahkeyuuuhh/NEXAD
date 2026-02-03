// NEXAD Type Definitions

export type UserRole = 'student' | 'teacher' | 'admin';

export type ConsultationStatus = 
  | 'pending'
  | 'ai_processing'
  | 'awaiting_teacher'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';

export type ConsultationTopic = 
  | 'academic'
  | 'career'
  | 'personal'
  | 'administrative'
  | 'research'
  | 'mental_health';

export type UrgencyLevel = 'normal' | 'urgent';

export type NotificationType =
  | 'request_submitted'
  | 'request_accepted'
  | 'request_declined'
  | 'consultation_reminder'
  | 'new_message'
  | 'classroom_announcement'
  | 'attachment_bin_created'
  | 'document_uploaded'
  | 'ai_brief_ready';

export type MessageType = 
  | 'consultation_chat'
  | 'announcement_reply'
  | 'teacher_inquiry';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  profile_photo_url?: string;
  
  // Teacher-specific
  expertise_tags?: string[];
  office_hours?: string;
  bio?: string;
  average_response_time_hours?: number;
  
  // Student-specific
  student_id?: string;
  year_level?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface ConsultationRequest {
  id: string;
  student_id: string;
  teacher_id: string;
  topic: ConsultationTopic;
  subject_line: string;
  description: string;
  urgency: UrgencyLevel;
  status: ConsultationStatus;
  
  // AI fields
  ai_extracted_keywords?: string[];
  ai_clarification_questions?: string[];
  ai_suggested_documents?: string[];
  
  // Scheduling
  preferred_time_slots?: TimeSlot[];
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  
  // Timestamps
  submitted_at: string;
  ai_processed_at?: string;
  teacher_reviewed_at?: string;
  completed_at?: string;
  
  // Relations
  student?: User;
  teacher?: User;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface AISmartBrief {
  id: string;
  consultation_request_id: string;
  summary: string;
  key_points: string[];
  student_concerns: string[];
  document_summaries?: DocumentSummary[];
  consultation_history_pattern?: string;
  suggested_prep_materials?: string[];
  estimated_consultation_duration_minutes?: number;
  
  // Metadata
  ai_model_version: string;
  processing_time_seconds?: number;
  confidence_score?: number;
  generated_at: string;
}

export interface DocumentSummary {
  file_name: string;
  summary: string;
  page_references: number[];
}

export interface UploadedDocument {
  id: string;
  consultation_request_id?: string;
  attachment_bin_id?: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  file_size_bytes: number;
  storage_path: string;
  extracted_text?: string;
  text_extraction_success: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  invite_code: string;
  is_active: boolean;
  max_members: number;
  created_at: string;
  
  // Relations
  teacher?: User;
  member_count?: number;
}

export interface ClassroomMembership {
  id: string;
  classroom_id: string;
  student_id: string;
  joined_at: string;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  teacher?: User;
}

export interface AttachmentBin {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  deadline?: string;
  allowed_file_types: string[];
  max_file_size_mb: number;
  is_active: boolean;
  require_ai_analysis: boolean;
  created_at: string;
  
  // Relations
  submission_count?: number;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_type: MessageType;
  consultation_request_id?: string;
  announcement_id?: string;
  content: string;
  attached_file_ids?: string[];
  is_read: boolean;
  read_at?: string;
  created_at: string;
  
  // Relations
  sender?: User;
  recipient?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  consultation_request_id?: string;
  classroom_id?: string;
  announcement_id?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface ConsultationHistory {
  id: string;
  consultation_request_id: string;
  teacher_final_notes?: string;
  shared_resources?: SharedResource[];
  student_feedback_rating?: number;
  student_feedback_text?: string;
  archived_at: string;
}

export interface SharedResource {
  name: string;
  url: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
