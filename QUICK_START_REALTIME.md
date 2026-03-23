# ⚡ Quick Start: Real-time Contact System

Get your real-time contact system running in 30 minutes!

---

## 🚀 Step 1: Database Setup (5 min)

1. Go to https://supabase.com/dashboard
2. Open your project: `klrfkhyvgtffsjpdioax`
3. Click "SQL Editor" → "New Query"
4. Copy/paste entire `database/create_contacts_system.sql`
5. Click "Run"
6. ✅ Done! Tables created.

---

## 📧 Step 2: Email Setup (10 min)

### Option A: Resend (Recommended)

1. Go to https://resend.com → Sign up
2. Get API key from dashboard
3. Save it (starts with `re_`)

### Option B: Gmail SMTP (Simpler)

1. Go to https://myaccount.google.com/apppasswords
2. Create app password for "NEXAD Contact System"
3. Save the 16-character password

---

## ⚡ Step 3: Deploy Function (10 min)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
cd /path/to/nexad
supabase link --project-ref klrfkhyvgtffsjpdioax

# Set API key (choose one)
supabase secrets set RESEND_API_KEY=re_your_key_here
# OR
supabase secrets set GMAIL_APP_PASSWORD="your password here"

# Deploy function (choose one)
supabase functions deploy send-contact-email
# OR
supabase functions deploy send-contact-email-gmail
```

---

## 🌐 Step 4: Enable Realtime (2 min)

1. Go to Supabase Dashboard → Database → Replication
2. Find `contacts` table → Toggle "Enable Realtime" ON
3. Find `contact_replies` table → Toggle "Enable Realtime" ON
4. ✅ Done!

---

## 🧪 Step 5: Test (5 min)

### Test Contact Form:
1. Open `nexad-website/contact.html`
2. Sign in with Google
3. Submit a message
4. Check console for: `✅ Contact saved to database`

### Test Admin Email:
1. Check `nexad.support@gmail.com` inbox
2. You should see "New Contact" email

### Test Real-time:
1. Open `nexad-website/admin.html` in Tab 1
2. Sign in with `nexad.support@gmail.com`
3. Open `nexad-website/contact.html` in Tab 2
4. Submit a contact
5. Watch Tab 1 - it updates automatically! 🎉

### Test Reply:
1. In admin panel, click "Reply" on a contact
2. Type a message
3. Click "Send Reply"
4. Check customer's email inbox

---

## ✅ Success Checklist

- [ ] Database tables created
- [ ] Realtime enabled
- [ ] Email service configured
- [ ] Edge function deployed
- [ ] Contact form works
- [ ] Admin receives email
- [ ] Real-time updates work
- [ ] Reply functionality works

---

## 🐛 Quick Troubleshooting

### Emails not sending?
```bash
# Check function logs
supabase functions logs send-contact-email
```

### Real-time not working?
```sql
-- Run in SQL Editor
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Can't see contacts?
- Make sure you're signed in with `nexad.support@gmail.com`
- Check browser console for errors

---

## 📚 Full Documentation

- `REALTIME_SYSTEM_SETUP.md` - Complete setup guide
- `GMAIL_SMTP_SETUP.md` - Gmail alternative
- `REALTIME_FEATURES_SUMMARY.md` - Feature overview

---

## 🎉 That's It!

Your real-time contact system is now live! 🚀

Customers can submit contacts → You get instant email notifications → Dashboard updates in real-time → You can reply directly from admin panel → Customers receive your replies!

**Everything works automatically!** ✨
