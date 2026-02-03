# NEXAD - FINAL PROJECT PLAN
## AI-Enhanced Consultation System

**Project Type:** React Native Hybrid Framework (iOS + Android + Web)
**Timeline:** 4-6 weeks (School Project)
**Budget:** Free tier services only

---

## 🎯 CORE USER FLOWS

### Primary Flow: Student Requests Consultation
1. Student searches for teacher → Views profile → Requests consultation
2. AI analyzes request & prompts for clarity → Student uploads relevant files
3. AI generates Smart Brief → Teacher receives notification
4. Teacher reviews AI Brief → Accepts/Declines with time slot
5. Student receives confirmation → Both parties receive reminders
6. Consultation occurs → Teacher marks complete → Files archived

### Secondary Flow: Classroom Hub Workflow
1. Teacher creates classroom → Generates invite code → Posts requirements
2. Students join via invite code → View announcements & requirements
3. Teacher creates Attachment Bin (pre-consultation prep area)
4. Students upload drafts to Attachment Bin → AI pre-processes materials
5. Teacher receives AI Smart Brief on all submissions → Reviews before class
6. Resources remain accessible in student's Resource Library

---

## 📱 FEATURES BY USER ROLE

### 🎓 STUDENT INTERFACE

#### **1. Authentication & Onboarding**
- [ ] **SSO Login:** School credentials with auto-role detection (Student/Teacher/Admin)
- [ ] **First-Time Setup Wizard:** Profile completion, timezone, notification preferences
- [ ] **Profile Management:** Edit contact info, academic interests, consultation history visibility

#### **2. Dashboard (Home)**
- [ ] **Upcoming Consultations Panel:**
  - Action cards showing date, time, teacher, and topic
  - "Add to Calendar" button (iCal/Google Calendar export)
  - Color-coded "Prep Status" (Red: Missing materials, Yellow: Partial, Green: Ready)
- [ ] **AI Prep-Check Widget:**
  - Smart reminders: *"Meeting with Prof. Santos tomorrow at 2 PM. Upload your thesis draft!"*
  - Checklist of required materials based on consultation topic
- [ ] **Recent Classroom Activity Feed:**
  - Latest announcements from joined classrooms
  - New Attachment Bin requests
- [ ] **Quick Actions:** "Request Consultation," "Join Classroom," "Browse Resources," "Messages"
- [ ] **Unread Message Indicator:** Badge showing number of unread messages from teachers or classrooms

#### **3. Teacher Directory**
- [ ] **Advanced Search & Filters:**
  - Filter by: Department, Expertise Tags (Research, Career, Mental Health), Availability
  - Sort by: Name, Rating (optional), Consultation Count
- [ ] **Teacher Profile Cards:**
  - Photo, name, department, office hours
  - "Areas of Expertise" tags
  - "Request Consultation" button
  - Average response time indicator

#### **4. AI-Powered Consultation Request Form**
- [ ] **Smart Request Builder:**
  - Topic selection dropdown (Academic, Career, Personal, Administrative)
  - Free-text area with **real-time AI analysis**
- [ ] **AI Preparation Assistant:**
  - As student types, AI identifies key concerns (e.g., "grade appeal," "thesis feedback")
  - **Dynamic Document Suggestions:** *"It looks like you're asking about a grade. Please upload the graded assignment and rubric."*
  - **Clarification Prompts:** AI asks 1-2 follow-up questions (*"Which specific section of your thesis needs review?"*)
- [ ] **File Upload Interface:**
  - Drag-and-drop for PDF/Docx files (max 10MB)
  - Preview thumbnails with remove option
  - Upload progress indicator
- [ ] **Preferred Time Slots:** Multi-select calendar picker
- [ ] **Urgency Level:** Optional (Normal/Urgent)

