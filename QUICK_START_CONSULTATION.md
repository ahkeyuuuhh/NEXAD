# 🚀 Virtual Consultation - Quick Start Guide

## ⚡ 5 Minutes to Deploy

All code is ready. Just follow these 5 steps:

---

## Step 1: Daily.co API Key (2 min)

1. Go to: https://www.daily.co/
2. Sign up (free)
3. Copy API key from: Developers → API Keys
4. Edit `nexad-app/.env`:
   ```
   EXPO_PUBLIC_DAILY_API_KEY=paste_your_key_here
   ```

---

## Step 2: Database (1 min)

1. Open Supabase Dashboard
2. SQL Editor
3. Run: `database/create_virtual_consultations.sql`

---

## Step 3: Prebuild (1 min)

```bash
cd nexad-app
npx expo prebuild --clean
```

---

## Step 4: Build APK (15 min)

```bash
eas build --platform android --profile production
```

Wait for build to complete.

---

## Step 5: Test (1 min)

1. Download APK
2. Install on device
3. Test feature!

---

## ✅ Files Created

### Services
- ✅ `nexad-app/src/services/dailyService.ts`
- ✅ `nexad-app/src/services/consultationService.ts`

### Screens
- ✅ `nexad-app/src/screens/teacher/TeacherConsultationScreen.tsx`
- ✅ `nexad-app/src/screens/student/StudentJoinConsultationScreen.tsx`
- ✅ `nexad-app/src/screens/ConsultationQRScannerScreen.tsx`
- ✅ `nexad-app/src/screens/VideoCallScreen.tsx`

### Database
- ✅ `database/create_virtual_consultations.sql`

### Config
- ✅ `nexad-app/App.tsx` (navigation updated)
- ✅ `nexad-app/app.json` (version 1.0.8, permissions)

---

## 🎯 How It Works

### Teacher:
```
Dashboard → Virtual Consultation → Create
→ Get code (ABC123) + QR
→ Share with student
→ Start video call
```

### Student:
```
Dashboard → Join Consultation
→ Enter code OR scan QR
→ Join video call
```

---

## 📋 Pre-Build Checklist

- [ ] Daily.co API key in `.env`
- [ ] Database migration run
- [ ] `npx expo prebuild --clean` done
- [ ] Ready to build!

---

## 🎉 That's It!

Run `eas build` and you're done!

For detailed docs, see:
- `VIRTUAL_CONSULTATION_COMPLETE.md` - Full guide
- `VIRTUAL_CONSULTATION_SUMMARY.md` - Technical details
- `ADD_CONSULTATION_BUTTONS.md` - Dashboard integration
