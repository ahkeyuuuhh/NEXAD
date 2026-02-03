# NEXAD Setup Guide

This guide will walk you through setting up the NEXAD (Next-Generation Academic Assistance Dashboard) project locally.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download](https://git-scm.com/)
- **Expo CLI** (will be installed automatically)
- **Code Editor** (VS Code recommended)

### Optional but Recommended:
- **Expo Go** app on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Android Studio** (for Android emulator)
- **Xcode** (for iOS simulator - Mac only)

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/ahkeyuuuhh/NEXAD.git
cd NEXAD
```

---

## Step 2: Install Dependencies

Navigate to the app directory and install packages:

```bash
cd nexad-app
npm install
```

This will install:
- React Native and Expo
- Supabase client
- React Navigation
- Document picker and file system
- Notifications
- UI components (React Native Paper)
- And all other dependencies

---

## Step 3: Set Up Supabase Backend

### 3.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in project details:
   - **Name:** NEXAD
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your location
5. Wait for project to be provisioned (~2 minutes)

### 3.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `database/schema.sql` from this repository
3. Copy and paste the entire contents into the SQL Editor
4. Click **"Run"** to execute the schema
5. Verify tables were created in **Table Editor**

### 3.3 Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **"Create a new bucket"**
3. Name it: `consultation-documents`
4. Make it **Private** (uncheck "Public bucket")
5. Click **"Create bucket"**

### 3.4 Configure Storage Policies

Go back to **SQL Editor** and run:

```sql
-- Allow authenticated users to upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'consultation-documents');

-- Allow users to read documents
CREATE POLICY "Users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'consultation-documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'consultation-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3.5 Get API Credentials

1. Go to **Project Settings** > **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

---

## Step 4: Configure Environment Variables

1. In the `nexad-app` directory, copy the example environment file:

```bash
cp .env.example .env
```

2. Open `.env` and fill in your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
EXPO_PUBLIC_APP_ENV=development
```

### Getting OpenAI API Key (for AI Smart Briefs)

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **"Create new secret key"**
5. Copy and save the key (you won't see it again)
6. Add it to your `.env` file

> **Note:** OpenAI offers $5 in free credits for new accounts. This is sufficient for demo purposes (~100 Smart Brief generations).

---

## Step 5: Run the Application

### Option 1: Start Development Server

```bash
npm start
```

This opens the Expo DevTools in your browser. You can:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator (Mac only)
- Scan QR code with **Expo Go** app on your phone

### Option 2: Run on Specific Platform

```bash
# Android
npm run android

# iOS (Mac only)
npm run ios

# Web
npm run web
```

---

## Step 6: Test with Demo Accounts

The schema includes pre-seeded demo accounts:

### Students
```
Email: john.doe@student.edu
Password: student123

Email: jane.smith@student.edu
Password: student123
```

### Teachers
```
Email: prof.santos@university.edu
Password: teacher123

