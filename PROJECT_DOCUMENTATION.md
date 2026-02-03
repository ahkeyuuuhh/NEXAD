# NEXAD: AI-Enhanced Consultation System

## Project Documentation for Academic Submission

**Course:** PRFN102/L - Object-Oriented Programming 2  
**Project Type:** React Native Hybrid Mobile Application  
**Submission Date:** January 31, 2026  
**Development Timeline:** 4-6 weeks

---

## 1. PROJECT DESCRIPTION

NEXAD (Next-Generation Academic Assistance Dashboard) is an AI-Enhanced Consultation System designed to fix the disorganized process of student-teacher consultations. Currently, booking a meeting is often a mess of back-and-forth emails, and teachers usually don't have time to review a student's work until the meeting actually starts. This system solves that by merging a booking platform with a Classroom Hub and integrated messaging system. Using a simple Invite Code, teachers can set up a classroom where they post reminders and create Attachment Bins for drafts. The core of the system is an AI that analyzes these student submissions to generate "Smart Briefs" for the teacher. This ensures that by the time the consultation happens, the teacher already knows exactly what the student needs, making the session much more productive and focused.

The platform operates through four integrated components. First, the Intelligent Booking Platform allows students to search for teachers by department or expertise and submit consultation requests through an AI-powered form that analyzes requests in real-time, prompting for clarification and suggesting relevant document uploads such as assignment rubrics or draft papers. Second, the Classroom Hub enables teachers to create virtual classrooms accessible via unique 6-digit invite codes where they can post announcements and create "Attachment Bins" for organized document collection, eliminating the problem of lost email attachments. Third, the AI Smart Briefs feature performs semantic analysis on submitted documents to generate comprehensive briefings containing summaries of student concerns, key points from uploaded materials with specific page references, patterns from consultation history, and suggested preparation materials. Fourth, the Messaging System provides real-time communication between students and teachers within the consultation context, with unified inboxes, consultation-specific chats, and announcement reply threads to facilitate ongoing dialogue without scattered email exchanges.

NEXAD is built using React Native with Expo, enabling deployment as native mobile applications for both iOS and Android devices from a single codebase. The backend leverages Supabase for database management, authentication, and file storage, while OpenAI's GPT-3.5-turbo API powers the document analysis and Smart Brief generation. The application supports offline viewing of consultation history and cached materials, with automatic synchronization when internet connectivity is restored, ensuring accessibility across various network conditions.

---

## 2. OBJECTIVES

•	**Automate Pre-Consultation Prep:** Use AI to analyze uploaded drafts and student requests so teachers receive a summary of the student's progress before the consultation even begins. The system will extract key sections requiring feedback from uploaded student documents (PDF/Docx), generate structured Smart Briefs highlighting student concerns and document content summaries, and deliver AI-generated briefings 24-48 hours before scheduled consultations to allow adequate preparation time. This eliminates the inefficiency of teachers starting consultations without context.

•	**Centralize the Workflow:** Combine scheduling, document submission, teacher announcements, and real-time messaging into one dashboard to eliminate the need for scattered emails and chat apps. A single mobile application will integrate scheduling, document submission, announcements, consultation history, and direct messaging between students and teachers. Push notifications will replace email threads, ensuring timely awareness of request status changes and new messages. The Classroom Hub consolidates all course-related consultations and materials in one location, while the integrated messaging system allows students to communicate with teachers about consultations without leaving the app. A searchable Resource Library archives all past consultation materials for future reference.

•	**Monitor Academic Needs:** Provide analytics that track which topics or subjects students are requesting help with most often, helping to identify common academic struggles. An admin analytics dashboard will visualize consultation request trends by department, topic, and time period, with heatmaps identifying subjects with highest consultation demand. The system will flag students with multiple urgent requests as potential at-risk cases requiring additional support, and teacher engagement metrics will track response times and consultation completion rates to enable data-driven resource allocation.

•	**Enhance Consultation Effectiveness:** Improve the quality and outcomes of student-teacher interactions by ensuring both parties are better prepared. AI clarification prompts will help students articulate their concerns more clearly before submission, while pre-consultation document review ensures meetings focus on problem-solving rather than information gathering. Consultation history provides context for ongoing academic relationships, and post-consultation resource sharing enables continued learning beyond the meeting.

---

## 3. SCOPE