#### **5. Classroom Hub**
- [ ] **Join Classroom:** Enter 6-digit invite code
- [ ] **My Classrooms List:** Cards showing class name, teacher, member count
- [ ] **Classroom Detail View:**
  - **Announcements Tab:** Teacher posts with timestamps (e.g., "Mid-term prep resources available")
  - **Attachment Bins Tab:**
    - List of active bins (e.g., "Thesis Draft - Due Feb 15")
    - Upload interface for each bin (PDF/Docx only)
    - Submission status: Pending AI Review → Reviewed → Feedback Available
  - **Resources Tab:** Shared materials (lecture notes, templates)
  - **Members Tab:** List of classmates (names only, privacy-protected)
- [ ] **Offline Access:** Cached announcements and resources available offline (PWA)

#### **6. Consultation History & Resource Library**
- [ ] **Past Consultations Archive:**
  - Searchable list with date, teacher, topic
  - View consultation notes (if shared by teacher)
  - Re-download submitted files
- [ ] **AI Summary Vault:**
  - Access to all AI-generated prep summaries
  - "Related Consultations" suggestions
- [ ] **Shared Resources Collection:**
  - Files shared by teachers during consultations
  - Organized by subject/topic tags

#### **7. Messages & Communication**
- [ ] **Message Inbox:**
  - Unified inbox showing all conversations (consultation chats, teacher messages)
  - List view with teacher photo, name, last message preview, timestamp
  - Unread count badges per conversation
  - Search messages by teacher name or keyword
- [ ] **Consultation-Specific Chat:**
  - Direct messaging with teacher about an active or past consultation
  - Auto-created when consultation is confirmed
  - "View Prep-Kit" shortcut to access shared files and AI brief
  - Message history tied to consultation record (archived after consultation)
  - Share files directly in chat (PDF/Docx up to 5MB)
- [ ] **Classroom Messages:**
  - Receive announcements from teachers in classroom
  - Reply to announcements (visible to teacher only, not other students)
  - Thread view for announcement discussions
- [ ] **Message Composer:**
  - Text input with emoji support
  - File attachment button
  - Send button with loading state
  - Character counter (optional, for long messages)
- [ ] **Message Notifications:**
  - Push notification for new messages from teachers
  - In-app badge on Messages tab
  - Preview in notification (first 50 characters)

#### **8. Notifications & Settings**
- [ ] **Notification Center:**
  - Push notifications for: Request status, Upcoming meetings (2hr/24hr), New classroom posts, New messages
  - In-app notification history with read/unread status
- [ ] **Settings Panel:**
  - Toggle push notifications (Web Push API)
  - Email notification preferences
  - Message notification preferences (per conversation mute option)
  - Timezone & language settings
  - Privacy controls (consultation history visibility)
  - Install PWA prompt

---

### 👨‍🏫 TEACHER INTERFACE

#### **1. Authentication & Profile**
- [ ] **SSO Login:** School credentials
- [ ] **Professional Profile Setup:**
  - Bio, areas of expertise, office location
  - Set consultation availability (weekly recurring slots)
  - Upload profile photo

#### **2. Dashboard (Home)**
- [ ] **AI Insight Inbox:**
  - Pending requests sorted by: Urgency, Date Submitted, Topic Category
  - Each card displays:
    - Student name & program
    - Request summary (AI-extracted key points)
    - Uploaded files count
    - "View Full AI Brief" button
- [ ] **Today's Schedule:**
  - Timeline view of confirmed consultations
  - "Mark as Completed" quick action
- [ ] **Classroom Activity Summary:**
  - Number of new submissions in Attachment Bins
  - Unread messages count
- [ ] **Quick Stats Widget:**
  - Total consultations this week/month
  - Average consultation duration
  - Most requested topics

#### **3. Request Management**
- [ ] **Request Detail View:**
  - Student information panel (name, year, major, past consultation history)
  - **AI-Generated Smart Brief:**
    - Summary of student's concern (extracted from request text + uploaded files)
    - Key points to address (e.g., *"Student needs feedback on methodology section, pages 12-15"*)
    - Suggested prep materials from Resource Library
    - Risk flags (e.g., multiple failed attempts, urgent deadline)
  - Uploaded files viewer (PDF/Docx preview)
