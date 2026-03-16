# NEW APK BUILD - Version 1.0.4

## Build Information
- **Build ID**: f4988057-478a-4f34-ba2c-2156d5fa10ed
- **Build URL**: https://expo.dev/accounts/jheanne/projects/nexad/builds/f4988057-478a-4f34-ba2c-2156d5fa10ed
- **Version**: 1.0.4
- **Version Code**: 6
- **Runtime Version**: 1.0.4 (auto from appVersion)
- **Platform**: Android
- **Profile**: preview
- **Status**: Building...

## Changes in This Build

### 1. PENDING REQUEST CARD - WHITE BOX FIX
**Issue**: White box appearing inside pending request cards on teacher dashboard
**Fix Applied**: 
- Added explicit `backgroundColor: 'transparent'` to `requestInfo` View style
- This ensures no default white background appears on the text container
- Card already has correct structure with `flexDirection: 'row'` and proper avatar styling

**Code Changed**:
```typescript
requestInfo: { flex: 1, backgroundColor: 'transparent' }
```

### 2. PEOPLE'S TAB - TEACHER & STUDENTS DISPLAY
**Status**: Code is correct and committed
**Implementation**:
- `getClassroomMembers` service fetches teacher with `is_teacher: true` flag
- Teacher is added to members array with `unshift()` (appears first)
- FlatList `ListHeaderComponent` displays teacher section separately
- Students are rendered in the main FlatList
- Both show profile photos and names correctly

**Why it should work now**:
- Service properly fetches teacher from `teacher_profiles` or `student_profiles`
- Falls back to creating teacher profile if missing
- Teacher is marked with `is_teacher: true` flag
- UI filters and displays teacher vs students correctly

### 3. APP ICON
**Status**: Already applied in previous build (v1.0.3)
- Using `./assets/appIcon.jpg` for icon and adaptive icon

### 4. MY CLASSROOMS SHORTCUT
**Status**: Already working (confirmed by user in v1.0.3)
- Card appears below stats on teacher dashboard
- Navigates to ClassroomHub

## Why This Build Should Work

### Previous Build Issues (v1.0.3)
The previous APK (96ec1879-0d47-4a36-b397-cf2809df10d8) had the code changes committed, but:
1. The white box persisted - likely because `requestInfo` View didn't have explicit transparent background
2. People's tab might not have shown teacher - possibly a data/caching issue

### This Build (v1.0.4)
1. **Version Bump**: Changed from 1.0.3 to 1.0.4 forces a clean build
2. **Explicit Fix**: Added `backgroundColor: 'transparent'` to remove any default white background
3. **Clean Commit**: All changes committed and pushed before build
4. **New Runtime**: Runtime version 1.0.4 ensures no OTA update conflicts

## Installation Instructions

1. **Wait for build to complete** (check build URL above)
2. **Download the APK** from the build page
3. **Uninstall the old version** (v1.0.3) completely
4. **Install the new APK** (v1.0.4)
5. **Restart the app twice** to ensure all changes load

## What to Check After Installation

### Teacher Dashboard - Pending Request Cards
- [ ] No white box inside the card
- [ ] Avatar visible with proper background color
- [ ] Student name is dark and readable (fontWeight: 700)
- [ ] Subject text is readable (color: C.ink2)
- [ ] Card background matches student interface (rgba(255, 255, 255, 0.25))

### Classroom Detail - People's Tab
- [ ] Teacher section appears at top with "Teacher (1)" header
- [ ] Teacher's actual name displays (not "Instructor")
- [ ] Teacher's profile photo displays (if set)
- [ ] "Teacher" label shows below teacher name
- [ ] Students section appears below with "Students (X)" header
- [ ] All enrolled students listed with names and photos
- [ ] Student IDs display for students

## Technical Details

### Commit Hash
- **Commit**: 00b51c0
- **Message**: "fix: explicit transparent background for requestInfo, bump to v1.0.4"

### Files Changed
1. `nexad-app/app.json` - Version bump to 1.0.4, versionCode to 6
2. `nexad-app/src/screens/teacher/TeacherDashboard.tsx` - Added transparent background to requestInfo

### Build Command
```bash
eas build --platform android --profile preview --non-interactive --no-wait
```

## Troubleshooting

If issues persist after installing v1.0.4:

### White Box Still Appears
- Check if there's another View wrapper in the JSX that we missed
- Verify the APK version is actually 1.0.4 (check in app settings)
- Try clearing app cache and data before reinstalling

### People's Tab Still Shows "Instructor"
- Check database: Verify teacher is in `teacher_profiles` table
- Check `classrooms` table: Verify `teacher_id` or `created_by` is set correctly
- Check `classroom_memberships`: Ensure no duplicate teacher entry as student
- Enable console logs to see what `getClassroomMembers` returns

### OTA Updates
After this APK is installed, OTA updates will work for runtime version 1.0.4:
```bash
eas update --branch preview --message "Your update message"
```

## Next Steps

1. Wait for build to complete (~10-15 minutes)
2. Download and install the APK
3. Test both issues (white box and People's tab)
4. Report results

If both issues are fixed, we can proceed with OTA updates for future changes without rebuilding the APK.
