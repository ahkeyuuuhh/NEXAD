# ✅ Virtual Consultation - Deployment Checklist

Use this checklist to ensure everything is ready before building the APK.

---

## Pre-Deployment Checklist

### 1. Daily.co Setup
- [ ] Created Daily.co account at https://www.daily.co/
- [ ] Obtained API key from Developers → API Keys
- [ ] Added API key to `nexad-app/.env`:
      ```
      EXPO_PUBLIC_DAILY_API_KEY=your_key_here
      ```
- [ ] Verified API key is not empty or placeholder

### 2. Database Setup
- [ ] Opened Supabase Dashboard
- [ ] Navigated to SQL Editor
- [ ] Ran `database/create_virtual_consultations.sql`
- [ ] Verified `virtual_consultations` table exists
- [ ] Checked RLS policies are enabled
- [ ] Tested `generate_invite_code()` function
- [ ] Tested `join_consultation_by_code()` function

### 3. Code Verification
- [ ] All consultation screens created:
      - [ ] `TeacherConsultationScreen.tsx`
      - [ ] `StudentJoinConsultationScreen.tsx`
      - [ ] `ConsultationQRScannerScreen.tsx`
      - [ ] `VideoCallScreen.tsx`
- [ ] All services created:
      - [ ] `dailyService.ts`
      - [ ] `consultationService.ts`
- [ ] Navigation updated in `App.tsx`
- [ ] Deep linking configured
- [ ] No TypeScript errors (run `npm run tsc`)

### 4. App Configuration
- [ ] `app.json` version is 1.0.8
- [ ] `app.json` versionCode is 10
- [ ] Camera permission added
- [ ] Microphone permission added
- [ ] Vision camera plugin configured

### 5. Dependencies
- [ ] `@daily-co/react-native-daily-js` installed
- [ ] `react-native-qrcode-svg` installed
- [ ] `react-native-svg` installed
- [ ] `react-native-vision-camera` installed
- [ ] `vision-camera-code-scanner` installed
- [ ] All dependencies in `package.json`
- [ ] No dependency conflicts

---

## Build Process Checklist

### 1. Pre-Build
- [ ] Committed all changes to git
- [ ] Backed up current working code
- [ ] Closed all running development servers
- [ ] Cleared Metro bundler cache

### 2. Generate Native Code
- [ ] Ran `npx expo prebuild --clean`
- [ ] No errors during prebuild
- [ ] Android folder generated
- [ ] Permissions added to AndroidManifest.xml

### 3. Build APK
- [ ] Logged into EAS: `eas login`
- [ ] Ran `eas build --platform android --profile production`
- [ ] Build started successfully
- [ ] Monitoring build progress
- [ ] Build completed without errors
- [ ] Downloaded APK from provided link

---

## Post-Build Testing Checklist

### 1. Installation
- [ ] APK downloaded successfully
- [ ] APK installed on test device
- [ ] App opens without crashes
- [ ] No permission errors on startup

### 2. Teacher Flow Testing
- [ ] Can navigate to Virtual Consultation screen
- [ ] Can create consultation
- [ ] Invite code displays (6 characters)
- [ ] QR code displays correctly
- [ ] Can share invite code
- [ ] Can start video call
- [ ] Camera toggle works
- [ ] Microphone toggle works
- [ ] Can see participant count
- [ ] Can leave call
- [ ] Consultation marked as completed

### 3. Student Flow Testing
- [ ] Can navigate to Join Consultation screen
- [ ] Can enter invite code manually
- [ ] Code validation works
- [ ] Can tap "Scan QR Code"
- [ ] Camera permission requested
- [ ] Camera opens for scanning
- [ ] QR code scanning works
- [ ] Joins video call successfully
- [ ] Camera toggle works
- [ ] Microphone toggle works
- [ ] Can leave call

### 4. Database Testing
- [ ] Consultation record created in database
- [ ] Status updates correctly (active → in_progress → completed)
- [ ] Student info added when joining
- [ ] Duration calculated correctly
- [ ] Timestamps recorded properly
- [ ] Room cleaned up after call

### 5. Error Handling Testing
- [ ] Invalid code shows error
- [ ] Expired code shows error
- [ ] Camera permission denial handled
- [ ] Network error handled gracefully
- [ ] Daily.co connection error handled

---

## Production Deployment Checklist

### 1. Final Verification
- [ ] All features tested on multiple devices
- [ ] No crashes or critical bugs
- [ ] Performance is acceptable
- [ ] UI matches NEXAD design
- [ ] All text is correct (no typos)

### 2. Documentation
- [ ] Updated README with new feature
- [ ] Created user guide for teachers
- [ ] Created user guide for students
- [ ] Documented troubleshooting steps

### 3. Deployment
- [ ] APK uploaded to distribution platform
- [ ] Release notes prepared
- [ ] Users notified of new feature
- [ ] Support team briefed

### 4. Monitoring
- [ ] Daily.co usage monitored
- [ ] Database performance checked
- [ ] User feedback collected
- [ ] Error logs reviewed

---

## Rollback Plan

If issues occur after deployment:

### Immediate Actions
- [ ] Identify the issue
- [ ] Assess severity
- [ ] Decide: fix forward or rollback

### Rollback Steps
- [ ] Distribute previous APK (1.0.7)
- [ ] Notify users of temporary rollback
- [ ] Fix issues in development
- [ ] Re-test thoroughly
- [ ] Deploy fixed version

---

## Success Criteria

The deployment is successful when:

- [ ] Teachers can create consultations
- [ ] Students can join consultations
- [ ] Video calls work reliably
- [ ] No critical bugs reported
- [ ] User feedback is positive
- [ ] Daily.co usage within limits
- [ ] Database performance is good

---

## Support Resources

### Documentation
- `VIRTUAL_CONSULTATION_COMPLETE.md` - Full implementation guide
- `VIRTUAL_CONSULTATION_SUMMARY.md` - Technical summary
- `QUICK_START_CONSULTATION.md` - Quick start guide
- `CONSULTATION_FLOW_DIAGRAM.md` - Visual flow diagrams
- `ADD_CONSULTATION_BUTTONS.md` - Dashboard integration

### External Resources
- Daily.co Docs: https://docs.daily.co/
- Daily.co Dashboard: https://dashboard.daily.co/
- Supabase Dashboard: https://app.supabase.com/
- EAS Build Dashboard: https://expo.dev/

### Troubleshooting
- Check Daily.co API key
- Verify database migration
- Review EAS build logs
- Check device permissions
- Test internet connection

---

## Notes

- **Build Time**: ~15-20 minutes
- **Testing Time**: ~30 minutes
- **Total Deployment**: ~1 hour
- **Cost**: Free tier available (10,000 min/month)

---

## Sign-Off

- [ ] Developer: Code complete and tested
- [ ] QA: All tests passed
- [ ] Product: Feature approved
- [ ] DevOps: Build successful
- [ ] Support: Documentation ready

---

**Deployment Date**: _______________

**Deployed By**: _______________

**APK Version**: 1.0.8

**Build Number**: 10

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

Good luck with your deployment! 🚀
