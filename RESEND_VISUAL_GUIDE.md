# 📸 Resend Setup - Visual Step-by-Step Guide

This guide shows you exactly what you'll see on your screen at each step.

---

## 🎯 Step 1: Create Resend Account

### What you'll do:
1. Go to https://resend.com
2. You'll see the Resend homepage

### What to click:
- Click the "Sign Up" button (top right corner)

### What you'll see:
- A sign-up form asking for:
  - Email address
  - Password
  - Confirm password

### What to enter:
- Email: `nexad.support@gmail.com`
- Password: (create a strong password)
- Confirm password: (same password)

### What happens next:
- Click "Create Account"
- You'll see a message: "Check your email to verify your account"
- Go to Gmail and click the verification link
- You'll be redirected back to Resend Dashboard

---

## 🔑 Step 2: Get API Key

### What you'll see:
After logging in, you'll see the Resend Dashboard with:
- Left sidebar with menu items
- Main area showing "Welcome to Resend"

### What to click:
1. In the left sidebar, click "API Keys"
2. You'll see a page titled "API Keys"
3. Click the "Create API Key" button (blue button)

### What you'll see:
A modal/popup with a form:
- **Name**: (text input)
- **Permission**: (dropdown)
- **Domain**: (dropdown)

### What to enter:
- **Name**: Type `NEXAD Contact System`
- **Permission**: Select "Sending access"
- **Domain**: Leave as "All domains" or select "resend.dev"

### What to click:
- Click "Add" button

### IMPORTANT - What you'll see next:
A screen showing your API key:
```
Your API Key
re_AbCdEf123456789GhIjKl
```

### CRITICAL:
- **COPY THIS KEY IMMEDIATELY!**
- Click the copy icon or select and copy the text
- Paste it into Notepad or somewhere safe
- **You won't be able to see it again!**

### What it looks like:
- Starts with `re_`
- Followed by random letters and numbers
- Example: `re_AbCdEf123456789GhIjKl`

---

## ✅ Step 3: Verify Your Admin Email

### What to click:
1. In left sidebar, click "Domains"
2. You'll see a list of domains
3. Click on "resend.dev" (the test domain)

### What you'll see:
A page showing domain details with sections:
- Domain Information
- DNS Records
- **Verified Emails** (scroll down to this section)

### What to do:
1. In the "Verified Emails" section, click "Add Email"
2. A small form appears

### What to enter:
- Email: `nexad.support@gmail.com`

### What to click:
- Click "Add" button

### What happens:
- You'll see a message: "Verification email sent"
- The email appears in the list with status "Pending"

### Check your Gmail:
1. Open Gmail: https://mail.google.com
2. Sign in with `nexad.support@gmail.com`
3. Look for email from Resend
4. Subject: "Verify your email address"
5. Click the "Verify Email" button in the email

### What happens next:
- You'll be redirected to Resend
- You'll see: "Email verified successfully"
- In the Verified Emails list, status changes to "Verified" ✓

---

## 💻 Step 4: Install Supabase CLI

### Open Terminal:
- Press `Windows + R`
- Type `cmd` and press Enter
- OR open PowerShell

### What to type:
```bash
npm install -g supabase
```

### What you'll see:
```
npm WARN deprecated ...
added 123 packages in 45s
```

### How to verify it worked:
Type:
```bash
supabase --version
```

You should see something like:
```
1.142.2
```

---

## 🔗 Step 5: Login to Supabase

### What to type:
```bash
supabase login
```

### What happens:
- Your browser opens automatically
- You see Supabase login page
- Sign in with your Supabase account

### What you'll see in terminal:
```
✓ Logged in successfully
```

---

## 📁 Step 6: Navigate to Project

### What to type:
```bash
cd C:\Users\zitac\OneDrive\Documents\SCHOOL\OOP2\NEXAD
```

### What you'll see:
```
C:\Users\zitac\OneDrive\Documents\SCHOOL\OOP2\NEXAD>
```

The prompt changes to show you're in the NEXAD folder.

---

## 🔗 Step 7: Link to Supabase Project

### What to type:
```bash
supabase link --project-ref klrfkhyvgtffsjpdioax
```

### What you'll see:
```
Enter your database password (or leave blank to skip):
```

### What to do:
- Just press Enter (leave blank)

### What you'll see next:
```
✓ Linked to project klrfkhyvgtffsjpdioax
```

---

## 🔐 Step 8: Set API Key

### What to type:
```bash
supabase secrets set RESEND_API_KEY=re_your_actual_key_here
```

**IMPORTANT**: Replace `re_your_actual_key_here` with the API key you copied in Step 2!

### Example:
If your API key is `re_AbCdEf123456789GhIjKl`, type:
```bash
supabase secrets set RESEND_API_KEY=re_AbCdEf123456789GhIjKl
```