### 3.1 Included Features and Functionalities

#### 3.1.1 User Management
- **Multi-Role Authentication:** Support for three distinct user types (Students, Teachers, Administrators) with role-based access control
- **Profile Management:** Users can create, view, and edit personal profiles including contact information, academic department, areas of expertise (teachers), and notification preferences
- **Mock SSO Integration:** Simulated Single Sign-On authentication mimicking university credential systems (hardcoded demo accounts for project demonstration)

#### 3.1.2 Student Features
- **Teacher Discovery:** Searchable directory with filters for department, expertise tags (Research, Career Guidance, Mental Health), and availability status
- **AI-Powered Request Submission:** 
  - Free-text consultation request form with real-time AI analysis
  - Dynamic follow-up questions based on detected keywords (e.g., "Which grade are you appealing?")
  - Smart document upload suggestions (e.g., "Please attach the graded assignment and rubric")
- **File Upload System:** Support for PDF and .docx documents up to 10MB, with drag-and-drop interface and upload progress indicators
- **Consultation Dashboard:** View upcoming meetings, color-coded preparation status (Red: Missing materials, Yellow: Partial, Green: Complete)
- **Classroom Participation:** Join classrooms via 6-digit invite codes, view teacher announcements, upload files to Attachment Bins
- **Resource Library:** Archive of all past consultation files, AI summaries, and shared materials with search functionality
- **Push Notifications:** Real-time alerts for request acceptance/decline, upcoming meetings (2-hour reminders), and new classroom posts

#### 3.1.3 Teacher Features
- **Request Inbox:** AI-sorted list of pending consultation requests with Smart Brief previews showing extracted key points
- **Smart Brief Viewer:** Detailed AI-generated summaries including:
  - Student profile and consultation history
  - Text analysis from request description
  - Content summaries from uploaded documents with page references
  - Suggested preparation actions
