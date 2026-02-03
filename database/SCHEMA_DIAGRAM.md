# NEXAD Database Schema Diagram

## Visual Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXAD DATABASE SCHEMA                       │
│                   AI-Enhanced Consultation System                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION & USERS                        │
└─────────────────────────────────────────────────────────────────────┘

            ┌───────────────────────────┐
            │        users              │
            ├───────────────────────────┤
            │ PK id (UUID)              │
            │    email                  │
            │    password_hash          │
            │    role (enum)            │──┐ student / teacher / admin
            │    first_name             │  │
            │    last_name              │  │
            │    department             │  │
            │    profile_photo_url      │  │
            │ -- Teacher fields:        │  │
            │    expertise_tags[]       │  │
            │    office_hours           │  │
            │    bio                    │  │
            │ -- Student fields:        │  │
            │    student_id             │  │
            │    year_level             │  │
            │    created_at             │  │
            │    is_active              │  │
            └───────────────────────────┘  │
                    │         │             │
                    │         │             │
        ┌───────────┘         └─────────────┼──────────┐
        │ teacher               student     │          │
        │                                   │          │
        ▼                                   ▼          │

┌─────────────────────────────────────────────────────────────────────┐
│                    CONSULTATION SYSTEM                              │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐          ┌──────────────────────────┐
│  consultation_requests         │          │   ai_smart_briefs        │
├────────────────────────────────┤          ├──────────────────────────┤
│ PK id                          │          │ PK id                    │
│ FK student_id  ─────────────┐  │          │ FK consultation_req_id ─┐│
│ FK teacher_id  ───────────┐ │  │◄─────────│    summary               ││
│    topic (enum)           │ │  │   1:1    │    key_points[]          ││
│    subject_line           │ │  │          │    student_concerns[]    ││
│    description            │ │  │          │    document_summaries    ││
│    urgency (enum)         │ │  │          │    ai_model_version      ││
│    status (enum) ─────────┼─┤  │          │    confidence_score      ││
│    ai_extracted_keywords  │ │  │          │    generated_at          ││
│    ai_clarification_qs    │ │  │          └──────────────────────────┘│
│    preferred_time_slots   │ │  │                                       │
│    scheduled_start_time   │ │  │                                       │
│    scheduled_end_time     │ │  │                                       │
│    submitted_at           │ │  │                                       │
│    teacher_notes          │ │  │                                       │
└────────────────────────────────┘│                                      │
         │                         │                                      │
         │                         │                                      │
         ▼                         │                                      │
┌────────────────────────────────┐│                                      │
│   uploaded_documents           ││                                      │
├────────────────────────────────┤│                                      │
│ PK id                          ││                                      │
│ FK consultation_request_id  ───┘│                                      │
│ FK attachment_bin_id  ──────────┼──────────┐                           │
│    file_name                    │          │                           │
│    file_type (pdf/docx)         │          │                           │
│    file_size_bytes              │          │                           │
│    storage_path                 │          │                           │
│    extracted_text               │          │                           │
│    text_extraction_success      │          │                           │
│    uploaded_by                  │          │                           │
│    uploaded_at                  │          │                           │
└─────────────────────────────────┘          │                           │
                                              │                           │
┌─────────────────────────────────────────────────────────────────────┐ │
│                      CLASSROOM HUB SYSTEM                           │ │
└─────────────────────────────────────────────────────────────────────┘ │
                                                                         │
┌───────────────────────────┐                                           │
│     classrooms            │                                           │
├───────────────────────────┤                                           │
│ PK id                     │                                           │
│ FK teacher_id  ───────────┼───┐  (back to users table)               │
│    name                   │   │                                       │
│    description            │   │                                       │
│    invite_code (6-digit)  │◄──┼─── Auto-generated                    │
│    is_active              │   │                                       │
│    max_members            │   │                                       │
│    created_at             │   │                                       │
└───────────────────────────┘   │                                       │
         │         │             │                                       │
         │         │             │                                       │
    ┌────┘         └────┐        │                                       │
    │                   │        │                                       │
    ▼                   ▼        │                                       │
