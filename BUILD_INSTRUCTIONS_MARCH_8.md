# Build Instructions for Updated APK (March 8, 2026)

## Prerequisites
- Supabase access (for database migration)
- EAS CLI installed and authenticated
- Node.js and npm installed

## Step 1: Apply Database Migration

1. Open Supabase Dashboard (https://supabase.com)
2. Go to your NEXAD project
3. Navigate to SQL Editor
4. Open and run the file: `database/enable_message_deletion.sql`
5. Verify the policies are created successfully

**Or copy and paste this SQL:**

```sql
-- Enable Message Deletion Policies

-- Allow users to delete their own messages
DROP POLICY IF EXISTS "convmsg_delete" ON public.conversation_messages;
CREATE POLICY "convmsg_delete" ON public.conversation_messages
  FOR DELETE USING (
    sender_id = auth.uid()
  );

-- Allow users to delete conversations they are part of
DROP POLICY IF EXISTS "conv_delete" ON public.conversations;
CREATE POLICY "conv_delete" ON public.conversations
  FOR DELETE USING (
    id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

-- Allow users to delete their participant records
DROP POLICY IF EXISTS "convpart_delete" ON public.conversation_participants;
CREATE POLICY "convpart_delete" ON public.conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()
  );
```

## Step 2: Verify Changes Locally (Optional)

```powershell
cd nexad-app
npm start
```

Test the app in Expo Go to verify:
- Profile pictures appear in messages
- File preview modal works
- 10MB file size is accepted
- Message deletion works (long press)
- Conversation deletion works (trash icon)

## Step 3: Build Production APK

### Option A: Using EAS Build (Recommended)

```powershell
cd nexad-app

# Check you're logged in
eas whoami

# If not logged in:
eas login

# Build production APK
eas build --platform android --profile production
```

### Option B: Local Gradle Build

```powershell
cd nexad-app

# Generate Android directory if needed
npx expo prebuild --platform android

# Build APK locally
cd android
.\gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Step 4: Increment Version Number (Before Building)

Update `nexad-app/app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

## Step 5: Test the APK

1. Install the APK on a test device
2. Test all messaging features:
   - ✓ Profile pictures display
   - ✓ File upload shows preview
   - ✓ File send button works
   - ✓ 10MB files accepted
   - ✓ Long press to delete messages
   - ✓ Trash icon deletes conversation
   - ✓ Keyboard doesn't overlap textbox

## Troubleshooting

### EAS Authentication Issues
If you get "Entity not authorized" errors:
```powershell
eas logout
eas login
```

### Build Errors
Check the error logs and ensure:
- All dependencies are installed: `npm install`
- Cache is clear: `npm start -- --clear`
- Android SDK is up to date

### Keyboard Issues
If keyboard still overlaps on certain devices:
- Test on different Android versions
- Adjust `keyboardOffset` calculation if needed

## Deploy to Users

### Method 1: Direct APK Distribution
- Email or share the APK file directly
- Users install via file manager

### Method 2: OTA Update (If using Expo Updates)
```powershell
cd nexad-app
eas update --branch production --message "Messaging revisions: profile pics, 10MB limit, deletion"
```

### Method 3: Google Play Store
- Upload APK to Google Play Console
- Update release notes with changes
- Submit for review

## Release Notes Template

```
Version 1.0.1 - Messaging Updates

New Features:
✓ Profile pictures now appear in all messages and conversations
✓ File size limit increased to 10MB
✓ File preview before sending (manual send button)
✓ Delete individual messages (long press)
✓ Delete entire conversations (trash icon)
✓ Improved keyboard handling

Bug Fixes:
✓ Fixed keyboard overlapping with text input
✓ Fixed message display issues
```

## Rollback Plan

If issues arise:
1. Previous APK is archived in build history
2. Database policies can be reverted with:
```sql
DROP POLICY IF EXISTS "convmsg_delete" ON public.conversation_messages;
DROP POLICY IF EXISTS "conv_delete" ON public.conversations;
DROP POLICY IF EXISTS "convpart_delete" ON public.conversation_participants;
```

## Build Status

- ✅ Code changes complete
- ✅ No TypeScript errors
- ⏳ Database migration pending
- ⏳ APK build pending
- ⏳ Testing pending
