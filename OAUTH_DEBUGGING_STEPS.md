# 🔍 OAUTH DEBUGGING STEPS

## STEP 1: Test with Simple OAuth Page

I've created a minimal test page to isolate the OAuth issue.

1. **Add this URL to Supabase Redirect URLs:**
   ```
   http://localhost:8080/test-simple-oauth.html
   ```

2. **Go to the test page:**
   ```
   http://localhost:8080/test-simple-oauth.html
   ```

3. **Click "Sign in with Google"**

4. **Watch the console messages** - it will show exactly what's happening

---

## STEP 2: Check Google OAuth Provider in Supabase

1. Go to: **Supabase Dashboard → Authentication → Providers**
2. Find **Google** provider
3. Verify:
   - ✅ Provider is **ENABLED** (toggle is ON)
   - ✅ **Client ID** is filled in
   - ✅ **Client Secret** is filled in
   - ✅ **Authorized redirect URIs** in Google Cloud Console includes:
     ```
     https://klrfkhyvgtffsjpdioax.supabase.co/auth/v1/callback
     ```

---

## STEP 3: Check Google Cloud Console

The error you're seeing might be because the Google OAuth app isn't configured correctly.

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to: **APIs & Services → Credentials**
4. Find your OAuth 2.0 Client ID
5. Click on it
6. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://klrfkhyvgtffsjpdioax.supabase.co/auth/v1/callback
   ```

---

## STEP 4: Common Issues

### Issue 1: Google OAuth App Not Configured
**Symptom:** "Failed to launch because the scheme does not have a registered handler"

**Solution:** 
- Make sure the Google OAuth Client ID and Secret are correctly configured in Supabase
- Make sure the redirect URI in Google Cloud Console matches Supabase

### Issue 2: Wrong Redirect URL
**Symptom:** Infinite loading or 404 after Google sign-in

**Solution:**
- Make sure `http://localhost:8080/contact.html` is in Supabase Redirect URLs
- Make sure you're using the exact URL (no trailing slash, correct port)

### Issue 3: Browser Cache
**Symptom:** Old behavior persists

**Solution:**
- Clear cache completely (Ctrl + Shift + Delete → All time)
- Try in incognito/private window
- Close and reopen browser

### Issue 4: CORS or Mixed Content
**Symptom:** Console shows CORS errors

**Solution:**
- Make sure you're using `http://` not `https://` for localhost
- Make sure the server is running on the correct port

---

## STEP 5: What to Look For

### In the test page, you should see:

**Good flow:**
```
✅ Supabase initialized
🔵 Starting OAuth flow...
Redirect URL: http://localhost:8080/test-simple-oauth.html
✅ OAuth initiated, redirecting...
[After redirect back]
✅ Found OAuth tokens in URL!
✅ Session set successfully!
User: your-email@gmail.com
🔔 Auth Event: SIGNED_IN
```

**Bad flow (error):**
```
❌ OAuth Error: [error message]
```

---

## STEP 6: If Test Page Works

If the test page works but contact.html doesn't:
1. The issue is in the contact.html/contact.js code
2. Compare the working test code with contact.js
3. Check for JavaScript errors in contact.html

If the test page ALSO doesn't work:
1. The issue is with Supabase/Google OAuth configuration
2. Check Google Cloud Console settings
3. Check Supabase Provider settings
4. Verify the OAuth credentials

---

## STEP 7: Screenshot Checklist

If it still doesn't work, take screenshots of:

1. **Supabase → Authentication → URL Configuration**
   - Show the full list of redirect URLs
   
2. **Supabase → Authentication → Providers → Google**
   - Show that it's enabled
   - Show that Client ID is filled (can blur the actual value)
   
3. **Google Cloud Console → Credentials → OAuth 2.0 Client**
   - Show the Authorized redirect URIs list
   
4. **Browser Console (F12)**
   - Show all messages when you click "Sign in with Google"
   - Show any errors in red

5. **Test page results**
   - Show what happens when you test with test-simple-oauth.html

---

## QUICK TEST NOW:

1. Add `http://localhost:8080/test-simple-oauth.html` to Supabase Redirect URLs
2. Go to `http://localhost:8080/test-simple-oauth.html`
3. Click "Sign in with Google"
4. Tell me what messages you see!

This will help us identify exactly where the problem is.