┌────────────────┐  ┌────────────────────┐                              │
│ announcements  │  │ attachment_bins    │                              │
├────────────────┤  ├────────────────────┤                              │
│ PK id          │  │ PK id              │──────────────────────────────┘
│ FK classroom_id│  │ FK classroom_id    │
│ FK teacher_id  │  │ FK teacher_id      │
│    title       │  │    title           │
│    content     │  │    description     │
│    is_pinned   │  │    deadline        │
│    created_at  │  │    allowed_types[] │
└────────────────┘  │    max_file_size   │
                    │    is_active       │
                    │    require_ai      │
                    └────────────────────┘
         │
         │
         ▼
┌─────────────────────────┐
│ classroom_memberships   │
├─────────────────────────┤
│ PK id                   │
│ FK classroom_id         │
│ FK student_id  ─────────┼───┐  (to users)
│    joined_at            │   │
│    is_active            │   │
└─────────────────────────┘   │
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                  MESSAGING & NOTIFICATIONS                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐        ┌────────────────────────┐
│      messages            │        │    notifications       │
├──────────────────────────┤        ├────────────────────────┤
│ PK id                    │        │ PK id                  │
│ FK sender_id  ───────────┼───┐    │ FK user_id  ───────────┼───┐
│ FK recipient_id  ────────┼───┼──┐ │    type (enum)         │   │
│    message_type (enum)   │   │  │ │    title               │   │
│    consultation_req_id   │   │  │ │    message             │   │
│    announcement_id       │   │  │ │    consultation_req_id │   │
│    content               │   │  │ │    classroom_id        │   │
│    attached_file_ids[]   │   │  │ │    action_url          │   │
│    is_read               │   │  │ │    is_read             │   │
│    read_at               │   │  │ │    read_at             │   │
│    created_at            │   │  │ │    created_at          │   │
└──────────────────────────┘   │  │ └────────────────────────┘   │
                               │  │                              │
┌──────────────────────────┐   │  │ ┌────────────────────────┐   │
│     push_tokens          │   │  │ │ consultation_history   │   │
├──────────────────────────┤   │  │ ├────────────────────────┤   │
│ PK id                    │   │  └─│ PK id                  │   │
│ FK user_id  ─────────────┼───┘    │ FK consultation_req_id │   │
│    token (Expo)          │        │    teacher_notes       │   │
│    device_name           │        │    shared_resources    │   │
│    device_os             │        │    student_feedback    │   │
│    last_used_at          │        │    archived_at         │   │
│    is_active             │        └────────────────────────┘   │
└──────────────────────────┘                                     │
                                                                 │
            All connections point back to users table  ─────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         KEY RELATIONSHIPS                           │
└─────────────────────────────────────────────────────────────────────┘

Student → consultation_requests (1:many)
Teacher → consultation_requests (1:many)
consultation_requests → ai_smart_briefs (1:1)
consultation_requests → uploaded_documents (1:many)
attachment_bins → uploaded_documents (1:many)

Teacher → classrooms (1:many)
classrooms → classroom_memberships (1:many)
Student → classroom_memberships (1:many)
classrooms → announcements (1:many)
classrooms → attachment_bins (1:many)

User → messages (sender: 1:many)
User → messages (recipient: 1:many)
User → notifications (1:many)
User → push_tokens (1:many)

┌─────────────────────────────────────────────────────────────────────┐
│                         ENUM TYPES                                  │
└─────────────────────────────────────────────────────────────────────┘

user_role:              student | teacher | admin

consultation_status:    pending | ai_processing | awaiting_teacher |
                       accepted | declined | completed | cancelled

consultation_topic:     academic | career | personal | administrative |
                       research | mental_health

urgency_level:         normal | urgent

notification_type:     request_submitted | request_accepted |
                       request_declined | consultation_reminder |
                       new_message | classroom_announcement |
                       attachment_bin_created | document_uploaded |
                       ai_brief_ready

message_type:          consultation_chat | announcement_reply |
                       teacher_inquiry

┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY & PERFORMANCE                           │
└─────────────────────────────────────────────────────────────────────┘

🔒 Row Level Security (RLS):
   - All tables have RLS enabled
   - Students see only their own data
   - Teachers see assigned consultations
   - Admins have elevated access

