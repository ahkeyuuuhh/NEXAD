# Students Tab Removal & Enrolled Students Screen Fix

## Issues Fixed

### 1. Students Tab Removal
**Problem**: The "Students" tab was present in both teacher and student classroom hub views, but it wasn't necessary and cluttered the interface.

**Solution**: Removed the "Students" tab from both classroom detail screens.

**Files Modified**:
- `nexad-app/src/screens/teacher/ClassroomDetailScreen.tsx`
- `nexad-app/src/screens/student/StudentClassroomDetailScreen.tsx`

**Changes Made**:
- Updated `Tab` type to exclude "Students"
- Removed "Students" from the tabs array
- Updated conditional logic for empty states and icons
- Removed student rendering logic from the tab content

### 2. Enrolled Students Screen Fix
**Problem**: The "Enrolled Students" screen was showing "Failed to load enrolled students" error due to RLS (Row Level Security) policy issues.

**Root Cause**: The `getClassroomMembers` function was directly querying the `classroom_memberships` table, which has strict RLS policies that can cause recursive lookup issues.

**Solution**: Updated the service to use the dedicated RPC function `get_classroom_members` which handles RLS properly with SECURITY DEFINER privileges.

**Files Modified**:
- `nexad-app/src/services/classroomService.ts`

**Changes Made**:
- Replaced direct table queries with RPC function call
- Used `supabase.rpc('get_classroom_members', { p_classroom_id: classroomId })`
- Added proper error handling and logging
- Maintained the same data structure for compatibility

## Technical Details

### RPC Function Benefits
The `get_classroom_members` RPC function:
- Uses `SECURITY DEFINER` to bypass RLS restrictions
- Properly joins `classroom_memberships` with `student_profiles`
- Avoids recursive RLS policy lookups that cause errors
- Returns consistent data structure

### Database Schema
The fix leverages the existing database function:
```sql
CREATE OR REPLACE FUNCTION public.get_classroom_members(p_classroom_id UUID)
RETURNS TABLE (
  membership_id        UUID,
  student_user_id      UUID,
  joined_at            TIMESTAMPTZ,
  first_name           TEXT,
  last_name            TEXT,
  email                TEXT,
  profile_photo_url    TEXT,
  student_id_number    TEXT,
  department           TEXT,
  course               TEXT
)
```

## OTA Update Details

- **Update ID**: 6c9339d4-f080-4763-83eb-62f92aa303c4
- **Channel**: production
- **Branch**: main
- **Runtime Version**: 1.0.6
- **Platforms**: Android, iOS
- **Message**: "Remove Students tab from classroom hub and fix EnrolledStudents screen RLS issues"

## Verification

The fixes ensure:
1. ✅ Students tab is removed from classroom hub (cleaner interface)
2. ✅ Enrolled Students screen loads properly without RLS errors
3. ✅ Teachers can view all enrolled students with their profiles
4. ✅ Student count displays correctly
5. ✅ All existing functionality (unenroll, batch operations) still works

## Current APK Reference
The fixes are now available via OTA update for the current APK: https://expo.dev/artifacts/eas/d4CpNLaq96Gsa3yVMoS2QQ.apk

Users should restart the app to receive the update automatically.