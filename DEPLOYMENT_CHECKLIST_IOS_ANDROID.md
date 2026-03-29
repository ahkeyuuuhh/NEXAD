# ✅ iOS & Android Deployment Checklist

## Pre-Build Checklist

- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged into Expo (`eas login`)
- [ ] Apple Developer account ready (for iOS)
- [ ] App icon verified at `nexad-app/assets/appIcon.jpg`
- [ ] Version number checked in `nexad-app/app.json` (currently 1.0.7)

## Build Process

### Option A: Automated (Recommended)
- [ ] Run `build-ios-android.bat` (Windows) or `./build-ios-android.sh` (Mac/Linux)
- [ ] Select option 3 (Both platforms)
- [ ] Choose iOS build type (Production or Preview)
- [ ] Wait for builds to complete (10-20 minutes)

### Option B: Manual
- [ ] Build iOS: `cd nexad-app && eas build --platform ios --profile production`
- [ ] Build Android: `cd nexad-app && eas build --platform android --profile production`
- [ ] Wait for builds to complete

## Get Download URLs

- [ ] Go to https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
- [ ] Find your latest iOS build
- [ ] Click "Download" and copy the artifact URL (ends with `.ipa`)
- [ ] Find your latest Android build
- [ ] Click "Download" and copy the artifact URL (ends with `.apk`)

Example URLs:
```
iOS: https://expo.dev/artifacts/eas/XXXXX-XXXXX-XXXXX.ipa
Android: https://expo.dev/artifacts/eas/XXXXX-XXXXX-XXXXX.apk
```

## Update Website

### Option A: Automated (Recommended)
- [ ] Run `update-website-links.bat` (Windows) or `./update-website-links.sh` (Mac/Linux)
- [ ] Paste iOS IPA URL when prompted
- [ ] Paste Android APK URL when prompted
- [ ] Confirm the update

### Option B: Manual
- [ ] Open `nexad-website/index.html`
- [ ] Find line ~284 (iOS button): `<a href="#" class="download-btn ios-btn">`
- [ ] Replace `#` with your iOS IPA URL
- [ ] Find line ~296 (Android button): `<a href="https://expo.dev/artifacts/eas/..." class="download-btn android-btn">`
- [ ] Replace the URL with your new Android APK URL
- [ ] Save the file

## Deploy Website

- [ ] Navigate to website directory: `cd nexad-website`
- [ ] Stage changes: `git add index.html`
- [ ] Commit: `git commit -m "Update iOS and Android download links"`
- [ ] Push: `git push`
- [ ] Wait for deployment (Vercel auto-deploys)

## Testing

### Test Downloads
- [ ] Visit your website
- [ ] Click iOS download button
- [ ] Verify it downloads the IPA file
- [ ] Click Android download button
- [ ] Verify it downloads the APK file

### Test Installation
- [ ] Install IPA on an iOS device (requires TestFlight or device registration)
- [ ] Install APK on an Android device
- [ ] Verify app icon looks correct on both platforms
- [ ] Verify app launches successfully
- [ ] Test basic functionality (login, navigation, etc.)

### Test Analytics
- [ ] Log into admin panel
- [ ] Check download tracking is working
- [ ] Verify download counts increment

## Post-Deployment

- [ ] Announce new versions to users
- [ ] Monitor for crash reports
- [ ] Check analytics for download numbers
- [ ] Gather user feedback

## Rollback Plan (If Needed)

If something goes wrong:

### Website Rollback
```bash
cd nexad-website
cp index.html.backup index.html  # Restore from backup
git add index.html
git commit -m "Rollback download links"
git push
```

### App Rollback
- Previous builds are still available at: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
- You can revert to any previous build URL on the website

## Verification

After deployment, verify:
- [ ] iOS download link works
- [ ] Android download link works
- [ ] Both apps have the same icon
- [ ] Version numbers are correct
- [ ] Apps launch without crashes
- [ ] Download tracking works in admin panel

## Notes

### Current Configuration
- **App Name**: NEXAD
- **Version**: 1.0.7
- **iOS Bundle ID**: com.university.nexad
- **Android Package**: com.university.nexad
- **App Icon**: `./assets/appIcon.jpg` (same for both)

### Build Profiles
- **Production**: For App Store/Play Store submission
- **Preview**: For internal testing and distribution

### Important URLs
- **Expo Builds**: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
- **Website Repo**: nexad-website/
- **App Repo**: nexad-app/

## Common Issues & Solutions

### iOS Build Fails
**Issue**: "No Apple Developer account"
**Solution**: Enroll in Apple Developer Program ($99/year)

**Issue**: "Provisioning profile error"
**Solution**: Run `eas credentials` to manage iOS credentials

### Android Build Fails
**Issue**: Build errors
**Solution**: Try `eas build --platform android --clear-cache`

### Website Not Updating
**Issue**: Changes not visible
**Solution**: Clear browser cache or use incognito mode

### Download Links Don't Work
**Issue**: 404 error when clicking download
**Solution**: Verify URLs are correct and builds are complete

## Success Criteria

✅ iOS IPA built successfully
✅ Android APK built successfully
✅ Both apps use the same icon
✅ Website updated with new links
✅ Downloads work on website
✅ Apps install on devices
✅ Apps launch successfully
✅ Download tracking works

## Timeline

- **Build Time**: 10-20 minutes per platform (can run in parallel)
- **Website Update**: 5 minutes
- **Deployment**: 2-5 minutes (Vercel)
- **Testing**: 15-30 minutes
- **Total**: ~30-60 minutes

## Support Resources

- **Expo Docs**: https://docs.expo.dev/build/introduction/
- **EAS Build**: https://docs.expo.dev/build/setup/
- **iOS Credentials**: https://docs.expo.dev/app-signing/app-credentials/
- **Troubleshooting**: See `BUILD_IOS_AND_UPDATE_WEBSITE.md`

---

## Quick Reference Commands

```bash
# Build both platforms
cd nexad-app
eas build --platform all --profile production

# Build iOS only
eas build --platform ios --profile production

# Build Android only
eas build --platform android --profile production

# Check build status
eas build:list

# Update website (after getting URLs)
cd nexad-website
# Edit index.html with new URLs
git add index.html
git commit -m "Update download links"
git push

# Rollback if needed
cp index.html.backup index.html
git add index.html
git commit -m "Rollback download links"
git push
```

---

**Last Updated**: Ready for deployment
**Next Review**: After successful deployment