⚡ Performance Indexes:
   - 15+ indexes on frequently queried columns
   - Composite indexes on (user_id, is_read) for notifications
   - Covering indexes for consultation queries

📊 Analytics Views:
   - consultation_requests_by_department
   - popular_consultation_topics
   - teacher_performance_metrics

┌─────────────────────────────────────────────────────────────────────┐
│                      DATA FLOW EXAMPLE                              │
└─────────────────────────────────────────────────────────────────────┘

Student submits consultation request:
  1. INSERT into consultation_requests
  2. AI processes request → UPDATE with extracted keywords
  3. Student uploads documents → INSERT into uploaded_documents
  4. AI extracts text → UPDATE document.extracted_text
  5. AI generates brief → INSERT into ai_smart_briefs
  6. Teacher notified → INSERT into notifications
  7. Teacher reviews → UPDATE consultation_requests.status = 'accepted'
  8. System sends confirmation → INSERT into notifications
  9. Consultation occurs → UPDATE status = 'completed'
  10. Archive → INSERT into consultation_history

Teacher creates classroom:
  1. INSERT into classrooms (invite_code auto-generated)
  2. Teacher posts announcement → INSERT into announcements
  3. Students join with code → INSERT into classroom_memberships
  4. Teacher creates attachment bin → INSERT into attachment_bins
  5. Students upload files → INSERT into uploaded_documents
  6. AI processes submissions → UPDATE documents, INSERT briefs

┌─────────────────────────────────────────────────────────────────────┐
│                      STORAGE STRUCTURE                              │
└─────────────────────────────────────────────────────────────────────┘

Supabase Storage Bucket: consultation-documents
├── documents/
│   ├── {timestamp}_{random}.pdf
│   ├── {timestamp}_{random}.docx
│   └── ...
└── profile-photos/
    ├── {user_id}.jpg
    └── ...

Access Control:
- Authenticated users can upload to documents/
- Users can read their own documents
- Teachers can read student documents for their consultations
- RLS enforced at bucket policy level

┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE STATISTICS                               │
└─────────────────────────────────────────────────────────────────────┘

Total Tables:        12
Total Columns:       ~150
Total Indexes:       15+
Custom Functions:    3
Triggers:           4
Views:              3
Enums:              6
RLS Policies:       20+
Seed Records:       7 (3 teachers, 3 students, 1 admin)

┌─────────────────────────────────────────────────────────────────────┐
│                 DEPLOYMENT INFORMATION                              │
└─────────────────────────────────────────────────────────────────────┘

Platform:           Supabase (PostgreSQL 15)
Connection:         Via Supabase Client SDK
Authentication:     Supabase Auth (JWT)
Storage:            Supabase Storage (S3-compatible)
Realtime:           Supabase Realtime subscriptions available
Backup:             Automatic daily backups (Pro tier)
Monitoring:         Supabase Dashboard

Free Tier Limits:
- 500MB Database size
- 1GB File storage
- 2GB Bandwidth
- 50,000 Monthly Active Users
```

---

## Quick Reference

### Most Used Queries

```sql
-- Get student's consultations
SELECT * FROM consultation_requests 
WHERE student_id = '{user_id}' 
ORDER BY created_at DESC;

-- Get teacher's pending requests
SELECT * FROM consultation_requests 
WHERE teacher_id = '{user_id}' AND status = 'awaiting_teacher'
ORDER BY urgency DESC, submitted_at ASC;

-- Get classroom with member count
SELECT c.*, COUNT(cm.id) as member_count
FROM classrooms c
LEFT JOIN classroom_memberships cm ON c.id = cm.classroom_id
WHERE c.id = '{classroom_id}'
GROUP BY c.id;

-- Get unread notifications
SELECT * FROM notifications 
WHERE user_id = '{user_id}' AND is_read = false
ORDER BY created_at DESC;
```

### Common Operations

1. **Creating a consultation:** `consultation_requests` → `uploaded_documents` → `ai_smart_briefs`
2. **Joining classroom:** Find by `invite_code` → Insert `classroom_memberships`
3. **Sending message:** Insert `messages` → Insert `notifications` for recipient
4. **Completing consultation:** Update status → Insert `consultation_history`

---

*For implementation details, see [schema.sql](schema.sql)*  
*For setup instructions, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)*
