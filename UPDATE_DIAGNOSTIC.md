# OTA Update Diagnostic Guide

## Current Status

**APK Build ID**: a3852028-3dec-48a1-86c5-4934f149a76e  
**Channel**: preview  
**Runtime Version**: 1.0.2  
**Latest Update**: af27a4c4-bd57-4607-a6b7-766114bd2e90 (5 minutes ago)

## Why Updates Might Not Be Showing

### 1. App is in Development Mode
If the app was built with `expo-dev-client` and is running in development mode, OTA updates are disabled.

**Check**: Look for a development menu or "Dev" indicator in the app.

### 2. Update Check Timing
The app checks for updates `ON_LOAD` (when it starts), but:
- It needs to fully start and reach the dashboard
- The check happens in the background
- The update is downloaded but not applied until next restart

### 3. Cached Update
The app might have downloaded an old update and is stuck on it.

## SOLUTION: Complete App Reset

Follow these steps EXACTLY:

### Step 1: Clear Everything
```
1. Go to Settings → Apps → NEXAD
2. Tap "Storage"
3. Tap "Clear Cache"
4. Tap "Clear Data" (this will log you out)
5. Tap "Force Stop"
```

### Step 2: Uninstall and Reinstall
```
1. Long press NEXAD icon
2. Tap "Uninstall"
3. Reinstall the APK: application-a3852028-3dec-48a1-86c5-4934f149a76e.apk
```

### Step 3: First Launch
```
1. Open NEXAD
2. Wait on the login screen for 30 seconds (update downloads)
3. Close NEXAD completely (swipe away)
4. Wait 10 seconds
5. Open NEXAD again
6. Log in
```

### Step 4: Second Launch (Apply Update)
```
1. After logging in, close NEXAD completely
2. Wait 10 seconds
3. Open NEXAD again
4. Changes should now be visible
```

## Alternative: Build a New APK

If OTA updates continue to fail, build a fresh APK with all changes:

```bash
cd nexad-app
eas build --platform android --profile preview
```

This will create a new APK with:
- All code changes baked in
- Fresh update mechanism
- New build ID

## How to Verify Updates Are Working

### Check 1: Look for Console Logs
If you have access to logs (via `adb logcat`), you should see:
```
🔵 Checking for updates...
🟢 Update available! Fetching...
🟢 Update fetched! Reloading...
```

### Check 2: Check Update Manifest
The app stores update info in:
```
/data/data/com.university.nexad/files/.expo-internal/
```

### Check 3: Visible Changes
After proper restart, you should see:
1. ✅ NEXAD GIF on loading screens
2. ✅ Lighter profile cards
3. ✅ Smooth page transitions
4. ✅ Bigger welcome screen logo
5. ✅ Black edit profile button
6. ✅ Attachment bin opens correctly
7. ✅ Classroom cards with white text
8. ✅ Names non-editable in settings

## Technical Details

### Update Mechanism
1. App starts → Checks for updates in background
2. If update available → Downloads silently
3. Update stored in cache
4. Next app restart → Applies cached update
5. App runs with new code

### Why Two Restarts?
- **First restart**: Downloads the update
- **Second restart**: Applies the update

### Fingerprint Compatibility
Build fingerprint: `ae13ae60ce27b30c2a43cb63866e14b84ad977e2`

Updates must be compatible with this fingerprint. All our updates are compatible (same runtime version 1.0.2).

## If Nothing Works

### Option 1: Wait Longer
Sometimes updates take time to propagate. Wait 1 hour, then try the complete reset process again.

### Option 2: New Build
Build a fresh APK with all changes included:
```bash
eas build --platform android --profile preview --message "Fresh build with all UI updates"
```

### Option 3: Check Network
Ensure the device has a stable internet connection when opening the app. Updates download from:
```
https://u.expo.dev/d2fcd258-30e3-4ae0-aab5-2e57d66de650
```

## Summary

**Most Likely Issue**: App needs complete data clear + reinstall

**Quick Fix**: 
1. Clear app data
2. Force stop
3. Reinstall APK
4. Open → Wait 30s → Close → Wait 10s → Open

**Nuclear Option**: Build new APK with all changes baked in

The updates ARE published correctly. The issue is with the app not fetching/applying them properly.
