# NEXAD Database Schema Documentation

## Overview
This document describes the database schema for the NEXAD (Next-Generation Academic Assistance Dashboard) AI-Enhanced Consultation System.

**Database Type:** PostgreSQL (via Supabase)  
**Schema Version:** 1.0.0  
**Last Updated:** February 3, 2026

---

## Table of Contents
1. [Entity Relationship Overview](#entity-relationship-overview)
2. [Core Tables](#core-tables)
3. [Enums](#enums)
4. [Indexes](#indexes)
5. [Row Level Security](#row-level-security)
6. [Views](#views)
7. [Functions & Triggers](#functions--triggers)

---

## Entity Relationship Overview

### Key Relationships

```
users (student) ─────┐
                     │
                     ├──► consultation_requests ──► ai_smart_briefs
                     │            │
users (teacher) ─────┘            ├──► uploaded_documents
                                  │
                                  └──► messages

users (teacher) ──► classrooms ──► classroom_memberships ──► users (student)
                         │
                         ├──► announcements
                         │
                         └──► attachment_bins ──► uploaded_documents

users ──► notifications
users ──► push_tokens
```

---

## Core Tables

### 1. `users`
**Purpose:** Stores all user accounts (students, teachers, admins)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR(255) | Unique email address |
| `password_hash` | VARCHAR(255) | Hashed password |
| `role` | user_role | One of: student, teacher, admin |
| `first_name` | VARCHAR(100) | User's first name |
| `last_name` | VARCHAR(100) | User's last name |
| `phone` | VARCHAR(20) | Optional phone number |
| `department` | VARCHAR(100) | Academic department |
| `profile_photo_url` | TEXT | URL to profile picture |
| `expertise_tags` | TEXT[] | Teacher only: expertise areas |
| `office_hours` | TEXT | Teacher only: available hours |
| `bio` | TEXT | Teacher only: biography |
| `average_response_time_hours` | INTEGER | Teacher only: avg response time |
| `student_id` | VARCHAR(50) | Student only: student ID |
| `year_level` | INTEGER | Student only: academic year |
| `notification_preferences` | JSONB | Notification settings |
| `timezone` | VARCHAR(50) | User's timezone |
| `created_at` | TIMESTAMPTZ | Account creation date |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `last_login` | TIMESTAMPTZ | Last login timestamp |
| `is_active` | BOOLEAN | Account active status |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_role` on `role`
- `idx_users_department` on `department`

---

### 2. `consultation_requests`
**Purpose:** Stores all consultation booking requests

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to users |
| `teacher_id` | UUID | FK to users |
| `topic` | consultation_topic | Type of consultation |
| `subject_line` | VARCHAR(200) | Brief subject |
| `description` | TEXT | Detailed description |
| `urgency` | urgency_level | normal or urgent |
| `status` | consultation_status | Current status |
| `ai_extracted_keywords` | TEXT[] | AI-generated keywords |
| `ai_clarification_questions` | TEXT[] | AI-generated questions |
| `ai_suggested_documents` | TEXT[] | AI document suggestions |
| `preferred_time_slots` | JSONB | Student's preferred times |
| `scheduled_start_time` | TIMESTAMPTZ | Scheduled start |
| `scheduled_end_time` | TIMESTAMPTZ | Scheduled end |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp |
| `ai_processed_at` | TIMESTAMPTZ | AI processing timestamp |
| `teacher_reviewed_at` | TIMESTAMPTZ | Teacher review timestamp |
| `completed_at` | TIMESTAMPTZ | Completion timestamp |
| `teacher_notes` | TEXT | Teacher's notes |
| `decline_reason` | TEXT | Reason if declined |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_consultation_student` on `student_id`
- `idx_consultation_teacher` on `teacher_id`
- `idx_consultation_status` on `status`
- `idx_consultation_scheduled_time` on `scheduled_start_time`

---

### 3. `ai_smart_briefs`
**Purpose:** Stores AI-generated consultation briefings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `consultation_request_id` | UUID | FK to consultation_requests (unique) |
| `summary` | TEXT | Overall summary |
| `key_points` | TEXT[] | Key discussion points |
| `student_concerns` | TEXT[] | Identified concerns |
| `document_summaries` | JSONB | Summaries of uploaded docs |
| `consultation_history_pattern` | TEXT | Pattern from history |
| `suggested_prep_materials` | TEXT[] | Suggested materials |
| `estimated_consultation_duration_minutes` | INTEGER | Estimated duration |
| `ai_model_version` | VARCHAR(50) | AI model used |
| `processing_time_seconds` | INTEGER | Processing duration |
| `confidence_score` | DECIMAL(3,2) | Confidence score (0-1) |
| `generated_at` | TIMESTAMPTZ | Generation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

---

### 4. `uploaded_documents`
**Purpose:** Tracks all uploaded files

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `consultation_request_id` | UUID | FK to consultation_requests (optional) |
| `attachment_bin_id` | UUID | FK to attachment_bins (optional) |
| `file_name` | VARCHAR(255) | Original filename |
| `file_type` | VARCHAR(10) | pdf or docx |
| `file_size_bytes` | BIGINT | File size in bytes |
| `storage_path` | TEXT | Supabase storage path |
| `extracted_text` | TEXT | AI-extracted text content |
| `text_extraction_success` | BOOLEAN | Extraction success flag |
| `extraction_error` | TEXT | Error message if failed |
| `uploaded_by` | UUID | FK to users |
| `uploaded_at` | TIMESTAMPTZ | Upload timestamp |
| `is_deleted` | BOOLEAN | Soft delete flag |

**Indexes:**
- `idx_documents_consultation` on `consultation_request_id`
- `idx_documents_attachment_bin` on `attachment_bin_id`

---

### 5. `classrooms`
**Purpose:** Virtual classrooms for group management

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `teacher_id` | UUID | FK to users |
| `name` | VARCHAR(200) | Classroom name |
| `description` | TEXT | Description |
| `invite_code` | VARCHAR(6) | Unique 6-digit code |
| `is_active` | BOOLEAN | Active status |
| `max_members` | INTEGER | Maximum members (default 100) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_classroom_teacher` on `teacher_id`
- `idx_classroom_invite_code` on `invite_code`

---

### 6. `classroom_memberships`
**Purpose:** Links students to classrooms

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `classroom_id` | UUID | FK to classrooms |
| `student_id` | UUID | FK to users |
| `joined_at` | TIMESTAMPTZ | Join timestamp |
| `is_active` | BOOLEAN | Active membership flag |

**Constraints:**
- Unique constraint on `(classroom_id, student_id)`

**Indexes:**
- `idx_membership_classroom` on `classroom_id`
- `idx_membership_student` on `student_id`

---

### 7. `announcements`
**Purpose:** Teacher announcements in classrooms

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `classroom_id` | UUID | FK to classrooms |
| `teacher_id` | UUID | FK to users |
| `title` | VARCHAR(200) | Announcement title |
| `content` | TEXT | Announcement content |
| `is_pinned` | BOOLEAN | Pin to top flag |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

---

### 8. `attachment_bins`
**Purpose:** Document collection areas in classrooms

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `classroom_id` | UUID | FK to classrooms |
| `teacher_id` | UUID | FK to users |
| `title` | VARCHAR(200) | Bin title |
| `description` | TEXT | Bin description |
| `deadline` | TIMESTAMPTZ | Submission deadline |
| `allowed_file_types` | VARCHAR(50)[] | Allowed file extensions |
| `max_file_size_mb` | INTEGER | Max file size (default 10) |
| `is_active` | BOOLEAN | Active status |
| `require_ai_analysis` | BOOLEAN | Require AI processing |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

---

### 9. `messages`
**Purpose:** Unified messaging system

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `sender_id` | UUID | FK to users |
| `recipient_id` | UUID | FK to users |
| `message_type` | message_type | Type of message |
| `consultation_request_id` | UUID | FK to consultation_requests (optional) |
| `announcement_id` | UUID | FK to announcements (optional) |
| `content` | TEXT | Message content |
| `attached_file_ids` | UUID[] | Attached document IDs |
| `is_read` | BOOLEAN | Read status |
| `read_at` | TIMESTAMPTZ | Read timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_messages_sender` on `sender_id`
- `idx_messages_recipient` on `recipient_id`
- `idx_messages_consultation` on `consultation_request_id`
- `idx_messages_created` on `created_at DESC`

---

### 10. `notifications`
**Purpose:** In-app notifications

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `type` | notification_type | Notification type |
| `title` | VARCHAR(200) | Notification title |
| `message` | TEXT | Notification message |
| `consultation_request_id` | UUID | Related consultation (optional) |
| `classroom_id` | UUID | Related classroom (optional) |
| `announcement_id` | UUID | Related announcement (optional) |
| `action_url` | TEXT | Deep link URL |
| `is_read` | BOOLEAN | Read status |
| `read_at` | TIMESTAMPTZ | Read timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_notifications_user` on `user_id`
- `idx_notifications_unread` on `(user_id, is_read)` WHERE `is_read = false`
- `idx_notifications_created` on `created_at DESC`

---

## Enums

### `user_role`
- `student`
- `teacher`
- `admin`

### `consultation_status`
- `pending` - Initial submission
- `ai_processing` - AI analyzing documents
- `awaiting_teacher` - Ready for teacher review
- `accepted` - Teacher accepted
- `declined` - Teacher declined
- `completed` - Consultation finished
- `cancelled` - Cancelled by student

### `consultation_topic`
- `academic`
- `career`
- `personal`
- `administrative`
- `research`
- `mental_health`

### `urgency_level`
- `normal`
- `urgent`

### `notification_type`
- `request_submitted`
- `request_accepted`
- `request_declined`
- `consultation_reminder`
- `new_message`
- `classroom_announcement`
- `attachment_bin_created`
- `document_uploaded`
- `ai_brief_ready`

### `message_type`
- `consultation_chat`
- `announcement_reply`
- `teacher_inquiry`

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### Users
- Users can view their own profile
- Users can view all teacher profiles
- Users can update their own profile

### Consultation Requests
- Students can view their own requests
- Teachers can view requests assigned to them
- Students can create new requests
- Teachers can update assigned requests

### Messages
- Users can view messages they sent or received
- Users can send messages
- Recipients can mark messages as read

### Classrooms
- Teachers manage their own classrooms
- Students view classrooms they've joined

---

## Views

### `consultation_requests_by_department`
Aggregates consultation requests by department with metrics.

### `popular_consultation_topics`
Shows most requested topics with completion stats.

### `teacher_performance_metrics`
Calculates teacher response times and completion rates.

---

## Functions & Triggers

### `update_updated_at_column()`
Automatically updates `updated_at` timestamp on row updates.

### `generate_invite_code()`
Generates random 6-digit alphanumeric codes for classrooms.

### `set_classroom_invite_code()`
Trigger to auto-generate unique invite codes on classroom creation.

---

## Seed Data

The schema includes demo accounts:
- **Admin:** admin@university.edu (password: admin123)
- **Teachers:** 
  - prof.santos@university.edu
  - dr.chen@university.edu
  - prof.williams@university.edu
- **Students:**
  - john.doe@student.edu
  - jane.smith@student.edu
  - mike.johnson@student.edu

**Note:** All demo passwords use `crypt()` function. In production, use application-layer hashing.

---

## Setup Instructions

1. **Create Supabase Project**
   - Sign up at https://supabase.com
   - Create a new project

2. **Run Schema**
   ```sql
   -- Execute the schema.sql file in Supabase SQL Editor
   ```

3. **Create Storage Bucket**
   ```sql
   -- In Supabase Dashboard > Storage, create bucket:
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('consultation-documents', 'consultation-documents', false);
   ```

4. **Configure RLS for Storage**
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Users can upload documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'consultation-documents');
   
   -- Allow users to read their own documents
   CREATE POLICY "Users can read own documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'consultation-documents');
   ```

---

## Backup & Maintenance

### Regular Backups
Supabase provides automatic daily backups on paid plans. For free tier:
- Export schema regularly via SQL Editor
- Use `pg_dump` for full backups

### Recommended Indexes
All performance-critical indexes are included in the schema.

### Monitoring
Monitor these metrics:
- Query performance on `consultation_requests` table
- Storage usage in `consultation-documents` bucket
- RLS policy performance

---

## Future Enhancements

Potential schema additions:
1. **Ratings & Reviews:** Student feedback on consultations
2. **Recurring Consultations:** Support for repeating schedules
3. **Group Consultations:** Multiple students per consultation
4. **Video Call Integration:** Store meeting URLs and recordings
5. **Advanced Analytics:** Materialized views for dashboards

---

**End of Database Schema Documentation**
