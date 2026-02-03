# Google OAuth SSO Setup Guide

## ✅ COMPLETED: SSO-Only Login Implementation

The login screen now shows **ONLY Google SSO** as the authentication method. No email/password fallback.

---

## 🚀 How to Enable Google OAuth (Required for Production)

### Step 1: Configure in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Providers**
3. Find **Google** and click to enable it
4. You'll need:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### Step 2: Create Google OAuth Credentials

#### A. Go to Google Cloud Console
   - Visit: https://console.cloud.google.com/

#### B. Create a New Project (or use existing)
   - Click on project dropdown → New Project
   - Name it (e.g., "NEXAD App")
   - Click Create

#### C. Enable Google+ API
   - Go to **APIs & Services → Library**
   - Search for "Google+ API"
   - Click Enable

#### D. Create OAuth Credentials
   1. Go to **APIs & Services → Credentials**
   2. Click **+ CREATE CREDENTIALS → OAuth client ID**
   3. If prompted, configure OAuth consent screen first:
      - User Type: **External**
      - App name: **NEXAD**
      - User support email: Your email
      - Developer contact: Your email
      - Save and Continue through all steps
   
   4. Back to creating OAuth client ID:
      - Application type: **Web application**
      - Name: **NEXAD Web Client**
      - Authorized JavaScript origins:
        ```
        https://your-project.supabase.co
        ```
      - Authorized redirect URIs:
        ```
        https://your-project.supabase.co/auth/v1/callback
        ```
        *Replace `your-project` with your actual Supabase project reference*

        #### Finding Your Supabase Project Reference

        Your Supabase project reference can be found in your **Supabase Dashboard URL** or **Project Settings**:

        1. **From Dashboard URL**:
            - Look at your browser URL when logged into Supabase
            - Format: `https://app.supabase.com/project/[your-reference]`
            - The reference is the alphanumeric string after `/project/`

        2. **From Project Settings**:
            - Go to **Project Settings** (gear icon)
            - Navigate to **General → Reference ID**
            - Copy the reference ID shown

        3. **From API Settings**:
            - Go to **Project Settings → API**
            - Look at your **Project URL**: `https://[your-reference].supabase.co`
            - The part before `.supabase.co` is your reference

        **Example**: If your Project URL is `https://abcdefghijklmnop.supabase.co`, then your reference is `abcdefghijklmnop`


#### E. Copy Credentials
   - You'll get a **Client ID** and **Client Secret**
   - Copy both values

### Step 3: Add Credentials to Supabase

1. Return to Supabase → **Authentication → Providers → Google**
2. Paste:
   - **Client ID** from Google Cloud Console
   - **Client Secret** from Google Cloud Console
3. Copy the **Callback URL (for OAuth)** shown in Supabase
   - It should look like: `https://your-project.supabase.co/auth/v1/callback`
4. Click **Save**

### Step 4: Update Google Cloud Console Redirect URI

1. Go back to Google Cloud Console → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   *Use the exact URL from Supabase*
4. Click **Save**

---

## 🔧 Configure Redirect URL for Expo

The app is already configured to use:
```
nexad://auth/callback
```

This native deep link scheme works on both:
- ✅ Android Emulator
- ✅ Physical Android devices
- ✅ iOS Simulator
- ✅ Physical iOS devices

### Add to Supabase (Optional but Recommended)

1. Go to Supabase → **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   nexad://auth/callback
   ```
3. Save

---

## 🧪 Testing the SSO Flow

1. **Start the app** (already running in terminal)
2. **Open Expo Go** on your Android emulator
3. Navigate: **Welcome → Role Selection → Login**
4. Click **"Sign in with Google"** button
5. A browser window will open for Google authentication
6. Sign in with your Google account
7. Grant permissions
8. You'll be redirected back to the app
9. Profile will be created automatically

---

## 🐛 Troubleshooting

### Error: "Provider is not enabled"
- **Solution**: Complete Step 1-3 above to enable Google OAuth in Supabase

### Error: "Invalid redirect URI"
- **Solution**: Make sure the redirect URI in Google Cloud Console exactly matches the callback URL from Supabase
- Check for typos, trailing slashes, http vs https

### Error: "Access blocked: This app's request is invalid"
- **Solution**: Configure the OAuth consent screen in Google Cloud Console
- Add your test email to "Test users" if using External user type

### Browser doesn't return to app
- **Solution**: Make sure `nexad://auth/callback` is added to Supabase redirect URLs
- Check that expo-web-browser is properly installed: `npm install expo-web-browser`

### "Session not found" or "Invalid session"
- **Solution**: The OAuth flow completed but tokens weren't parsed correctly
- Check console logs for token extraction debugging info
- Make sure your internet connection is stable

---

## 📱 What Happens During SSO

1. User clicks "Sign in with Google"
2. App opens browser with Google login page
3. User authenticates with Google
4. Google redirects to Supabase with authorization code
5. Supabase exchanges code for user info and creates session
6. Supabase redirects to `nexad://auth/callback` with tokens
7. App receives tokens and sets session
8. If first login: Creates user profile in database
9. If returning user: Updates last login timestamp
10. User is redirected to appropriate dashboard (Student/Faculty)

---

## 🔒 Security Benefits of SSO

- ✅ **Email verification**: Google verifies email ownership
- ✅ **No password management**: Users don't create/remember passwords
- ✅ **Institutional validation**: Can restrict to @school.edu.ph domains
- ✅ **Two-factor authentication**: Inherits Google's 2FA if enabled
- ✅ **Account recovery**: Uses Google's account recovery flow
- ✅ **Audit trail**: Google login events are logged

---

## 📝 Next Steps After Setup

1. **Test on physical device**: Deploy to a physical Android/iOS device
2. **Restrict domain**: In Supabase, configure to only allow institutional emails
3. **Production OAuth consent**: Get your OAuth consent screen verified by Google for production
4. **Add branding**: Customize OAuth consent screen with your school logo and branding

---

## 🎨 Current Login Screen Features

- 🔒 Security-focused design
- 🎯 Single, prominent Google button
- ✓ Benefits list (Instant verification, No password needed, Secure authentication)
- 📱 Mobile-optimized layout
- ⚡ Loading states during authentication
- 🔙 Back navigation to role selection
- 🎨 Professional dark theme UI

---

**Need Help?**
- Check Supabase logs: Dashboard → Logs → Auth
- Check Expo logs in terminal
- Verify Google Cloud Console settings
- Test with a different Google account