- [ ] **Action Buttons:**
  - **Accept & Schedule:**
    - Opens availability calendar with student's preferred times highlighted
    - Select time slot → Auto-sends confirmation to student
    - Option to add meeting link (Zoom/Teams integration)
  - **Request More Info:**
    - Template messages (e.g., "Please clarify which chapter you need reviewed")
    - AI suggests what info is missing
  - **Decline with AI-Assisted Response:**
    - AI drafts polite decline message
    - Suggests alternative resources or teachers
    - Option to refer to departmental services

#### **4. Schedule & Calendar Management**
- [ ] **Integrated Calendar View:**
  - Daily/Weekly/Monthly views
  - Color-coded by consultation type (Academic, Career, etc.)
  - Drag-to-reschedule functionality
  - Sync with external calendars (iCal export)
- [ ] **Availability Management:**
  - Set recurring office hours
  - Block out unavailable times
  - One-click "Vacation Mode" (auto-declines new requests)
- [ ] **Session Completion:**
  - "Mark as Done" button
  - Optional: Add private notes for reference
  - Optional: Share resources with student post-consultation

#### **5. Classroom Management Hub**
- [ ] **Create Classroom:**
  - Set class name, subject, description
  - Generate unique 6-digit invite code
  - Set class as Active/Archived
- [ ] **Classroom Dashboard:**
  - Member list (students who joined via code)
  - Announcement composer with rich text editor
  - Post visibility controls (Immediate/Scheduled)
- [ ] **Attachment Bin Management:**
  - **Create Bin:** Set title, description, deadline, file type restrictions
  - **Submissions View:**
    - Grid of all student submissions
    - **Bulk AI Analysis:** Generate Smart Briefs for all submissions at once
    - Individual file preview & download
    - Mark submissions as "Reviewed" or "Needs Follow-up"
  - **Feedback Options:**
    - Add comments to individual submissions
    - Share resources back to the classroom
- [ ] **Resource Library for Class:**
  - Upload shared materials (lecture notes, templates, FAQs)
  - Organize into folders
  - Track download counts

#### **6. Communication & Messaging**
- [ ] **Message Inbox:**
  - Unified inbox showing all conversations (consultation chats, student inquiries, classroom replies)
  - List view grouped by: Active Consultations, Classroom Messages, General Inquiries
  - Unread count badges and priority indicators
  - Quick reply from inbox preview
  - Archive/mute conversations
- [ ] **Consultation-Specific Chat:**
  - Direct messaging with student about an active or upcoming consultation
  - Auto-created when teacher accepts consultation request
  - "View Smart Brief" and "View Files" shortcuts within chat
  - Message history tied to consultation record
  - Share additional resources (links, files) during conversation
  - Mark consultation as "Completed" from chat interface
- [ ] **Classroom Announcements:**
  - Broadcast messages to all class members
  - Rich text editor with formatting options (bold, italic, lists)
  - Attach files to announcements (study guides, resources)
  - Schedule announcements for future posting
  - See who has read the announcement (read receipts)
  - Students can reply to announcements (creates private thread with teacher)
- [ ] **Quick Templates:**
  - Pre-written message templates for common scenarios:
    - "Thank you for your request. I'll review and get back to you soon."
    - "Please provide more details about..."
    - "Meeting reminder: Our consultation is tomorrow at..."
    - "Great progress on your work. Here are my suggestions..."
  - Customizable templates for each teacher
- [ ] **Message Management:**
  - Star/flag important conversations
  - Search messages by student name, date, or keyword
  - Filter by consultation topic or classroom
  - Export chat history as PDF (for record-keeping)

#### **7. Insights & Analytics**
- [ ] **Personal Analytics Dashboard:**
  - Consultation trends over time (chart)
  - Most common topics students seek help with
  - Peak request times (to adjust availability)
  - Student satisfaction (optional post-consultation survey results)

---

### 🛠️ ADMIN INTERFACE

