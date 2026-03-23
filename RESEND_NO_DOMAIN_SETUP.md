# 📧 Resend Setup Without a Domain - Step by Step

## ✨ Good News!

You DON'T need your own domain to use Resend! They provide a free test domain that works perfectly.

---

## 🎯 Step 1: Create Resend Account (2 minutes)

1. Go to https://resend.com
2. Click "Sign Up" (top right)
3. Enter your email: `nexad.support@gmail.com`
4. Create a password
5. Click "Create Account"
6. Check your email for verification link
7. Click the verification link
8. ✅ Account created!

---

## 🔑 Step 2: Get Your API Key (1 minute)

1. After logging in, you'll see the Resend Dashboard
2. On the left sidebar, click "API Keys"
3. Click "Create API Key" button
4. Fill in the form:
   - **Name**: `NEXAD Contact System`
   - **Permission**: Select "Sending access"
   - **Domain**: Select "All domains" (or leave default)
5. Click "Add"
6. **IMPORTANT**: Copy the API key immediately!
   - It looks like: `re_123abc456def789ghi`
   - You won't be able to see it again!
7. Save it in a safe place (you'll need it in Step 4)

---

## 📨 Step 3: Understand the Test Domain

Resend automatically gives you access to their test domain:
- **From Email**: `onboarding@resend.dev`
- **Limit**: 100 emails per day
- **Cost**: FREE
- **Perfect for**: Testing and small production use

**Limitations:**
- Can only send to verified email addresses (we'll verify yours)
- 100 emails/day limit
- Shows "via resend.dev" in email client

**This is perfect for your use case!** You'll receive all contact notifications at your Gmail.

---

## ✅ Step 4: Verify Your Admin Email (2 minutes)

Since you're using the test domain, you need to verify the email addresses that will RECEIVE emails.

1. In Resend Dashboard, click "Domains" in left sidebar
2. Click on "resend.dev" (the test domain)
3. Scroll down to "Verified Emails" section
4. Click "Add Email"
5. Enter: `nexad.support@gmail.com`
6. Click "Add"
7. Check your Gmail inbox for verification email from Resend
8. Click the verification link
9. ✅ Email verified!

**Note**: You only need to verify the ADMIN email (where notifications go). Customer emails don't need verification because they're the recipients of replies.

---

## 🚀 Step 5: Deploy to Supabase (10 minutes)

Now let's set up the email function in Supabase.

### 5.1 Install Supabase CLI

Open your terminal and run:

```bash
# Install Supabase CLI globally
npm install -g supabase
```

Wait for installation to complete.

### 5.2 Login to Supabase

```bash
# Login to your Supabase account
supabase login
```

This will open a browser window. Sign in with your Supabase account.

### 5.3 Navigate to Your Project

```bash
# Go to your NEXAD project folder
cd C:\Users\zitac\OneDrive\Documents\SCHOOL\OOP2\NEXAD
```

### 5.4 Link to Your Supabase Project

```bash
# Link to your project
supabase link --project-ref klrfkhyvgtffsjpdioax
```

When prompted, confirm the link.

### 5.5 Set Your Resend API Key

```bash
# Set the API key as a secret (replace with your actual key)
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

**Replace `re_your_actual_api_key_here` with the API key you copied in Step 2!**

Example:
```bash
supabase secrets set RESEND_API_KEY=re_123abc456def789ghi
```

### 5.6 Update the Email Function

The function is already created, but we need to make sure it uses the test domain.

The file `supabase/functions/send-contact-email/index.ts` should already have the correct setup, but let's verify the sender email is set correctly.

### 5.7 Deploy the Function

```bash
# Deploy the email function
supabase functions deploy send-contact-email
```

Wait for deployment to complete. You should see:
```
✓ Deployed Function send-contact-email
```

---

## 🧪 Step 6: Test the System (5 minutes)

### 6.1 First, Run the Database Setup

1. Go to https://supabase.com/dashboard
2. Select your project: `klrfkhyvgtffsjpdioax`
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Open the file: `database/create_contacts_system.sql`
6. Copy ALL the contents
7. Paste into the SQL Editor
8. Click "Run" button
9. Wait for success message
10. ✅ Database ready!

### 6.2 Enable Realtime

1. In Supabase Dashboard, click "Database" → "Replication"
2. Find the `contacts` table
3. Toggle "Enable Realtime" to ON
4. Find the `contact_replies` table
5. Toggle "Enable Realtime" to ON
6. ✅ Realtime enabled!

### 6.3 Test Contact Form

1. Open `nexad-website/contact.html` in your browser
2. Click "Sign in with Google"
3. Sign in with any Google account
4. Fill out the form:
   - Name: Test User
   - Email: test@example.com
   - Message: This is a test message
5. Click "Send Message"
6. Check browser console (F12) for success messages

### 6.4 Check Your Email!

1. Open Gmail: https://mail.google.com
2. Sign in with `nexad.support@gmail.com`
3. Check your inbox
4. You should see an email from "NEXAD <onboarding@resend.dev>"
5. Subject: "New Contact: General Inquiry - Test User"
6. ✅ Email received!

**If you don't see it:**
- Check spam folder
- Wait 1-2 minutes (sometimes delayed)
- Check Supabase Edge Function logs (see troubleshooting below)

### 6.5 Test Real-time Updates

1. Open `nexad-website/admin.html` in one browser tab
2. Sign in with `nexad.support@gmail.com`
3. Open `nexad-website/contact.html` in another tab
4. Submit a new contact
5. Watch the admin panel - it should update automatically!
6. You should see a notification popup
7. ✅ Real-time working!

### 6.6 Test Reply Functionality

1. In admin panel, find a contact
2. Click "Reply" button
3. Type a test reply message
4. Click "Send Reply"
5. Check the customer's email (the email they used in the form)
6. They should receive your reply!
7. ✅ Reply working!

---

## 🐛 Troubleshooting

### Issue: API Key Error

**Error**: "Invalid API key" or "Authentication failed"

**Solution**:
```bash
# Check if secret is set
supabase secrets list

# If not listed, set it again
supabase secrets set RESEND_API_KEY=re_your_key_here

# Redeploy function
supabase functions deploy send-contact-email
```

### Issue: Email Not Received

**Check 1**: Is admin email verified in Resend?
- Go to Resend Dashboard → Domains → resend.dev → Verified Emails
- Make sure `nexad.support@gmail.com` is listed and verified

**Check 2**: Check Edge Function logs
```bash
# View function logs
supabase functions logs send-contact-email --limit 50
```

Look for errors in the output.

**Check 3**: Check spam folder
- Sometimes test domain emails go to spam
- Mark as "Not Spam" if found

**Check 4**: Verify function is deployed
```bash
# List deployed functions
supabase functions list
```

You should see `send-contact-email` listed.

### Issue: Function Deployment Failed

**Error**: "Failed to deploy function"

**Solution**:
```bash
# Make sure you're in the right directory
cd C:\Users\zitac\OneDrive\Documents\SCHOOL\OOP2\NEXAD

# Make sure you're linked to the project
supabase link --project-ref klrfkhyvgtffsjpdioax

# Try deploying again
supabase functions deploy send-contact-email
```

### Issue: "Cannot find module" Error

**Solution**: The Edge Function uses Deno, which handles imports differently. Make sure the function file is exactly as provided.

---

## 📊 Check Your Resend Dashboard

After sending test emails, check your Resend Dashboard:

1. Go to https://resend.com/emails
2. You should see a list of sent emails
3. Click on an email to see details:
   - Status (Delivered/Bounced/etc.)
   - Recipient
   - Timestamp
   - Email content

This helps you verify emails are being sent successfully!

---

## 💡 Tips

### Daily Limit Tracking

With the test domain, you get 100 emails/day:
- Each contact submission = 1 email to admin
- Each reply = 1 email to customer
- So you can handle ~50 contacts with replies per day

This is plenty for testing and initial launch!

### When to Upgrade

You should add your own domain when:
- You exceed 100 emails/day
- You want to remove "via resend.dev" from emails
- You want professional branding (emails from @yourdomain.com)

But for now, the test domain is perfect!

---

## 🎯 Quick Command Reference

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Navigate to project
cd C:\Users\zitac\OneDrive\Documents\SCHOOL\OOP2\NEXAD

# Link project
supabase link --project-ref klrfkhyvgtffsjpdioax

# Set API key
supabase secrets set RESEND_API_KEY=re_your_key_here

# Deploy function
supabase functions deploy send-contact-email

# View logs
supabase functions logs send-contact-email

# List functions
supabase functions list

# List secrets
supabase secrets list
```

---

## ✅ Success Checklist

- [ ] Resend account created
- [ ] API key obtained and saved
- [ ] Admin email verified in Resend
- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] API key set as secret
- [ ] Function deployed successfully
- [ ] Database setup completed
- [ ] Realtime enabled
- [ ] Test contact submitted
- [ ] Admin received email notification
- [ ] Real-time update works
- [ ] Reply functionality works

---

## 🎉 You're Done!

Once all checkboxes are checked, your system is fully operational!

You can now:
- ✅ Receive contact form submissions
- ✅ Get instant email notifications
- ✅ See real-time updates in admin panel
- ✅ Reply to customers directly from admin panel
- ✅ Track contact status

All without needing your own domain! 🚀

---

## 📞 Need Help?

If you get stuck:
1. Check the troubleshooting section above
2. Run `supabase functions logs send-contact-email` to see errors
3. Check Resend Dashboard for email delivery status
4. Make sure all secrets are set correctly
5. Verify admin email is verified in Resend

The most common issues are:
- Forgot to verify admin email in Resend
- API key not set correctly
- Function not deployed

Double-check these three things first!
