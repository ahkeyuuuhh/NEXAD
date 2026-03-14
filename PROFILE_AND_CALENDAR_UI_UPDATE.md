# Profile & Calendar UI Updates - OTA Update

## Date: March 15, 2026

## Changes Made

### 1. Profile Card Backgrounds - Lighter
**Files Modified**:
- `nexad-app/src/screens/teacher/TeacherProfileScreen.tsx`
- `nexad-app/src/screens/student/StudentProfileScreen.tsx`

**Change**: Updated card backgrounds to match account settings style
- **Old**: `rgba(32, 33, 36, 0.03)` (very subtle grey)
- **New**: `rgba(255, 255, 255, 0.25)` (lighter translucent white)

This makes the profile cards (About, Specialties, Office sections) more visible and consistent with the account settings cards.

### 2. Edit Profile & Settings Button - Black with White Text
**Files Modified**:
- `nexad-app/src/screens/teacher/TeacherProfileScreen.tsx`
- `nexad-app/src/screens/student/StudentProfileScreen.tsx`

**Changes**:
- Background color: Changed to `#000000` (pure black)
- Text color: Changed to `#FFFFFF` (white)
- Icon color: Changed to `#FFFFFF` (white)
- Border color: Changed to `#000000` (black)

The button now has high contrast and is clearly visible against the lighter background.

### 3. Calendar Styling - Black Accent
**File Modified**: `nexad-app/src/screens/student/ConsultationRequestScreen.tsx`

**Changes to DateTimePicker**:
- Added `accentColor="#000000"` - Makes the calendar header and selected date black
- Added `themeVariant="light"` - Ensures light theme for consistency
- Applied to both start date and end date pickers

The calendar now has a black header (instead of default teal/green) and black accent for selected dates, matching the app's design language.

### 4. Welcome Screen Logo - Light Version
**File Modified**: `nexad-app/src/screens/auth/WelcomeScreen.tsx`

**Change**: Replaced logo image
- **Old**: `Dark-Logo-NoText-noBg.png` (dark logo)
- **New**: `Light-logo-NoText.png` (light logo)

The light logo is now more visible against the dark circle background on the welcome screen.

## Visual Changes Summary

### Profile Screens:
- ✅ Cards are lighter and more visible (white translucent)
- ✅ Edit Profile button is black with white text/icon
- ✅ Better contrast and readability

### Calendar (Preferred Schedule):
- ✅ Header is black instead of teal/green
- ✅ Selected dates have black accent
- ✅ Consistent with app's black accent theme

### Welcome Screen:
- ✅ Light logo visible on dark background
- ✅ Professional branded appearance

## OTA Update Published

**Branch**: preview  
**Runtime Version**: 1.0.2  
**Update Group ID**: a838b40c-f200-44da-b637-0c0464d57242  
**Android Update ID**: 019cee47-4d22-7b2a-b752-0728af0a3f1b  
**iOS Update ID**: 019cee47-4d22-7bcd-8cbd-52a905e9ff8c  
**Message**: "Profile UI updates: lighter cards, black edit button, styled calendar, light logo on welcome screen"

## Assets Used
- **Light-logo-NoText.png** (147 kB) - Now used on welcome screen
- **NEXAD GIF.gif** (510 kB) - Loading screen animation

## User Instructions

To see all changes:
1. Close NEXAD completely (swipe away from recent apps)
2. Wait 10 seconds
3. Open NEXAD (update downloads automatically)
4. Close NEXAD again
5. Open NEXAD (all changes will be visible)

## What You'll See

1. **Profile Screens**: Lighter cards, black "Edit Profile & Settings" button with white text
2. **Request Consultation**: Calendar with black header and black selected dates
3. **Welcome Screen**: Light logo on the dark circle (more visible)
4. **Loading Screen**: NEXAD GIF animation

## Note About App Icon

The app icon change (Light-logo-NoText as APK icon) was configured in app.json but requires a NEW BUILD to be visible on the device home screen. It won't appear via OTA update.

To see the new app icon:
```bash
eas build --platform android --profile preview
```

## Status
✅ Profile card backgrounds lighter  
✅ Edit Profile button black with white text  
✅ Calendar styled with black accent  
✅ Welcome screen logo updated to light version  
✅ OTA update published to preview branch  
✅ Ready for user testing