#### **1. User & Access Management**
- [ ] **Master Roster:**
  - List of all verified accounts (Students, Teachers, Admins)
  - Search & filter by role, department, status
  - Bulk actions: Activate, Deactivate, Reset Password
- [ ] **Account Verification Queue:**
  - Pending SSO registrations awaiting admin approval
  - Verify role assignment (Student vs. Teacher)
- [ ] **Role & Permissions Management:**
  - Assign/revoke admin privileges
  - Department-specific teacher assignments

#### **2. Institutional Analytics**
- [ ] **Consultation Trends Dashboard:**
  - **Heatmap:** Visual representation of consultation requests by department, topic, time period
  - **Top Requested Topics:** Chart showing "Thesis Help," "Grade Appeals," "Career Advice," etc.
  - **At-Risk Indicators:** Identify students with multiple urgent requests (potential academic distress)
- [ ] **Teacher Performance Metrics:**
  - Consultation completion rates by teacher
  - Average response time to requests
  - Decline rates with reasons
  - Identify overburdened teachers
- [ ] **System Usage Statistics:**
  - Active users (daily/monthly)
  - Peak usage times
  - PWA installation rates
  - Offline access engagement

#### **3. AI Configuration & Oversight**
- [ ] **Global AI Settings:**
  - **Assistant Tone Control:** Adjust AI communication style (Supportive, Formal, Concise)
  - **Prompt Templates:** Customize AI clarification questions for different consultation types
  - **Keyword Flagging:** Set keywords that trigger urgency alerts (e.g., "failing," "drop out")
- [ ] **AI Training & Resources:**
  - Upload institutional FAQs for AI to reference
  - Add department-specific guidelines (e.g., "All thesis appeals go to Research Office")
  - Review and approve AI-suggested responses before deployment
- [ ] **AI Performance Monitoring:**
  - Accuracy metrics (teacher feedback on AI Brief quality)
  - False positive/negative rates on urgency detection
  - Logs of AI suggestions that were overridden by teachers

#### **4. System Configuration**
- [ ] **Notification Management:**
  - Set global notification schedules (e.g., no reminders after 10 PM)
  - Customize notification templates
- [ ] **File Management:**
  - Set max file size limits
  - Monitor total storage usage
  - Purge old files (auto-delete after X months with warning)
- [ ] **Classroom Moderation:**
  - View all active classrooms
  - Archive/delete inactive classrooms
  - Monitor for inappropriate content

#### **5. Compliance & Reporting**
- [ ] **Centralized Consultation Logs:**
  - Searchable database: Date, Student, Teacher, Topic, Outcome
  - Used for grade dispute resolution or academic audits
  - Privacy filters (anonymize data for institutional reports)
- [ ] **Data Export Tools:**
  - Export logs as CSV/PDF for accreditation reviews
  - Custom report builder (date range, department, topic filters)
- [ ] **Privacy & Data Controls:**
  - GDPR/Data retention policy settings
  - Student data deletion requests processing
  - Audit trail for admin actions

#### **6. System Health Monitoring**
- [ ] **Technical Dashboard:**
  - PWA offline cache status
  - Service worker error logs
  - API response times
  - Database performance metrics
- [ ] **User Feedback Collection:**
  - Bug report inbox
  - Feature request voting system

---

## 🔔 NOTIFICATIONS & ALERTS (CROSS-PLATFORM)

### Push Notifications (Web Push API)
- [ ] **For Students:**
  - "Your consultation request has been accepted by Prof. [Name]"
  - "Reminder: Meeting in 2 hours with Prof. [Name]"
  - "New announcement in [Classroom Name]"
  - "Your submission in [Attachment Bin] has been reviewed"
- [ ] **For Teachers:**
  - "New consultation request from [Student Name]"
  - "[X] new submissions in [Attachment Bin Name]"
  - "Consultation starting in 30 minutes"
  - "AI Brief ready for [Student Name]'s request"
- [ ] **For Admins:**
  - "System alert: High volume of consultation requests in [Department]"
  - "[X] pending account verifications"

