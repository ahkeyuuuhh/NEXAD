# 🚀 Simple Setup - Do This Now!

## You're Ready to Continue! ✅

You already have your Resend API key. That's all you need from Resend!

**Ignore the Domains page** - you don't need to add anything there.

---

## 📋 What to Do Right Now

### Step 1: Copy Your API Key

Make sure you have your Resend API key saved somewhere. It looks like:
```
re_AbCdEf123456789GhIjKl
```

### Step 2: Open Terminal

- Press `Windows + R`
- Type `cmd` and press Enter
- OR open PowerShell

### Step 3: Copy and Paste These Commands

**Command 1**: Install Supabase CLI
```bash
npm install -g supabase
```
Press Enter and wait for it to finish.

---

**Command 2**: Login to Supabase
```bash
supabase login
```
Press Enter. Your browser will open - sign in there.

---

**Command 3**: Go to your project folder
```bash
cd C:\Users\zitac\OneDrive\Documents\SCHOOL\OOP2\NEXAD
```
Press Enter.

---

**Command 4**: Link to Supabase
```bash
supabase link --project-ref klrfkhyvgtffsjpdioax
```
Press Enter. When it asks for password, just press Enter again (leave blank).

---

**Command 5**: Set your API key
```bash
supabase secrets set RESEND_API_KEY=PASTE_YOUR_KEY_HERE
```

**⚠️ IMPORTANT**: Replace `PASTE_YOUR_KEY_HERE` with your actual Resend API key!

Example:
```bash
supabase secrets set RESEND_API_KEY=re_AbCdEf123456789GhIjKl
```

Press Enter.

---

**Command 6**: Deploy the email function
```bash
supabase functions deploy send-contact-email
```
Press Enter and wait (takes about 30 seconds).

---

### Step 4: Setup Database

1. Open browser
2. Go to https://supabase.com/dashboard
3. Click on your project
4. Click "SQL Editor" (left menu)
5. Click "New Query"
6. Open the file `database/create_contacts_system.sql` in VS Code
7. Copy ALL the text (Ctrl+A, then Ctrl+C)
8. Paste into Supabase SQL Editor (Ctrl+V)
9. Click "Run" button
10. Wait for "Success" message

---

### Step 5: Enable Realtime

1. In Supabase Dashboard, click "Database" → "Replication"
2. Find `contacts` table → Toggle ON
3. Find `contact_replies` table → Toggle ON

---

### Step 6: Test It!

1. Open `nexad-website/contact.html` in browser
2. Sign in with Google
3. Fill out the form
4. Submit it
5. Check your Gmail: `nexad.support@gmail.com`
6. You should get an email! 📧

---

## ❓ FAQ

**Q: Do I need to verify my email in Resend?**
A: No! The test domain works without verification. Just test it!

**Q: Do I need to add a domain in Resend?**
A: No! The test domain `resend.dev` is automatically available.

**Q: What if I don't get the email?**
A: Check spam folder, then check function logs:
```bash
supabase functions logs send-contact-email
```

**Q: How do I know if it's working?**
A: After submitting the contact form, check:
1. Browser console (F12) - should show success messages
2. Gmail inbox - should receive notification email
3. Admin panel - should show the contact

---

## ✅ That's It!

Just follow the 6 steps above and you're done!

No need to worry about the Domains page in Resend. You're all set! 🎉

---

## 🆘 If You Get Stuck

1. Read the error message carefully
2. Check `COPY_PASTE_COMMANDS.md` for the exact commands
3. Make sure you replaced `PASTE_YOUR_KEY_HERE` with your actual API key
4. Make sure you're in the right folder (NEXAD)

---

## 🎯 Quick Checklist

- [ ] Installed Supabase CLI
- [ ] Logged into Supabase
- [ ] Navigated to NEXAD folder
- [ ] Linked to Supabase project
- [ ] Set API key secret
- [ ] Deployed email function
- [ ] Ran database SQL script
- [ ] Enabled realtime
- [ ] Tested contact form
- [ ] Received email notification

**Once all checked, you're done!** 🚀