- **Request Management Actions:**
  - Accept and schedule (calendar picker with student's preferred times highlighted)
  - Request additional information (AI suggests missing details)
  - Decline with AI-assisted response (system drafts polite alternatives and resource suggestions)
- **Integrated Calendar:** Daily/weekly/monthly consultation views with time slot management
- **Classroom Management:**
  - Create classrooms and generate unique invite codes
  - Post announcements with rich text formatting
  - Create Attachment Bins with deadlines and file type specifications
  - View student submissions in grid format with AI analysis
  - Bulk Smart Brief generation for all submissions
Scope:

•	**Universal Classroom Access:** A single web-based platform accessible via React Native mobile application on both iOS and Android devices from a unified codebase. Users can install the native app or access consultation features through the mobile interface, providing seamless cross-platform experience.

•	**Service Worker Integration:** Implementation of background scripts through React Native's AsyncStorage to allow offline access to the Resource Library and cached consultation notes. Past consultations, announcements, and AI summaries remain viewable without internet connectivity, with automatic synchronization when connection is restored.

•	**AI Smart Briefs:** A cloud-based AI engine that processes uploaded drafts (PDF/Docx) to generate student-specific briefings for teachers, accessible from any device. The system extracts text content, performs semantic analysis to identify key themes and concerns, creates structured summaries in under 60 seconds, and provides content summaries from uploaded documents with specific page references.

•	**Real-time Synced Notifications:** Using Expo Push Notifications to send reminders for upcoming consultations or new draft submissions directly to the user's device. Students receive alerts for request acceptance/decline and 2-hour meeting reminders, while teachers get notifications for new consultation requests and Attachment Bin submissions.

•	**Multi-Role Authentication System:** Support for three distinct user types (Students, Teachers, Administrators) with role-based access control. Users can create, view, and edit personal profiles including contact information, academic department, areas of expertise, and notification preferences through mock SSO authentication simulating university credential systems.

•	**Student Consultation Features:** Searchable teacher directory with filters for department, expertise tags (Research, Career Guidance, Mental Health), and availability status. AI-powered request submission with real-time analysis, dynamic follow-up questions based on detected keywords, and smart document upload suggestions. File upload system supporting PDF and .docx documents up to 10MB with drag-and-drop interface and progress indicators.

•	**Teacher Management Tools:** AI-sorted request inbox showing Smart Brief previews with extracted key points. Detailed AI-generated summaries including student profiles, consultation history, text analysis from requests, and suggested preparation actions. Request management actions include accepting and scheduling with calendar picker, requesting additional information with AI suggestions, and declining with AI-assisted responses that draft polite alternatives and resource suggestions.

•	**Classroom Hub:** Teachers can create virtual classrooms and generate unique 6-digit invite codes. Within classrooms, teachers post announcements with rich text formatting and create Attachment Bins with deadlines and file type specifications. Students join via invite codes, view announcements, and upload files to designated bins. Teachers view student submissions in grid format with AI analysis and can generate bulk Smart Briefs for all submissions.

•	**Administrator Analytics Dashboard:** Master roster of all registered users with search, filter, and bulk action capabilities. Visual heatmap of consultation requests by department, topic, and time period. Charts showing most requested consultation topics, teacher performance metrics (response time, completion rate), and at-risk student identification through multiple urgent request flagging.

•	**Technical Infrastructure:** Cross-platform deployment via React Native/Expo running natively on iOS and Android. Backend powered by Supabase for database management, authentication, and file storage. OpenAI GPT-3.5-turbo API for document analysis and Smart Brief generation. Real-time synchronization through Supabase Realtime subscriptions for instant notification delivery and message sync. Secure file storage with encrypted uploads and role-based access controls. Calendar export functionality generating .ics files for Google Calendar and Outlook integration.

•	**Messaging & Communication System:** Unified message inbox for students and teachers showing all conversations (consultation chats, classroom announcement replies, teacher inquiries). Consultation-specific chat automatically created when teacher accepts a request, with "View Smart Brief" and "View Files" shortcuts within the chat interface. Students can reply to classroom announcements creating private threads with teachers. Real-time message delivery using Supabase Realtime with push notifications for new messages. File sharing in chat (PDF/Docx up to 5MB). Message search and filtering by teacher name, date, or consultation topic. Quick reply templates for teachers to respond efficiently to common questions. demo-level usage (~50 sample documents)
- Production deployment would require paid tier for real institutional usage

#### 4.1.4 File Format Restrictions
**Supported Document Types:**
- Only PDF and .docx formats accepted for upload
- Other formats (Google Docs, .pages, .odt, images) require manual conversion by users
- Restriction ensures consistent AI text extraction and prevents unsupported file type errors

**File Size Limits:**
- Maximum 10MB per uploaded file
- Large thesis documents or high-resolution scanned PDFs may exceed limit and require compression

### 4.2 Functional Limitations

#### 4.2.1 AI Capabilities and Accuracy
**Human-in-the-Loop Requirement:**
- AI only provides summaries and suggestions; it cannot make decisions (accepting/declining requests, providing academic feedback)
- Teachers must review and approve all AI-generated content before acting on it
- No automated consultation scheduling without explicit teacher confirmation

**Analysis Accuracy:**
- AI Smart Briefs are 70-85% accurate depending on document clarity and formatting
- Scanned PDFs with poor OCR quality may produce incomplete or inaccurate extractions
- Handwritten notes, complex mathematical equations, or diagrams not adequately analyzed
- AI may misinterpret context in highly technical or domain-specific language

**Language Support:**
- AI analysis optimized for English text only
- Documents in other languages may produce unreliable summaries
- No translation services available

#### 4.2.2 Authentication and Security
**Mock SSO Limitations:**
- Demo version uses hardcoded email/password authentication (not real university SSO)
- Production deployment requires custom integration with institution's identity provider
- No multi-factor authentication (MFA) in current version

**Data Privacy:**
- Row Level Security (RLS) implemented in Supabase, but demo uses simplified permissions
- Real deploymen

Limitation:

•	**Browser Dependency:** While React Native apps work on most modern mobile operating systems, the application requires iOS 13+ and Android 8.0+ to function properly. Older devices may experience performance degradation or missing features. Advanced features like Push Notifications may have limited support on older versions of iOS Safari compared to Android Chrome. Custom native modules requiring direct Xcode or Android Studio modifications cannot be implemented without ejecting from Expo managed workflow, and some advanced device features (NFC, advanced Bluetooth) are inaccessible through Expo's API.

•	**Storage Limits:** Offline storage is managed by React Native AsyncStorage with maximum cache size approximately 6MB on iOS and 10MB on Android. If the device runs extremely low on space, the app may clear oldest cached items that haven't been accessed in weeks. Cloud storage through Supabase free tier provides only 1GB total file storage, restricting the school project environment to demo-level usage with approximately 50 sample documents. Production deployment would require paid tier for real institutional usage.

•	**Primary Academic Focus:** The system is designed for academic guidance and consultations; it is not a full-scale Learning Management System (LMS) and will not include features like automated grading, exam proctoring, course enrollment and grade management, attendance tracking, or learning progress analytics beyond consultation patterns. The system focuses exclusively on consultation scheduling and preparation.

•	**Internet Dependency:** As a React Native application, the app requires an active internet connection to upload files and receive real-time AI Smart Briefs. File uploads, AI Smart Brief generation, push notifications, and real-time consultation request status updates require network availability. Though past consultation notes, announcements, and cached materials will be available for offline viewing, new actions such as submitting requests or uploading files are queued but not processed until connection is restored. AI analysis cannot be performed on locally stored files without server connection.

•	**Human-in-the-Loop:** The AI is strictly an Assistant. It provides summaries and suggestions, but it will not make final decisions (like accepting/declining a consultation request) or give academic feedback without the teacher's review. Teachers must review and approve all AI-generated content before acting on it, and no automated consultation scheduling occurs without explicit teacher confirmation. AI Smart Briefs are 70-85% accurate depending on document clarity and formatting, with scanned PDFs with poor OCR quality potentially producing incomplete or inaccurate extractions. Handwritten notes, complex mathematical equations, or diagrams are not adequately analyzed, and AI may misinterpret context in highly technical or domain-specific language.

•	**Standard File Support:** To keep the experience smooth for both parties, the system will only process standard document types (PDF and .docx up to 10MB), ensuring teachers don't have to deal with incompatible file formats. Other formats such as Google Docs, .pages, .odt, or images require manual conversion by users. Large thesis documents or high-resolution scanned PDFs may exceed the limit and require compression.

•	**Authentication Limitations:** The demo version uses mock SSO with hardcoded email/password authentication simulating university credential systems rather than real Single Sign-On integration with university Active Directory or OAuth providers. Production deployment requires custom integration with the institution's identity provider. No multi-factor authentication (MFA) is available in the current version.

•	**Scalability Constraints:** The demo environment is tested for maximum 10-20 concurrent users. Database free tier (Supabase) is suitable for pilot programs under 500 total users, but real institutional deployment with 5,000+ users requires infrastructure upgrade. OpenAI API free tier ($5 credit) supports approximately 100 Smart Brief generations with AI generation time of 30-60 seconds per request. After credit exhaustion, the system requires a paid API key or alternative free AI service. Expo Push Notifications free tier may throttle under very high volumes, and delivery is not guaranteed 100% depending on device settings, battery optimization, and network conditions.

•	**Integration Limitations:** The system can export .ics files for manual import to Google Calendar or Outlook but cannot automatically sync or import teacher availability from external calendars. No bidirectional synchronization exists, meaning changes in external calendars are not reflected in the app. For video conferencing, the system can store Zoom/Teams meeting links but does not generate them automatically, with no built-in video calling functionality requiring users to manually create and paste meeting links.

•	**School Project Timeline:** The 4-6 week development window limits feature completeness. Advanced features such as student-to-student group chat, message threading with emoji reactions, voice/video messages, advanced analytics dashboards, and video conferencing integration are deferred post-submission. The implemented messaging system focuses on teacher-student communication within consultation and classroom contexts. Testing is limited to functionality verification with no load testing or security audits. Mock data is used for demo with fictional students, teachers, and consultations. The system is not intended for production use without additional hardening and testing, and no formal quality assurance (QA) or user acceptance testing (UAT) is conducted.

•	**Free Tier Dependencies:** Service quotas include Supabase (500MB database, 1GB storage, 10,000 monthly active users), OpenAI ($5 free credit for approximately 100 API calls), and Railway/Render (free tier with 750 hours/month uptime limit). If free tier quotas are exceeded, services may pause or require payment upgrade. No service level agreement (SLA) for uptime or support exists on free tiers. No ongoing maintenance or bug fixes occur after project grading period, dependencies may become outdated, and API changes from third-party services are not monitored.

•	**Language Support:** AI analysis is optimized for English text only. Documents in other languages may produce unreliable summaries, and no translation services are available.