Email: dr.chen@university.edu
Password: teacher123
```

### Admin
```
Email: admin@university.edu
Password: admin123
```

> **Security Note:** These are demo accounts with weak passwords. In production, use strong passwords and proper authentication.

---

## Step 7: Verify Setup

After logging in, verify these features work:

### As a Student:
1. ✅ View teacher directory
2. ✅ Create consultation request
3. ✅ Upload documents
4. ✅ Join classroom with invite code
5. ✅ View notifications

### As a Teacher:
1. ✅ View consultation requests
2. ✅ See AI Smart Briefs (after student uploads documents)
3. ✅ Accept/decline requests
4. ✅ Create classroom
5. ✅ Post announcements

---

## Troubleshooting

### Issue: "Cannot connect to Supabase"

**Solution:**
- Verify `.env` file has correct credentials
- Check Supabase project is running (not paused)
- Ensure you're using `EXPO_PUBLIC_` prefix for env variables
- Restart development server after changing `.env`

### Issue: "Document upload fails"

**Solution:**
- Verify storage bucket `consultation-documents` exists
- Check storage policies are configured
- Ensure file is under 10MB
- Check file type is PDF or DOCX

### Issue: "AI Smart Brief not generating"

**Solution:**
- Verify OpenAI API key is valid
- Check you have remaining API credits
- Review Supabase logs for errors
- Ensure document text extraction succeeded

### Issue: "Push notifications not working"

**Solution:**
- On physical device: Check app permissions in device settings
- On simulator: Push notifications don't work on iOS simulator
- Verify Expo project ID in `app.json`
- Check notification permissions were granted

### Issue: "App crashes on Android"

**Solution:**
```bash
# Clear cache and rebuild
cd nexad-app
npm start -- --clear
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# For iOS (Mac only), also reinstall pods
cd ios && pod install && cd ..
```

---

## Development Workflow

### Project Structure

```
nexad-app/
├── src/
│   ├── config/          # Configuration files (Supabase)
│   ├── services/        # API service layer
│   ├── types/           # TypeScript type definitions
│   ├── screens/         # UI screens (to be created)
│   ├── components/      # Reusable components (to be created)
│   └── navigation/      # Navigation setup (to be created)
├── assets/              # Images, fonts, icons
├── app.json             # Expo configuration
├── package.json         # Dependencies
└── .env                 # Environment variables
```

### Best Practices

1. **Use TypeScript:** All files should be `.ts` or `.tsx`
2. **Follow naming conventions:**
   - Components: PascalCase (e.g., `ConsultationCard.tsx`)
   - Services: camelCase (e.g., `authService.ts`)
   - Types: PascalCase interfaces (e.g., `User`, `ConsultationRequest`)
3. **Error Handling:** Always wrap service calls in try-catch
4. **Loading States:** Show loading indicators during async operations
5. **Offline Support:** Use AsyncStorage for caching

---

## Database Management

### View Database

Use Supabase Table Editor:
1. Go to Supabase dashboard
2. Click **Table Editor**
3. Browse tables, view data, add rows

### Run SQL Queries

Use SQL Editor:
1. Go to **SQL Editor**
2. Write and execute queries
3. View results in the output panel

### Example Queries

```sql
-- View all consultation requests
SELECT * FROM consultation_requests 
ORDER BY created_at DESC;

-- View all users by role
SELECT first_name, last_name, email, role 
FROM users 
ORDER BY role;

-- Get consultation count per teacher
SELECT 
  u.first_name || ' ' || u.last_name AS teacher_name,
  COUNT(cr.id) AS request_count
FROM users u
LEFT JOIN consultation_requests cr ON u.id = cr.teacher_id
WHERE u.role = 'teacher'
GROUP BY u.id, u.first_name, u.last_name;
```

---

## API Testing

### Using Supabase Client

Test services in your app:

```typescript
import { authService } from './src/services/authService';

// Test login
const result = await authService.signIn(
  'john.doe@student.edu',
  'student123'
);

if (result.data) {
  console.log('Logged in:', result.data);
} else {
  console.error('Login failed:', result.error);
}
```

---

## Next Steps

Now that your environment is set up:

1. **Build UI Screens:** Create screens for authentication, dashboard, etc.
2. **Implement Navigation:** Set up React Navigation with bottom tabs
3. **Add AI Integration:** Create service for OpenAI API calls
4. **Design Components:** Build reusable UI components
5. **Test Features:** Test each feature with demo accounts
6. **Add Error Handling:** Implement proper error boundaries
7. **Optimize Performance:** Add caching and offline support

---

## Additional Resources

- **Expo Documentation:** [https://docs.expo.dev](https://docs.expo.dev)
- **Supabase Documentation:** [https://supabase.com/docs](https://supabase.com/docs)
- **React Navigation:** [https://reactnavigation.org](https://reactnavigation.org)
- **React Native Paper:** [https://callstack.github.io/react-native-paper/](https://callstack.github.io/react-native-paper/)
- **OpenAI API Docs:** [https://platform.openai.com/docs](https://platform.openai.com/docs)

---

## Need Help?

If you encounter issues:

1. Check this README's troubleshooting section
2. Review error messages in terminal
3. Check Supabase logs in dashboard
4. Verify all environment variables are set
5. Ensure database schema ran successfully

---

## License

This project is for academic purposes as part of PRFN102/L - Object-Oriented Programming 2.

---

**Happy Coding! 🚀**
