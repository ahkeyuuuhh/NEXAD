# 🚀 Quick Start: Build iOS/Android & Update Website

## TL;DR - 3 Simple Steps

### Step 1: Build the Apps
```bash
# On Windows:
build-ios-android.bat

# On Mac/Linux:
chmod +x build-ios-android.sh
./build-ios-android.sh
```

Choose option 3 (Both platforms) when prompted.

### Step 2: Get the Download URLs
1. Wait 10-20 minutes for builds to complete
2. Go to: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
3. Click on each completed build
4. Copy the "Download" artifact URLs (they look like `https://expo.dev/artifacts/eas/XXXXX.apk` or `.ipa`)

### Step 3: Update the Website
```bash
# On Windows:
update-website-links.bat

# On Mac/Linux:
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

Done! ✅

---

## What This Does

### App Icon
Both iOS and Android already use the same icon (`appIcon.jpg`). No changes needed! ✅

### iOS Build
- Creates an IPA file for iOS devices
- Uses bundle ID: `com.university.nexad`
- Version: 1.0.7
- Icon: Same as Android

### Android Build
- Creates an APK file for Android devices
- Uses package: `com.university.nexad`
- Version: 1.0.7 (versionCode: 9)
- Icon: Same as iOS

### Website Update
- Updates the Android APK download link
- Updates the iOS IPA download link
- Both buttons are already styled and ready on the website

---

## Current vs New

### Current Setup
- Android APK: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds/aaf6476f-3c40-4042-bd48-d3d603dc62f0
- iOS IPA: Not yet built
- Website: Android link active, iOS link placeholder

### After This Process
- Android APK: New build with latest code
- iOS IPA: New build with same icon as Android
- Website: Both download links active and working

---

## Troubleshooting

### "EAS CLI not found"
```bash
npm install -g eas-cli
eas login
```

### "Apple Developer account required" (iOS)
You need an Apple Developer account ($99/year) to build iOS apps. Alternatives:
- Use Expo Go app for testing (no build needed)
- Use preview profile for internal testing (still needs Apple account)

### "Build failed"
1. Check build logs at: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
2. Common issues:
   - iOS: Apple credentials not configured → Run `eas credentials`
   - Android: Usually auto-fixed by EAS
   - Both: Try `eas build --clear-cache`

### "Website changes not showing"
- Clear browser cache
- Use incognito/private mode
- Wait for Vercel deployment to complete (if using Vercel)

---

## Manual Alternative

If scripts don't work, do it manually:

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
Edit `nexad-website/index.html` line 284 (iOS) and line 296 (Android):
```html
<!-- Line 284 - iOS -->
<a href="YOUR_IOS_IPA_URL_HERE" class="download-btn ios-btn">

<!-- Line 296 - Android -->
<a href="YOUR_ANDROID_APK_URL_HERE" class="download-btn android-btn">
```

---

## Files Created

- `BUILD_IOS_AND_UPDATE_WEBSITE.md` - Detailed documentation
- `build-ios-android.sh` / `.bat` - Build automation scripts
- `update-website-links.sh` / `.bat` - Website update scripts
- `QUICK_START_BUILD_AND_DEPLOY.md` - This file

---

## Need Help?

1. Read `BUILD_IOS_AND_UPDATE_WEBSITE.md` for detailed instructions
2. Check Expo docs: https://docs.expo.dev/build/introduction/
3. Check build logs: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
4. Verify app.json configuration in `nexad-app/app.json`

---

## Pro Tips

1. **Parallel Builds**: Choose option 3 to build both platforms simultaneously
2. **Version Bumping**: Update version in `nexad-app/app.json` before building
3. **OTA Updates**: After initial install, use `eas update` for quick updates without rebuilding
4. **Testing**: Test downloads on actual devices before announcing to users
5. **Analytics**: Check download stats in the admin panel after deployment

---

## What's Already Configured ✅

- App icon is the same for both platforms
- Bundle IDs and package names are set
- EAS project is configured
- Website has both download buttons styled
- Download tracking is implemented
- Admin analytics dashboard is ready

You just need to build and update the links!
