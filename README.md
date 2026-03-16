# NEXAD - AI-Enhanced Consultation System

<div align="center">

**Next-Generation Academic Assistance Dashboard**

*Streamlining student-teacher consultations with AI-powered smart briefings*

[![React Native](https://img.shields.io/badge/React_Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)

</div>

---

## 📖 Overview

NEXAD is a cross-platform mobile application designed to revolutionize student-teacher consultations in academic institutions. It eliminates the inefficiencies of scattered emails and unprepared meetings by integrating an intelligent booking platform, classroom management hub, and AI-powered document analysis system.

### The Problem
- **Disorganized scheduling:** Back-and-forth emails to book consultations
- **Unprepared meetings:** Teachers review materials during consultations
- **Scattered communication:** Lost attachments and fragmented conversations
- **Lack of insights:** No data on academic needs or support gaps

### The Solution
NEXAD provides:
1. **Intelligent Booking:** AI analyzes requests and suggests relevant documents
2. **AI Smart Briefs:** Teachers receive pre-consultation summaries of student materials
3. **Classroom Hub:** Centralized space for announcements and document collection
4. **Unified Messaging:** Real-time communication within consultation context
5. **Analytics Dashboard:** Insights into academic support patterns

---

## ✨ Key Features

- 🤖 **AI-Powered Request Analysis** - Real-time analysis with clarification prompts
- 📄 **Smart Document Processing** - Automatic text extraction and summarization
- 📚 **Classroom Management** - Virtual classrooms with invite codes
- 💬 **Unified Messaging** - Context-aware communication system
- 🔔 **Push Notifications** - Real-time updates and reminders
- 📊 **Analytics Dashboard** - Insights into consultation patterns
- 🔒 **Secure & Private** - Row-level security and encrypted storage

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI
- Supabase account
- OpenAI API key (optional for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/ahkeyuuuhh/NEXAD.git
cd NEXAD

# Install dependencies
cd nexad-app
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase and OpenAI credentials

# Start the development server
npm start
```

For detailed setup instructions, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.

---

## 🎮 Demo Accounts

Test the app with pre-configured accounts:

| Role | Email | Password |
|------|-------|----------|
| Student | john.doe@student.edu | student123 |
| Teacher | prof.santos@university.edu | teacher123 |
| Admin | admin@university.edu | admin123 |

---

## 🏗️ Architecture

### Technology Stack

**Frontend:** React Native + Expo, TypeScript, React Navigation, React Native Paper  
**Backend:** Supabase (PostgreSQL, Auth, Storage)  
**AI/ML:** OpenAI GPT-3.5-turbo  
**Notifications:** Expo Push Notifications  

### Database Schema

12 core tables with Row Level Security:

```
users → consultation_requests → ai_smart_briefs
  ↓           ↓
classrooms → uploaded_documents
  ↓
  ├─→ announcements
  └─→ attachment_bins
```

For complete schema documentation, see **[database/DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md)**.

---

## 📚 Documentation

- **[Setup Guide](SETUP_GUIDE.md)** - Complete installation and configuration
- **[Database Schema](database/DATABASE_SCHEMA.md)** - Database design and tables
- **[Project Documentation](PROJECT_DOCUMENTATION.md)** - Academic submission docs
- **[Feature Plan](FINAL_PROJECT_PLAN.md)** - Detailed feature specifications
- **[Wireframes](WIREFRAME.md)** - UI/UX design mockups

---

## 🛠️ Project Structure

```
NEXAD/
├── nexad-app/                 # React Native application
│   ├── src/
│   │   ├── config/           # Supabase configuration
│   │   ├── services/         # API services (auth, consultation, classroom, etc.)
│   │   ├── types/            # TypeScript type definitions
│   │   └── ...               # Screens, components (to be implemented)
│   ├── app.json              # Expo configuration
│   └── package.json          # Dependencies
│
├── database/
│   ├── schema.sql            # PostgreSQL schema
│   └── DATABASE_SCHEMA.md    # Schema documentation
│
└── [Documentation files]
```

---

## 🔑 Core Services Implemented

### ✅ Authentication Service
- Sign in / Sign up
- Session management
- Profile updates

### ✅ Consultation Service
- Create requests
- Fetch student/teacher requests
- Update status
- Schedule consultations

### ✅ Classroom Service
- Create classrooms
- Join with invite codes
- Manage memberships

### ✅ Document Service
- Upload documents (PDF/DOCX)
- File storage integration
- Document retrieval

### ✅ Notification Service
- Push notification registration
- Local notifications
- Scheduled reminders
- Notification management

---

## 🔒 Security

- **Row Level Security (RLS):** All tables protected with access policies
- **Secure Storage:** Private Supabase buckets
- **Authentication:** JWT-based auth with Supabase
- **Environment Variables:** API keys protected

---

## 📈 Development Status

**Current Status: 80% Complete ✅**

- [x] Database schema design
- [x] Backend services implementation  
- [x] Authentication system
- [x] File upload system
- [x] UI/UX implementation
- [x] Classroom management
- [x] Real-time messaging
- [x] Document submission system
- [x] Consultation scheduling
- [x] Push notifications
- [ ] Advanced AI features
- [ ] Analytics dashboard
- [ ] Final testing and optimization
- [ ] Production deployment

**Current Production APK**: https://expo.dev/artifacts/eas/d4CpNLaq96Gsa3yVMoS2QQ.apk

For complete project status and achievements, see **[NEXAD_PROJECT_SUMMARY.md](NEXAD_PROJECT_SUMMARY.md)**.

---

## 🐛 Known Limitations

- Mock authentication (demo only)
- English-only AI analysis
- PDF/DOCX files only (max 10MB)
- Limited offline functionality
- Free tier quotas apply

See **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** for complete limitations.

---

## 🤝 Academic Project

This is coursework for **PRFN102/L - Object-Oriented Programming 2**

- **Submission Date:** January 31, 2026
- **Status:** In Development

---

## 📞 Support

For setup issues:
1. Check **[SETUP_GUIDE.md](SETUP_GUIDE.md)** troubleshooting
2. Review database documentation
3. Open an issue in this repository

---

<div align="center">

**Built with ❤️ for improving academic consultations**

[Repository](https://github.com/ahkeyuuuhh/NEXAD) • [Documentation](SETUP_GUIDE.md) • [Database Schema](database/DATABASE_SCHEMA.md)

</div>
