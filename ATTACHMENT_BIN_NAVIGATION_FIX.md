# Attachment Bin Navigation Fix

## Issue
Students were experiencing a white screen when trying to open attachment bins from the classroom hub. The app was no longer crashing but navigation to the AttachmentBinSubmissionScreen was not working.

## Root Cause
The AttachmentBinSubmissionScreen was using `StatusBar` component but it was not imported in the React Native imports. This caused the screen to fail to render when students tapped on attachment bins.

## Fix Applied
Added `StatusBar` to the React Native imports in `AttachmentBinSubmissionScreen.tsx`:

```typescript
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar, // <- Added this import
} from 'react-native';
```

## Files Modified
- `nexad-app/src/screens/student/AttachmentBinSubmissionScreen.tsx`

## OTA Update Details
- **Update ID**: 019cf615-4d56-749a-ac9a-bd4a08c5ba35 (Android), 019cf615-4d56-708b-97d6-b429a4d08207 (iOS)
- **Runtime Version**: 1.0.6
- **Channel**: production
- **Message**: "Fix attachment bin navigation - add missing StatusBar import"
- **Status**: Successfully deployed

## Testing Instructions
1. Force close and reopen the app to receive the OTA update
2. Navigate to a classroom as a student
3. Tap on any attachment bin
4. The AttachmentBinSubmissionScreen should now load properly instead of showing a white screen

## Current APK Reference
https://expo.dev/artifacts/eas/d4CpNLaq96Gsa3yVMoS2QQ.apk

The fix is now live and students should be able to access attachment bin details properly.