### In-App Notifications
- [ ] Notification badge on navigation icons
- [ ] Toast messages for real-time updates
- [ ] Notification history panel with filters (read/unread, type)

### Email Fallback
- [ ] Daily digest option (summary of all notifications)
- [ ] Critical alerts sent via email (e.g., consultation cancellations)

---

## 🌐 TECHNICAL IMPLEMENTATION (REACT NATIVE HYBRID)

### React Native + Expo Framework
- [ ] **Expo Managed Workflow:** Simplified development (no native code needed)
- [ ] **Cross-Platform UI:** Single codebase for iOS, Android, and Web
- [ ] **Native Features via Expo:**
  - `expo-notifications` - Push notifications (iOS + Android)
  - `expo-document-picker` - File uploads (PDF/Docx)
  - `expo-file-system` - Local file storage and caching
  - `expo-calendar` - Export consultations to device calendar
  - `expo-secure-store` - Encrypted token storage
- [ ] **Responsive Design:** Mobile-first UI with tablet/web adaptations

### Offline Capabilities
- [ ] **AsyncStorage:** Cache consultation history locally
- [ ] **NetInfo:** Detect online/offline status
- [ ] **Offline Queue:** Store pending uploads/actions when disconnected
- [ ] **Visual Indicators:** Show connection status in app header

### Performance Optimizations
- [ ] Lazy loading for images (react-native-fast-image)
- [ ] FlatList virtualization for long lists
- [ ] Skeleton screens during data fetching
- [ ] Optimistic UI updates (instant feedback)

### Security Features
- [ ] JWT token authentication with auto-refresh
- [ ] Expo SecureStore for sensitive data
- [ ] File type validation (mime-type checking)
- [ ] API rate limiting on backend

---

## 🔗 INTEGRATIONS

### External Calendar Integration
- [ ] Export consultations to device calendar via `expo-calendar`
- [ ] Generate .ics files for Google Calendar / Outlook import

### Video Conferencing (Optional)
- [ ] Generate Zoom/Teams meeting links (stored in consultation)
- [ ] Open meeting link via `Linking.openURL()` before scheduled time

### School Systems Integration
- [ ] Mock SSO authentication (simulate university login for demo)
- [ ] Hardcoded demo data for student/teacher profiles
- [ ] *Note: Real SSO integration out of scope for 4-6 week timeline*

---

## �️ TECH STACK (FREE TIER FOR SCHOOL PROJECT)

### Frontend (Mobile + Web)
- **React Native** - Mobile framework
- **Expo SDK 50+** - Managed workflow (no Xcode/Android Studio needed for dev)
- **React Navigation 6** - Screen navigation
- **React Query (TanStack Query)** - Server state management & caching
- **Zustand** - Lightweight global state (user, auth)
- **React Native Paper** or **NativeBase** - Pre-built UI components
- **Expo Router** - File-based routing (optional, for web support)

### Backend (API Server)
- **Node.js 20+** - JavaScript runtime
- **Express.js** - REST API framework
- **Supabase Realtime** - Real-time messages and notifications (replaces Socket.io)
- **Multer** - File upload handling

### Database & Storage
- **Supabase** (Free Tier) - All-in-one backend
  - PostgreSQL database (500MB)
  - Authentication (10,000 users)
  - Storage (1GB for PDF/Docx files)
  - Real-time subscriptions (instead of Socket.io)
  - Row Level Security (RLS) for data privacy

### AI Services (Free Tier)
- **OpenAI API** - GPT-3.5-turbo ($5 free credit)
  - Smart Brief generation
  - Text analysis from student requests
- **pdf-parse** (Node.js) - Extract text from PDFs (free)
- **mammoth.js** (Node.js) - Extract text from .docx (free)
- **Alternative:** Groq API (free, faster inference) or HuggingFace Inference API

### Authentication
- **Supabase Auth** - Email/password authentication (built-in)
- **Mock SSO** - Simulate school login (hardcoded demo accounts)

