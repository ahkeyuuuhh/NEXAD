# 🎯 START HERE - iOS & Android Build Guide

## What You Asked For

1. ✅ Create an iOS IPA for iOS users
2. ✅ Make the iOS app icon the same as Android's APK app icon
3. ✅ Update the Android APK on the website
4. ✅ Replace the download links on the website

## Good News! 🎉

The app icon is **already configured** to be the same for both iOS and Android!
- Both platforms use: `./assets/appIcon.jpg`
- No changes needed to the icon configuration

## What I've Created for You

### 📚 Documentation
1. **QUICK_START_BUILD_AND_DEPLOY.md** - Start here! Quick 3-step guide
2. **BUILD_IOS_AND_UPDATE_WEBSITE.md** - Detailed instructions with troubleshooting
3. **DEPLOYMENT_CHECKLIST_IOS_ANDROID.md** - Complete checklist for deployment

### 🔧 Automation Scripts

#### Windows Users:
- `build-ios-android.bat` - Builds iOS and/or Android apps
- `update-website-links.bat` - Updates website download links
- `show-build-status.bat` - Shows current status and next steps

#### Mac/Linux Users:
- `build-ios-android.sh` - Builds iOS and/or Android apps
- `update-website-links.sh` - Updates website download links
- `show-build-status.sh` - Shows current status and next steps

---

## 🚀 Quick Start (3 Steps)

### Step 1: Build the Apps (10-20 minutes)

**Windows:**
```cmd
build-ios-android.bat
```

**Mac/Linux:**
```bash
chmod +x build-ios-android.sh
./build-ios-android.sh
```

When prompted:
- Choose option **3** (Both platforms)
- For iOS, choose **2** (Preview/Internal) if you don't have App Store approval yet

### Step 2: Get Download URLs (2 minutes)

1. Wait for builds to complete
2. Go to: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
3. Click on each completed build
4. Copy the "Download" artifact URLs

The URLs will look like:
```
iOS: https://expo.dev/artifacts/eas/XXXXX.ipa
Android: https://expo.dev/artifacts/eas/XXXXX.apk
```

### Step 3: Update Website (5 minutes)

**Windows:**
```cmd
update-website-links.bat
```

**Mac/Linux:**
```bash
chmod +x update-website-links.sh
./update-website-links.sh
```

Paste the URLs when prompted, then deploy:
```bash
cd nexad-website
git add index.html
git commit -m "Update iOS and Android download links"
git push
```

**Done!** ✅

---

## Current Status

### App Configuration
- **Name**: NEXAD
- **Version**: 1.0.7
- **iOS Bundle ID**: com.university.nexad
- **Android Package**: com.university.nexad
- **App Icon**: `./assets/appIcon.jpg` ✅ (SAME for both platforms)

### Current Downloads
- **Android APK**: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds/aaf6476f-3c40-4042-bd48-d3d603dc62f0
- **iOS IPA**: Not yet built (you'll create this)

### Website Status
- iOS download button exists but has placeholder link (`href="#"`)
- Android download button has old APK link
- Both buttons are styled and ready to use

---

## What Happens During the Build

### iOS Build
1. EAS will ask for Apple Developer credentials (if not configured)
2. Build takes ~10-20 minutes
3. You get a download link for the `.ipa` file
4. The app will have the same icon as Android ✅

### Android Build
1. EAS handles everything automatically
2. Build takes ~10-20 minutes
3. You get a download link for the `.apk` file
4. This will be the updated version with latest code

---

## Prerequisites

Before you start, make sure you have:

1. **EAS CLI installed**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into Expo**
   ```bash
   eas login
   ```

3. **Apple Developer Account** (for iOS)
   - Required for iOS builds
   - Costs $99/year
   - Sign up at: https://developer.apple.com

---

## If Scripts Don't Work

Do it manually:

### Build iOS:
```bash
cd nexad-app
eas build --platform ios --profile production
```

### Build Android:
```bash
cd nexad-app
eas build --platform android --profile production
```

### Update Website:
Edit `nexad-website/index.html`:
- Line 284: Change iOS button `href="#"` to your iOS IPA URL
- Line 296: Change Android button URL to your new Android APK URL

---

## Testing After Deployment

1. Visit your website
2. Click both download buttons
3. Verify files download correctly
4. Install on test devices:
   - iOS: Requires TestFlight or device registration
   - Android: Enable "Install from unknown sources"
5. Check that app icons match on both platforms
6. Test basic app functionality

---

## Troubleshooting

### "EAS CLI not found"
```bash
npm install -g eas-cli
eas login
```

### "Apple Developer account required"
You need to enroll in the Apple Developer Program ($99/year). Without it, you can:
- Use Expo Go for testing (no build needed)
- Build for Android only

### "Build failed"
1. Check logs at: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
2. Try clearing cache: `eas build --clear-cache`
3. For iOS: Run `eas credentials` to check credentials

### "Website not updating"
- Clear browser cache
- Use incognito mode
- Wait for Vercel deployment

---

## What's Already Done ✅

1. App icon configuration is identical for both platforms
2. Website has both iOS and Android download buttons
3. Download tracking is implemented
4. Admin analytics dashboard is ready
5. All build profiles are configured

You just need to:
1. Run the build scripts
2. Update the website links
3. Deploy!

---

## Need More Help?

- **Quick guide**: Read `QUICK_START_BUILD_AND_DEPLOY.md`
- **Detailed guide**: Read `BUILD_IOS_AND_UPDATE_WEBSITE.md`
- **Checklist**: Use `DEPLOYMENT_CHECKLIST_IOS_ANDROID.md`
- **Check status**: Run `show-build-status.bat` or `show-build-status.sh`

---

## Summary

✅ iOS and Android will have the **same app icon** (already configured)
✅ Scripts are ready to **build both apps**
✅ Scripts are ready to **update the website**
✅ Website already has **both download buttons** styled
✅ **Download tracking** is implemented
✅ Everything is ready - just run the scripts!

**Estimated Time**: 30-60 minutes total (mostly waiting for builds)

---

## Ready to Start?

**Windows:**
```cmd
show-build-status.bat
```

**Mac/Linux:**
```bash
chmod +x show-build-status.sh
./show-build-status.sh
```

This will show you the current status and next steps!

Good luck! 🚀
