# Fix "Too Many Redirects" Error

## The Problem
The app is getting stuck in a redirect loop because Supabase doesn't recognize the mobile app's redirect URL.

## The Solution
Add the mobile app's deep link to Supabase's allowed redirect URLs.

---

## Steps to Fix (DO THIS NOW):

### 1. Go to Supabase Dashboard
   - Open: https://supabase.com/dashboard
   - Select your project: `klrfkhyvgtffsjpdioax`

### 2. Navigate to Authentication Settings
   - Click **Authentication** in the left sidebar
   - Click **URL Configuration**

### 3. Add Redirect URL
   In the **Redirect URLs** section, add:
   ```
   exp://192.168.1.3:8082/--/auth/callback
   ```
   
   **Important:** The IP address and port should match what you see in your terminal output.
   
   If your Metro bundler shows a different URL like `exp://192.168.1.3:8081`, use that instead.

### 4. Save Changes
   - Click **Save** at the bottom

---

## Why This Works

When you use Expo Go, the app creates a temporary URL scheme like `exp://[your-ip]:[port]/--/[path]`. This is the URL that:
1. Google redirects to after authentication
2. Supabase validates against allowed redirect URLs
3. Your app intercepts to complete the login

Without adding this to Supabase, the redirect is rejected and creates a loop.

---

## After Adding the URL

1. **Reload your app** (press 'r' in terminal or shake device)
2. **Try Google Sign-In again**
3. You should now successfully sign in!

---

## If It Still Doesn't Work

The URL might change if:
- Your IP address changes
- You restart Metro bundler on a different port

If this happens, just update the redirect URL in Supabase to match the new one shown in your terminal.