### Notifications
- **Expo Push Notifications** - Free (unlimited)
  - Native iOS + Android push notifications
  - No FCM/APNS setup required

### Hosting (Free Tier)
- **Frontend:** Expo Application Services (EAS) - Host mobile apps
  - Build iOS/Android apps in the cloud (free tier: limited builds/month)
- **Backend API:** Railway (Free $5 credit/month) or Render (Free tier)
- **Database:** Supabase (Free tier)
- **File Storage:** Supabase Storage (Free 1GB)

### Development Tools
- **Expo Go** - Test on physical device without building
- **VS Code** - Code editor
- **Postman** - API testing
- **Git + GitHub** - Version control

### Optional Libraries
- **react-native-pdf** - PDF preview in-app
- **dayjs** - Date manipulation
- **react-hook-form** - Form validation
- **zod** - Schema validation

---

## �🚀 IMPLEMENTATION PRIORITY LEVELS

### **Week 1-2: Setup & Core Auth (MVP Foundation)**
1. Project setup (Expo + Supabase)
2. Database schema design
3. Authentication (Email/Password with Supabase)
4. Basic navigation structure (Student, Teacher, Admin tabs)
5. User profile screens (view/edit)

### **Week 2-3: Consultation Request Flow & Messaging**
1. Teacher Directory with search/filter
2. Consultation Request Form (no AI yet)
3. File upload to Supabase Storage
4. Request Management UI (Teacher accepts/declines)
5. Simple Calendar View (list of consultations)
6. **Messaging System:**
   - Database schema for messages (sender, receiver, content, timestamp, consultation_id)
   - Message inbox UI (student and teacher)
   - Real-time message sync with Supabase Realtime
   - Consultation-specific chat (auto-created on acceptance)
7. Basic notifications (Expo push for messages and requests)

### **Week 3-4: AI Smart Briefs**
1. Backend: Extract text from PDF/Docx
2. Integrate OpenAI API (GPT-3.5-turbo)
3. Generate Smart Briefs from student requests
4. Display AI analysis in teacher dashboard
5. AI clarification prompts in request form

### **Week 4-5: Classroom Hub**
1. Classroom creation & invite codes
2. Join classroom flow
3. Teacher announcements
4. Attachment Bins (upload/submission)
5. View submissions with AI summaries

### **Week 5-6: Polish & Admin Tools**
1. Consultation history & Resource Library
2. Basic admin dashboard (user list, stats)
3. Offline mode (AsyncStorage caching)
4. UI/UX improvements & bug fixes
5. Demo video recording & documentation

### **Features Deferred (Post-Submission)**
- Advanced analytics dashboard
- Video conferencing integration
- External calendar sync (import)
- AI configuration panel
- Group chat for classrooms (students can message each other)
- Message threading and reactions (emoji reactions to messages)
- Voice/video messages

---

## 📊 SUCCESS METRICS (SCHOOL PROJECT DEMO)

### Functional Requirements (Pass/Fail)
- [ ] User can register and login (Student/Teacher/Admin roles)
- [ ] Student can browse teachers and request consultation
- [ ] Teacher receives AI Smart Brief for each request
- [ ] Teacher can accept/decline with time selection
- [ ] Student receives push notification on request status
- [ ] **Student and teacher can exchange messages about consultations**
- [ ] **Message inbox shows all conversations with unread indicators**
- [ ] **Real-time message delivery and read receipts**
- [ ] Teacher can create classroom and generate invite code
- [ ] Student can join classroom and upload to Attachment Bins
- [ ] **Teacher can post announcements and students can reply**
- [ ] AI analyzes uploaded PDF/Docx and generates summaries
- [ ] Admin can view user list and basic analytics
- [ ] App works on both iOS and Android (Expo Go testing)

### System Performance (Demo Quality)
- [ ] AI Brief generation under 60 seconds (acceptable for demo)
- [ ] App loads within 3 seconds on 4G connection
- [ ] File uploads complete within 10 seconds (for 5MB PDF)

