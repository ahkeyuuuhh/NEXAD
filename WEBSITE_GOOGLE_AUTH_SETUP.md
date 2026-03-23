# Website Google Authentication Setup Guide

## Overview
The website's Google Authentication is now implemented to match the mobile app's OAuth flow. This guide will help you configure the Supabase Dashboard to enable Google Sign-In on the website.

## Current Implementation

### How It Works
1. User clicks "Continue with Google" button on contact page
2. Supabase redirects to Google OAuth consent screen
3. User authorizes the app
4. Google redirects back to the website with OAuth tokens in URL
5. Website extracts tokens and creates Supabase session
6. Contact form is populated with user's Google account info

### Key Features
- ✅ Same Supabase project as mobile app
- ✅ Automatic token extraction from URL (hash or query params)
- ✅ Session persistence across page reloads
- ✅ Clean URL after authentication (tokens removed from address bar)
- ✅ Responsive Google button matching mobile app design
- ✅ Proper error handling and user feedback

## Configuration Steps

### Step 1: Configure Google OAuth Provider in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `klrfkhyvgtffsjpdioax`
3. Navigate to **Authentication** → **Providers**
4. Find **Google** provider and click to configure
5. Ensure the following are set:
   - **Enabled**: ON
   - **Client ID**: (your Google OAuth client ID)
   - **Client Secret**: (your Google OAuth client secret)

### Step 2: Add Website Redirect URLs

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add your website URLs:

   **For Local Development:**
   ```
   http://localhost:3000/contact.html
   http://localhost:8080/contact.html
   http://127.0.0.1:3000/contact.html
   http://127.0.0.1:8080/contact.html
   ```

   **For Production:**
   ```
   https://yourdomain.com/contact.html
   https://www.yourdomain.com/contact.html
   ```

3. Click **Save**

### Step 3: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID (or create a new one)
5. Under **Authorized redirect URIs**, add:

   ```
   https://klrfkhyvgtffsjpdioax.supabase.co/auth/v1/callback
   ```

6. Under **Authorized JavaScript origins**, add your website domains:
   
   **For Local Development:**
   ```
   http://localhost:3000
   http://localhost:8080
   http://127.0.0.1:3000
   http://127.0.0.1:8080
   ```

   **For Production:**
   ```
   https://yourdomain.com
   https://www.yourdomain.com
   ```

7. Click **Save**

## Testing the Implementation

### Local Testing

1. **Start a local web server:**
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js
   npx http-server -p 8080
   ```

2. **Open the contact page:**
   ```
   http://localhost:8080/nexad-website/contact.html
   ```

3. **Test the Google Sign-In:**
   - Click "Continue with Google" button
   - You should be redirected to Google's consent screen
   - After authorizing, you should be redirected back to the contact page
   - The contact form should appear with your name and email pre-filled

4. **Check browser console for logs:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for logs starting with `🔵 [OAuth]` or `🟢 [Session]`

### Production Testing

1. Deploy your website to your production domain
2. Ensure all redirect URLs are configured in both Supabase and Google Cloud Console
3. Test the OAuth flow end-to-end
4. Verify that the URL is cleaned after authentication (no tokens visible)

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Cause:** The redirect URL is not configured in Google Cloud Console

**Solution:**
1. Check the exact URL in the error message
2. Add that exact URL to **Authorized redirect URIs** in Google Cloud Console
3. Make sure to include the Supabase callback URL: `https://klrfkhyvgtffsjpdioax.supabase.co/auth/v1/callback`

### Issue: "Sign-in failed" or No Session Created

**Cause:** Redirect URL not configured in Supabase Dashboard

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your website URL to **Redirect URLs**
3. Make sure the URL matches exactly (including `/contact.html`)

### Issue: Tokens Visible in URL After Redirect

**Cause:** This is normal - tokens are extracted and then removed

**Solution:**
- The implementation automatically cleans the URL using `window.history.replaceState()`
- If tokens remain visible, check browser console for errors

### Issue: "User Already Registered" Error

**Cause:** The Google account is already registered in the mobile app

**Solution:**
- This is expected behavior - the website shares the same Supabase database
- Users can sign in with the same Google account on both mobile and web
- The contact form will work with existing accounts

## Security Considerations

### Token Handling
- ✅ Tokens are extracted from URL immediately
- ✅ Tokens are removed from browser address bar
- ✅ Session is stored securely by Supabase client
- ✅ No tokens are logged or exposed to user

### HTTPS Requirement
- ⚠️ Google OAuth requires HTTPS in production
- ⚠️ Use `http://localhost` for local development only
- ⚠️ Never use HTTP in production

### CORS Configuration
- ✅ Supabase handles CORS automatically
- ✅ No additional CORS configuration needed
- ✅ Website domain must be added to Google Cloud Console origins

## Files Modified

### `nexad-website/contact.html`
- Added Supabase client library
- Created custom Google Sign-In button
- Removed Google's default button implementation

### `nexad-website/scripts/contact.js`
- Implemented Supabase OAuth flow
- Added token extraction from URL (hash and query params)
- Added session checking on page load
- Added automatic URL cleanup after authentication
- Improved error handling and logging

### `nexad-website/styles/contact.css`
- Added custom Google button styling
- Made button responsive for all screen sizes
- Matched mobile app design language

## Next Steps

1. ✅ Configure Supabase redirect URLs (see Step 2 above)
2. ✅ Configure Google Cloud Console (see Step 3 above)
3. ⏳ Test OAuth flow locally
4. ⏳ Test OAuth flow in production
5. ⏳ Monitor for any errors in browser console
6. ⏳ Test form submission with authenticated user

## Support

If you encounter any issues:

1. Check browser console for error logs
2. Verify all URLs are configured correctly in both Supabase and Google Cloud Console
3. Ensure HTTPS is used in production
4. Check that the Google OAuth client is enabled in Google Cloud Console
5. Verify that the Supabase project is active and not paused

## Comparison with Mobile App

| Feature | Mobile App | Website |
|---------|-----------|---------|
| OAuth Provider | Google | Google ✅ |
| Supabase Project | Same | Same ✅ |
| Token Extraction | expo-auth-session | URL parsing ✅ |
| Session Management | Supabase | Supabase ✅ |
| Deep Linking | nexad:// | HTTP(S) redirect ✅ |
| Button Design | White pill | White pill ✅ |
| Error Handling | Toast notifications | Toast notifications ✅ |

The website implementation matches the mobile app's OAuth flow while adapting to the browser environment.
