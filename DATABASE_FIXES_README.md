# 🔧 DATABASE FIXES REQUIRED

## ⚠️ IMPORTANT: You must run these SQL commands in Supabase before the app will work properly!

### 📍 Where to run these commands:
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste each SQL command below
5. Click "RUN" to execute

---

## Fix #1: Add classroom_number column

**Problem:** The app expects a `classroom_number` column but it doesn't exist in your database.

**Solution:** Run this SQL command:

```sql
ALTER TABLE consultation_requests 
ADD COLUMN IF NOT EXISTS classroom_number VARCHAR(50);

COMMENT ON COLUMN consultation_requests.classroom_number IS 
  'The classroom or room number where the consultation will be held';
```

---

## Fix #2: Enable notification creation (INSERT policy)

**Problem:** Notifications are not being created because there's no INSERT policy. Users can only SELECT and UPDATE their own notifications, but nobody can INSERT new ones.

**Solution:** Run this SQL command:

```sql
CREATE POLICY "Allow authenticated users to create notifications" ON notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON POLICY "Allow authenticated users to create notifications" ON notifications IS 
  'Allows authenticated users to create notifications for other users (e.g., teacher gets notified when student requests consultation)';
```

---

## ✅ How to verify it's working:

After running both SQL commands:

1. **Test classroom_number:**
   - As a teacher, approve a consultation request
   - Enter a classroom number (e.g., "D107")
   - If no error appears, it's working! ✓

2. **Test notifications:**
   - As a student, request a consultation with a teacher
   - As the teacher, check the notifications screen
   - You should see "New Consultation Request 📝" notification ✓

---

## 📋 Quick Copy-Paste (Both Fixes Combined)

Run this single SQL command that includes both fixes:

```sql
-- Fix 1: Add classroom_number column
ALTER TABLE consultation_requests 
ADD COLUMN IF NOT EXISTS classroom_number VARCHAR(50);

COMMENT ON COLUMN consultation_requests.classroom_number IS 
  'The classroom or room number where the consultation will be held';

-- Fix 2: Enable notification creation
CREATE POLICY "Allow authenticated users to create notifications" ON notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON POLICY "Allow authenticated users to create notifications" ON notifications IS 
  'Allows authenticated users to create notifications for other users';
```

---

## 🚨 If you see ANY errors:

1. Take a screenshot of the error message
2. Make sure you're running the command in the correct Supabase project
3. Check if the policies already exist (they might if you ran this before)
4. If you get "policy already exists", that's OK! The fix is already applied.

---

## 📱 After running the SQL commands:

1. Fully uninstall the old APK from your phone
2. Install the new APK (link will be provided after build completes)
3. Test the notifications by:
   - Student requests consultation → Teacher should get notification
   - Teacher approves/declines → Student should get notification
   - Teacher marks as Done/Cancelled → Student should get notification

---

**Need help?** Share the error message and I'll help you fix it!