### Demo Presentation
- [ ] 5-minute demo video showing full user flow
- [ ] Documentation: Setup instructions, API keys, database schema
- [ ] Mock data: 5 students, 3 teachers, 10 sample consultations
- [ ] Code quality: Clean structure, comments, error handling

---

## 🔍 KEY IMPROVEMENTS FROM ORIGINAL PLAN

### Fixed Issues:
1. ✅ **Completed Classroom Hub Feature:** Fully defined Attachment Bins, announcements, and resource sharing
2. ✅ **Clarified AI Workflow:** Detailed how AI analyzes requests, generates briefs, and assists with responses
3. ✅ **Added Missing Core Features:**
   - Profile management
   - Calendar integration & rescheduling
   - File upload/management interfaces
   - Offline capabilities (AsyncStorage caching)
   - Settings & notification preferences
4. ✅ **Removed Scope Creep:**
   - Removed "Resource Communities" (out of scope for consultation-focused system)
   - Deferred student-to-student group messaging (kept teacher-student messaging only)
   - Deferred advanced analytics (post-submission feature)
5. ✅ **Enhanced Security & Privacy:** Added data controls, privacy settings, and compliance tools
6. ✅ **Defined User Flows:** Added clear primary/secondary workflows at the beginning
7. ✅ **Realistic Timeline:** 6-week implementation roadmap for school project
8. ✅ **Tech Stack for Free Tier:** Supabase + Expo + OpenAI free credits
9. ✅ **React Native Hybrid:** Native mobile apps (iOS/Android) from single codebase
10. ✅ **School Project Scope:** Focused on demo-ready MVP, deferred production features

---

## 📝 NOTES FOR DEVELOPMENT TEAM

### Design Principles:
- **Mobile-First:** Native mobile UI using React Native Paper/NativeBase components
- **Accessibility:** Basic accessibility (label props, sufficient contrast)
- **Minimalist UI:** Clean screens, avoid feature overload
- **Trust & Transparency:** Badge all AI-generated content with robot icon

### AI Ethics Guidelines:
- Never let AI make final decisions (Human-in-the-Loop)
- Clearly label AI-generated content with disclaimer
- Teachers can edit/override AI suggestions
- Mock data only (no real student data for school project)
- Include "AI Ethics" section in project documentation

### Data Privacy (Demo Version):
- Use Supabase Row Level Security (RLS) policies
- Students can only see their own consultations
- Teachers only see requests assigned to them
- Admin has read-only access to all data
- Mock email addresses (no real school emails for demo)

### Development Environment Setup:
1. Install Node.js 20+
2. Install Expo CLI: `npm install -g expo-cli`
3. Create Supabase account (free tier)
4. Get OpenAI API key ($5 free credit)
5. Clone repo and run: `npm install && npx expo start`
6. Test on Expo Go app (iOS/Android) or web browser

### Folder Structure:
```
nexad/
├── src/
│   ├── screens/        # Student, Teacher, Admin screens
│   ├── components/     # Reusable UI components
│   ├── navigation/     # React Navigation setup
│   ├── services/       # API calls (Supabase, OpenAI)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions
│   └── types/          # TypeScript types
├── backend/            # Express.js API (optional)
├── supabase/           # Database migrations & functions
└── assets/             # Images, fonts, icons
```

---

## 💰 ESTIMATED COSTS (FREE TIER)

- **Expo EAS Build:** Free (limited builds per month)
- **Supabase:** Free tier (500MB DB, 1GB storage, 10K users)
- **OpenAI API:** $5 free credit (≈100 AI briefs)
- **Railway/Render:** Free tier (750 hours/month)
- **Expo Push Notifications:** Free (unlimited)
- **Domain (optional):** $0 (use default Expo domain)

**Total Cost:** $0-5 (only if OpenAI credit runs out)

---

**Document Version:** 3.0 (React Native Hybrid)  
**Last Updated:** January 31, 2026  
**Status:** Final - Ready for 4-6 Week Development Sprint  
**Target:** School Project Submission