### What you'll see:
```
✓ Secret RESEND_API_KEY set successfully
```

---

## 🚀 Step 9: Deploy Function

### What to type:
```bash
supabase functions deploy send-contact-email
```

### What you'll see:
```
Deploying function send-contact-email...
Bundling function...
Uploading function...
✓ Deployed Function send-contact-email
```

This takes about 10-30 seconds.

---

## 🗄️ Step 10: Setup Database

### What to do:
1. Open browser
2. Go to https://supabase.com/dashboard
3. Click on your project (you'll see it in the list)

### What you'll see:
- Project dashboard with menu on left

### What to click:
1. In left menu, click "SQL Editor"
2. Click "New Query" button

### What you'll see:
- A blank SQL editor (like a text editor)

### What to do:
1. Open the file `database/create_contacts_system.sql` in your code editor
2. Select ALL the text (Ctrl+A)
3. Copy it (Ctrl+C)
4. Go back to Supabase SQL Editor
5. Paste it (Ctrl+V)

### What you'll see:
- Lots of SQL code in the editor

### What to click:
- Click "Run" button (bottom right)

### What you'll see:
```
Success. No rows returned
```

This means it worked! ✓

---

## ⚡ Step 11: Enable Realtime

### What to click:
1. In left menu, click "Database"
2. Click "Replication" (submenu)

### What you'll see:
- A list of tables with toggle switches

### What to do:
1. Find the row with "contacts" table
2. Click the toggle switch to turn it ON (it turns blue/green)
3. Find the row with "contact_replies" table
4. Click the toggle switch to turn it ON

### What you'll see:
- Both toggles are now ON/enabled
- Status shows "Enabled"

---

## 🧪 Step 12: Test Everything!

### Test 1: Submit Contact Form

1. Open `nexad-website/contact.html` in browser
2. Click "Sign in with Google"
3. Sign in with any Google account
4. Fill out the form
5. Click "Send Message"

### What you should see:
- Success message appears
- In browser console (F12): `✅ Contact saved to database`

### Test 2: Check Email

1. Open Gmail: https://mail.google.com
2. Sign in with `nexad.support@gmail.com`
3. Check inbox

### What you should see:
- New email from "NEXAD <onboarding@resend.dev>"
- Subject: "New Contact: ... - [Name]"
- Email contains contact details

### Test 3: Check Admin Panel

1. Open `nexad-website/admin.html`
2. Sign in with `nexad.support@gmail.com`
3. Look at the contacts list

### What you should see:
- Your test contact appears in the list
- Status badge shows "Unread"

### Test 4: Test Reply

1. Click "Reply" button on a contact
2. Type a test message
3. Click "Send Reply"

### What you should see:
- Success notification
- Status changes to "Replied"
- Customer receives email

---

## ✅ Success Indicators

### You know it's working when:

1. **Terminal shows**:
   - ✓ Logged in successfully
   - ✓ Linked to project
   - ✓ Secret set successfully
   - ✓ Deployed Function

2. **Supabase shows**:
   - Tables created (contacts, contact_replies)
   - Realtime enabled (toggles are ON)
   - Function deployed (visible in Functions page)

3. **Resend shows**:
   - API key created
   - Admin email verified
   - Emails in "Emails" page (after testing)

4. **Browser shows**:
   - Contact form submits successfully
   - Admin panel loads contacts
   - Real-time updates work
   - Reply modal opens and sends

5. **Gmail shows**:
   - Email notifications received
   - Reply emails received (by customers)

---

## 🎉 You're Done!

If you see all these success indicators, your system is fully operational!

You now have:
- ✅ Real-time contact management
- ✅ Email notifications
- ✅ Reply functionality
- ✅ Professional UI

All without needing your own domain! 🚀

---

## 📞 Common Questions

### Q: Do I need to pay for Resend?
**A**: No! The test domain is completely free. You get 100 emails/day at no cost.

### Q: Can customers see my test domain?
**A**: Yes, emails will show "via resend.dev" in some email clients. But this is normal for test domains and doesn't affect functionality.

### Q: When should I add my own domain?
**A**: When you exceed 100 emails/day or want professional branding. But for now, test domain is perfect!

### Q: What if I lose my API key?
**A**: You can't recover it, but you can create a new one in Resend Dashboard → API Keys → Create API Key. Then update it in Supabase with `supabase secrets set RESEND_API_KEY=new_key`.

### Q: How do I know if emails are being sent?
**A**: Check Resend Dashboard → Emails. You'll see a list of all sent emails with their status.

---

This visual guide should help you complete the setup without any confusion! Follow each step carefully and check the success indicators as you go. 🎯
