# Google SSO Setup Guide for NEXAD

## Why SSO (Single Sign-On)?
- ✅ Verifies real email addresses
- ✅ Institutional authentication (school emails)
- ✅ Better security (no password storage)
- ✅ Seamless user experience

---

## Step 1: Enable Google OAuth in Supabase

### 1.1 Go to Supabase Dashboard
1. Open your Supabase project: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Providers**

### 1.2 Enable Google Provider
1. Find **Google** in the providers list
2. Toggle it **ON**
3. You'll need to add OAuth credentials

---

## Step 2: Create Google OAuth Credentials

### 2.1 Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Name it: `NEXAD-Auth` or similar

### 2.2 Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Enable**

### 2.3 Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure consent screen if prompted:
   - User Type: **External** (for testing) or **Internal** (for school domain only)
   - App name: `NEXAD`
   - User support email: Your email
   - Developer contact: Your email
   - Save and continue through all steps

### 2.4 Create OAuth Client ID
1. Application type: **Web application**
2. Name: `NEXAD Web Client`
3. **Authorized redirect URIs** - Add BOTH:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   Replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference
   
   Example: `https://abcdefghijklmno.supabase.co/auth/v1/callback`

4. Click **Create**
5. **Copy** the Client ID and Client Secret

---

## Step 3: Configure Supabase with Google Credentials

### 3.1 Add Credentials to Supabase
1. Go back to Supabase Dashboard
2. **Authentication** → **Providers** → **Google**
3. Paste:
   - **Client ID** (from Google Console)
   - **Client Secret** (from Google Console)
4. **Save**

### 3.2 Configure Redirect URL (Mobile)
The app is already configured to use: `nexad://auth/callback`

For production, you may need to add this to Google Console:
- Authorized redirect URIs: `nexad://auth/callback`

---

## Step 4: Test SSO Login

1. Restart your Expo app
2. Go to Login screen
3. Click **"Continue with Google"**
4. Should open browser with Google sign-in
5. After authentication, redirects back to app
6. Profile is created automatically

---

## Optional: Restrict to School Domain Only

### For School Email Verification Only
In Google Cloud Console Consent Screen:
1. Set User Type to **Internal** (requires Google Workspace)
2. This restricts sign-in to your school domain only (e.g., @school.edu.ph)

### Or Add Domain Verification
1. In Supabase, under Google provider settings
2. Enable **"Require email domain"**
3. Add allowed domains: `school.edu.ph`

---

## Troubleshooting

### Error: "provider is not enabled"
- ✅ Make sure Google provider is toggled ON in Supabase
- ✅ Verify Client ID and Secret are correctly saved

### Error: "redirect_uri_mismatch"
- ✅ Check redirect URI in Google Console matches Supabase callback URL
- ✅ Format: `https://[project-ref].supabase.co/auth/v1/callback`

### Browser doesn't redirect back
- ✅ Make sure expo-web-browser is installed
- ✅ Check that URL scheme `nexad://` is configured in app.json

---

## Security Best Practices

1. **Never commit credentials** to Git
2. Store Client Secret securely
3. Use environment variables for production
4. Regularly rotate OAuth secrets
5. Monitor authentication logs in Supabase

---

## Current Status

- ✅ LoginScreen updated with Google SSO button
- ✅ Email/password fallback available
- ⚠️ **Google OAuth needs to be enabled in Supabase**
- ⚠️ **Google Cloud credentials need to be configured**

Once you complete the setup above, SSO will work seamlessly! 🎉
