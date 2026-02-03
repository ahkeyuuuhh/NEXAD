# NEXAD Quick Start Checklist

Use this checklist to set up your NEXAD development environment step by step.

---

## ☑️ Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Expo Go app on mobile device (optional but recommended)

---

## ☑️ Step 1: Clone Repository

```bash
git clone https://github.com/ahkeyuuuhh/NEXAD.git
cd NEXAD/nexad-app
```

- [ ] Repository cloned successfully
- [ ] Navigated to `nexad-app` directory

---

## ☑️ Step 2: Install Dependencies

```bash
npm install
```

**Expected outcome:** ~788 packages installed, 0 vulnerabilities

- [ ] All dependencies installed
- [ ] No critical errors in console
- [ ] `node_modules` folder created

---

## ☑️ Step 3: Create Supabase Project

1. **Go to:** https://supabase.com
2. **Sign up/Login**
3. **Create new project:**
   - Name: NEXAD
   - Database Password: *(save this!)*
   - Region: *(choose closest)*

- [ ] Supabase project created
- [ ] Project is provisioned (green status)
- [ ] Database password saved securely

---

## ☑️ Step 4: Setup Database Schema

1. **Open:** Supabase Dashboard → SQL Editor
2. **Open file:** `database/schema.sql` from repo
3. **Copy all contents** and paste into SQL Editor
4. **Click "Run"**
5. **Verify:** Go to Table Editor, should see 12 tables

- [ ] Schema executed without errors
- [ ] All 12 tables visible in Table Editor
- [ ] Demo accounts created (check `users` table)

---

## ☑️ Step 5: Create Storage Bucket

1. **Go to:** Storage in Supabase Dashboard
2. **Click:** "Create a new bucket"
3. **Name:** `consultation-documents`
4. **Privacy:** Private (unchecked)
5. **Click:** "Create bucket"

- [ ] Storage bucket created
- [ ] Bucket is private
- [ ] Bucket name is exactly `consultation-documents`

---

## ☑️ Step 6: Configure Storage Policies

**In SQL Editor, run:**

```sql
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'consultation-documents');

CREATE POLICY "Users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'consultation-documents');

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'consultation-documents');
```

- [ ] All 3 policies created successfully
- [ ] No errors in SQL output

---

## ☑️ Step 7: Get API Credentials

1. **Go to:** Project Settings → API
2. **Copy these values:**
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJ...` (long string)

- [ ] Project URL copied
- [ ] Anon key copied

---

## ☑️ Step 8: Configure Environment Variables

```bash
# In nexad-app directory
cp .env.example .env
```

**Edit `.env` file with your values:**

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-openai-key (optional)
```

- [ ] `.env` file created
- [ ] Supabase URL added
- [ ] Supabase anon key added
- [ ] OpenAI key added (optional)

---

## ☑️ Step 9: Get OpenAI API Key (Optional)

**For AI Smart Briefs feature:**

1. **Go to:** https://platform.openai.com
2. **Sign up/Login**
3. **Go to:** API Keys
4. **Create new secret key**
5. **Copy and add to `.env`**

- [ ] OpenAI account created
- [ ] API key generated
- [ ] Key added to `.env`
- [ ] Free $5 credit confirmed

**Skip this step if you want to implement AI later.**

---

## ☑️ Step 10: Start Development Server

```bash
npm start
```

**Expected outcome:**
- Metro bundler starts
- QR code appears in terminal
- Expo DevTools open in browser

- [ ] Metro bundler running
- [ ] No errors in console
- [ ] QR code visible
- [ ] DevTools opened

---

## ☑️ Step 11: Run on Device/Emulator

**Choose one option:**

### Option A: Physical Device (Recommended)
1. Install Expo Go app ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Scan QR code with Expo Go
3. Wait for app to load

- [ ] Expo Go installed
- [ ] QR code scanned
- [ ] App loaded successfully

### Option B: Android Emulator
```bash
npm run android
```
- [ ] Android Studio installed
- [ ] Emulator running
- [ ] App launched

### Option C: iOS Simulator (Mac only)
```bash
npm run ios
```
- [ ] Xcode installed
- [ ] Simulator running
- [ ] App launched

---

## ☑️ Step 12: Test with Demo Accounts

**Try logging in with these accounts:**

### Student Account
- Email: `john.doe@student.edu`
- Password: `student123`

### Teacher Account
- Email: `prof.santos@university.edu`
- Password: `teacher123`

