# ⚡ Quick API Key Setup - 2 Minutes

## 🎯 What You Need

Your admin panel now has a reply form, but you need to configure the Resend API key so emails actually get sent.

---

## 📋 Step-by-Step (2 Minutes)

### 1️⃣ Get Resend API Key (1 minute)

1. Go to: **https://resend.com**
2. Click **"Sign Up"** (or "Log In" if you have an account)
3. After logging in, click **"API Keys"** in the sidebar
4. Click **"Create API Key"**
5. Name it: `NEXAD Emails`
6. **Copy the key** (starts with `re_`)

---

### 2️⃣ Add to Supabase (1 minute)

1. Go to: **https://supabase.com/dashboard**
2. Select your **NEXAD project**
3. Click **"Edge Functions"** in the left sidebar
4. Click **"Manage secrets"** or **"Environment variables"**
5. Click **"Add new secret"**
6. Enter:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Paste your Resend key
7. Click **"Save"**

---

## ✅ That's It!

Your reply form will now send emails. Test it:

1. Go to admin panel
2. Click "Reply" on any contact
3. Type a message
4. Click "Send Reply"
5. Check the customer's email inbox

---

## 🔍 Quick Troubleshooting

**"Email failed to send"**
- Check if you added the API key correctly
- Make sure the key starts with `re_`
- Try creating a new API key in Resend

**"Database connection not available"**
- Make sure you're logged in to the admin panel
- Refresh the page

---

## 📧 Email Details

- **Free Tier**: 100 emails per day
- **From**: `NEXAD Support <onboarding@resend.dev>`
- **Reply-To**: `nexad.support@gmail.com`

---

## 🎉 Done!

You can now reply to contacts directly from the admin panel. The emails will be sent automatically through Resend.

**Need more details?** See `RESEND_API_KEY_SETUP.md` for the complete guide.
