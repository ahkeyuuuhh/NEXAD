# ⚠️ DO THIS FIRST - BEFORE RUNNING ANY COMMANDS

## You MUST do these 2 things in your web browser first:

---

## ✅ STEP 1: Get Resend API Key

1. Open your browser
2. Go to: **https://resend.com/login**
3. Sign up or login (you can use Google sign-in)
4. After logging in, click **"API Keys"** in the sidebar
5. Click **"Create API Key"**
6. Name it: `NEXAD Production`
7. Click **Create**
8. **COPY THE KEY** (it looks like `re_abc123...`)
9. **KEEP THIS WINDOW OPEN** - you'll need it in the next step!

---

## ✅ STEP 2: Set API Key in Supabase

1. Open a NEW browser tab
2. Go to: **https://supabase.com/dashboard/project/klrfkhyvgtffsjpdioax/settings/functions**
3. Login if needed
4. Look for **"Secrets"** or **"Environment Variables"** section
5. Click **"Add new secret"** or **"New secret"**
6. Fill in:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Paste the key from Resend (the one you copied)
7. Click **"Save"**

---

## ✅ STEP 3: Tell Me When You're Done!

After you complete Steps 1 and 2, tell me:
- "Done" or "I set the API key"

Then I'll run the deployment commands for you!

---

## Why do I need to do this first?

The Resend API key is like a password that allows your admin panel to send emails. Without it:
- ❌ Emails won't send
- ❌ You'll see "Check Resend API key" error

With it:
- ✅ Emails will send successfully
- ✅ Everything will work perfectly

---

## Need help?

If you get stuck:
1. Tell me which step you're on
2. Tell me what you see on the screen
3. I'll help you!

---

**Go ahead and do Steps 1 & 2 now. I'll wait! 😊**
