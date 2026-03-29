# Build iOS IPA & Update Website - Complete Guide

## Overview
This guide will help you:
1. Ensure the iOS app icon matches the Android app icon
2. Build a production iOS IPA
3. Build an updated Android APK
4. Update the website with new download links

## Current Status
- Android APK: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds/aaf6476f-3c40-4042-bd48-d3d603dc62f0
- App Icon: `./assets/appIcon.jpg` (already configured for both platforms)
- iOS Bundle ID: `com.university.nexad`
- Android Package: `com.university.nexad`

## Prerequisites
- EAS CLI installed: `npm install -g eas-cli`
- Logged into Expo: `eas login`
- Apple Developer Account (for iOS builds)

---

## Step 1: Verify App Icon Configuration

The app icon is already configured correctly in `app.json`:
- iOS: Uses `./assets/appIcon.jpg`
- Android: Uses `./assets/appIcon.jpg` as foreground image

Both platforms will use the same icon! ✅

---

## Step 2: Build iOS IPA (Production)

### Option A: Build for App Store Distribution
```bash
cd nexad-app
eas build --platform ios --profile production
```

### Option B: Build for Internal Distribution (Ad Hoc)
```bash
cd nexad-app
eas build --platform ios --profile preview
```

**Note:** For internal distribution without App Store, use the preview profile. You'll need to register test devices in your Apple Developer account.

### What happens during the build:
1. EAS will prompt you to configure iOS credentials (if not already set up)
2. You may need to provide your Apple Developer account credentials
3. Build will take 10-20 minutes
4. You'll receive a download link when complete

---

## Step 3: Build Updated Android APK

```bash
cd nexad-app
eas build --platform android --profile production
```

This will create a new production APK with the latest code and version 1.0.7.

---

## Step 4: Get Download Links

After each build completes:

1. Go to https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
2. Find your latest builds
3. Copy the artifact download URLs

The URLs will look like:
- Android: `https://expo.dev/artifacts/eas/[BUILD_ID].apk`
- iOS: `https://expo.dev/artifacts/eas/[BUILD_ID].ipa`

---

## Step 5: Update Website Download Links

### Manual Update:
Edit `nexad-website/index.html` and replace the download button URLs:

**Current Android URL (line 296):**
```html
<a href="https://expo.dev/artifacts/eas/jy8mSzY1mcXU3dk5Xkxfb.apk" class="download-btn android-btn">
```

**Update to your new URLs:**
```html
<!-- Android APK -->
<a href="YOUR_NEW_ANDROID_APK_URL" class="download-btn android-btn">
    <div class="download-btn-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.6,9.48l1.84-3.18c0.16-0.31,0.04-0.69-0.26-0.85c-0.29-0.15-0.65-0.06-0.83,0.22l-1.88,3.24 c-2.86-1.21-6.08-1.21-8.94,0L5.65,5.67c-0.19-0.29-0.58-0.38-0.87-0.2C4.5,5.65,4.41,6.01,4.56,6.3L6.4,9.48 C3.3,11.25,1.28,14.44,1,18h22C22.72,14.44,20.7,11.25,17.6,9.48z M7,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25S8.25,13.31,8.25,14C8.25,14.69,7.69,15.25,7,15.25z M17,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25C18.25,14.69,17.69,15.25,17,15.25z"/>
        </svg>
    </div>
    <div class="download-btn-text">
        <span class="download-btn-label">Download</span>
        <span class="download-btn-store">Android APK</span>
    </div>
</a>

<!-- iOS IPA -->
<a href="YOUR_NEW_IOS_IPA_URL" class="download-btn ios-btn">
    <div class="download-btn-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05,20.28c-0.98,0.95-2.05,0.8-3.08,0.35c-1.09-0.46-2.09-0.48-3.24,0c-1.44,0.62-2.2,0.44-3.06-0.35 C2.79,15.25,3.51,7.59,9.05,7.31c1.35,0.07,2.29,0.74,3.08,0.8c1.18-0.24,2.31-0.93,3.57-0.84c1.51,0.12,2.65,0.72,3.4,1.8 c-3.12,1.87-2.38,5.98,0.48,7.13c-0.57,1.5-1.31,2.99-2.54,4.09L17.05,20.28z M12.03,7.25c-0.15-2.23,1.66-4.07,3.74-4.25 c0.29,2.58-2.34,4.5-3.74,4.25z"/>
        </svg>
    </div>
    <div class="download-btn-text">
        <span class="download-btn-label">Download</span>
        <span class="download-btn-store">iOS IPA</span>
    </div>
</a>
```

---

## Step 6: Deploy Website Changes

```bash
cd nexad-website
git add .
git commit -m "Update app download links - iOS IPA and Android APK"
git push
```

If using Vercel, it will auto-deploy. Otherwise, deploy using your hosting method.

---

## Quick Commands Summary

```bash
# 1. Build iOS IPA
cd nexad-app
eas build --platform ios --profile production

# 2. Build Android APK
eas build --platform android --profile production

# 3. Wait for builds to complete and get URLs from:
# https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds

# 4. Update website (manual edit of index.html)

# 5. Deploy website
cd nexad-website
git add .
git commit -m "Update download links"
git push
```

---

## Troubleshooting

### iOS Build Issues:
- **"No Apple Developer account"**: You need to enroll in Apple Developer Program ($99/year)
- **"Provisioning profile error"**: Run `eas credentials` to manage iOS credentials
- **"Device not registered"**: For ad-hoc builds, register devices in Apple Developer portal

### Android Build Issues:
- **"Keystore error"**: EAS manages this automatically for you
- **Build fails**: Check `eas build --platform android --profile production --clear-cache`

### Website Update Issues:
- **Changes not showing**: Clear browser cache or use incognito mode
- **Download tracking not working**: Check browser console for errors

---

## Notes

1. **App Icon**: Both iOS and Android now use `appIcon.jpg` - they will look identical ✅
2. **Version**: Current version is 1.0.7 (versionCode 9 for Android)
3. **Distribution**: iOS IPA files can be distributed via TestFlight or direct download (requires device registration)
4. **Updates**: After initial install, you can push OTA updates using `eas update`

---

## Next Steps After Building

1. Test the IPA on an iOS device
2. Test the APK on an Android device
3. Verify the app icons look correct on both platforms
4. Update the website with the new download links
5. Test the download buttons on the website
6. Monitor download analytics in the admin panel

---

## Support

If you encounter issues:
1. Check EAS build logs: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
2. Review Expo documentation: https://docs.expo.dev/build/introduction/
3. Check Apple Developer portal for iOS issues
4. Verify your EAS account has proper permissions