### Admin Account
- Email: `admin@university.edu`
- Password: `admin123`

- [ ] Student login works
- [ ] Teacher login works
- [ ] Admin login works
- [ ] No errors on login

---

## ☑️ Step 13: Verify Features

### As Student:
- [ ] Can view teacher directory
- [ ] Can create consultation request
- [ ] Can upload documents
- [ ] Can join classroom with code
- [ ] Receives notifications

### As Teacher:
- [ ] Can view consultation requests
- [ ] Can accept/decline requests
- [ ] Can create classroom
- [ ] Can post announcements
- [ ] Can create attachment bins

---

## ☑️ Step 14: Check Database

**In Supabase Dashboard → Table Editor:**

- [ ] `users` table has 7 records (3 teachers, 3 students, 1 admin)
- [ ] `consultation_requests` table exists and is empty
- [ ] `classrooms` table exists and is empty
- [ ] `notifications` table exists

---

## 🎉 Setup Complete!

If all checkboxes are checked, your development environment is ready!

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Supabase"
- [ ] Verify `.env` file has correct credentials
- [ ] Restart development server: `Ctrl+C`, then `npm start`
- [ ] Check Supabase project is active (not paused)

### Issue: "Module not found" errors
```bash
rm -rf node_modules
npm install
npm start -- --clear
```
- [ ] Cleared cache and reinstalled

### Issue: "Storage upload fails"
- [ ] Verify bucket name is exactly `consultation-documents`
- [ ] Check storage policies are created
- [ ] Ensure file is under 10MB

### Issue: "Login fails with demo accounts"
- [ ] Check database seed data ran successfully
- [ ] Verify `users` table has demo accounts
- [ ] Try resetting database and re-running schema.sql

### Issue: "App won't load on Expo Go"
- [ ] Check phone and computer are on same WiFi
- [ ] Try tunnel mode: `npm start -- --tunnel`
- [ ] Restart Expo Go app

---

## 📚 Next Steps

Now that setup is complete:

1. **Read Documentation:**
   - [ ] [SETUP_GUIDE.md](../SETUP_GUIDE.md) for detailed info
   - [ ] [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) for database details
   - [ ] [PROJECT_DOCUMENTATION.md](../PROJECT_DOCUMENTATION.md) for features

2. **Start Development:**
   - [ ] Create UI screens
   - [ ] Implement navigation
   - [ ] Build components
   - [ ] Integrate AI features
   - [ ] Add tests

3. **Resources:**
   - [ ] Bookmark Expo docs: https://docs.expo.dev
   - [ ] Bookmark Supabase docs: https://supabase.com/docs
   - [ ] Join Expo Discord for help
   - [ ] Review React Navigation docs

---

## ✅ Verification Commands

**Test Supabase connection:**
```typescript
import { supabase } from './src/config/supabase';
const { data, error } = await supabase.from('users').select('count');
console.log('Connection test:', data);
```

**Test authentication:**
```typescript
import { authService } from './src/services/authService';
const result = await authService.signIn('john.doe@student.edu', 'student123');
console.log('Auth test:', result);
```

---

## 📊 Setup Status Overview

```
Prerequisites        [✅] Complete
Repository          [✅] Cloned
Dependencies        [✅] Installed
Supabase Project    [✅] Created
Database Schema     [✅] Deployed
Storage Bucket      [✅] Configured
Environment Vars    [✅] Set
Dev Server         [✅] Running
Demo Accounts      [✅] Working
```

---

## 🎯 Time Estimate

- **Minimum:** 30 minutes (if experienced)
- **Average:** 1-2 hours (first time)
- **With issues:** Up to 3 hours

---

## 💡 Pro Tips

1. **Keep credentials safe:** Never commit `.env` file
2. **Use version control:** Commit after each major step
3. **Read error messages:** Most issues are self-explanatory
4. **Check Supabase logs:** Dashboard → Logs for backend issues
5. **Use TypeScript:** Enable strict mode for better type safety
6. **Test frequently:** Run app after each feature implementation
7. **Document changes:** Comment your code and update docs

---

## 🆘 Need Help?

1. Check [SETUP_GUIDE.md](../SETUP_GUIDE.md) troubleshooting section
2. Review [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)
3. Check Supabase Dashboard logs
4. Verify all environment variables
5. Try restarting development server
6. Clear cache: `npm start -- --clear`

---

**Ready to build something amazing! 🚀**

*Last Updated: February 3, 2026*
