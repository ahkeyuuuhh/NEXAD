# 🚀 NEXAD Real-time Contact System Setup Guide

## Overview
This guide will help you set up the complete real-time contact management system with:
- ✅ Real-time database updates
- ✅ Email notifications to admin
- ✅ Reply functionality from admin panel
- ✅ Email replies sent to customers
- ✅ Live dashboard updates

---

## 📋 Prerequisites

1. **Supabase Account** (already have)
2. **Email Service** - Choose one:
   - Resend (Recommended - easiest setup)
   - SendGrid
   - AWS SES
   - Gmail SMTP

---

## 🗄️ Step 1: Setup Database

### 1.1 Run SQL Script in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `klrfkhyvgtffsjpdioax`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the entire contents of `database/create_contacts_system.sql`
6. Click "Run" button

This will create:
- `contacts` table - stores all contact form submissions
- `contact_replies` table - stores admin replies
- RLS policies - security rules
- Real-time subscriptions - live updates
- Helper functions - for statistics and operations

### 1.2 Verify Tables Created

1. Go to "Table Editor" in Supabase
2. You should see two new tables:
   - `contacts`
   - `contact_replies`

---

## 📧 Step 2: Setup Email Service (Resend - Recommended)

### 2.1 Create Resend Account

1. Go to https://resend.com
2. Sign up for free account
3. Verify your email

### 2.2 Add Your Domain (Optional but Recommended)

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., your actual domain name like `yourdomain.com`)
5. Wait for verification (skip this for now if you don't have a domain yet)

**OR use Resend's test domain for now:**
- You can send emails from `onboarding@resend.dev`
- Limited to 100 emails/day
- Good for testing

### 2.3 Get API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it "NEXAD Contact System"
4. Copy the API key (starts with `re_`)
5. Save it securely - you'll need it next

---

## ⚡ Step 3: Deploy Supabase Edge Function

### 3.1 Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### 3.2 Link Your Project

```bash
# Navigate to your project
cd /path/to/nexad

# Link to your Supabase project
supabase link --project-ref klrfkhyvgtffsjpdioax
```

### 3.3 Set Environment Variables

```bash
# Set your Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 3.4 Deploy the Function

```bash
# Deploy the email function
supabase functions deploy send-contact-email
```

### 3.5 Verify Deployment

1. Go to Supabase Dashboard → Edge Functions
2. You should see `send-contact-email` listed
3. Status should be "Active"

---

## 🔧 Step 4: Update Email Configuration

### 4.1 Update Edge Function

Edit `supabase/functions/send-contact-email/index.ts`:

```typescript
// Line 5: Update admin email (already correct)
const ADMIN_EMAIL = 'nexad.support@gmail.com'

// Lines 67-68: Update sender email
from: 'NEXAD <noreply@yourdomain.com>', // Change to your domain
// OR use Resend test domain:
from: 'NEXAD <onboarding@resend.dev>',
```

### 4.2 Update Admin Panel URL

Edit `supabase/functions/send-contact-email/index.ts` line 56:

```typescript
<a href="https://yourdomain.com/admin.html" class="button">View in Admin Panel</a>
```

Change `yourdomain.com` to your actual domain.

### 4.3 Redeploy Function

```bash
supabase functions deploy send-contact-email
```

---

## 🌐 Step 5: Enable Realtime

### 5.1 Enable Realtime in Supabase

1. Go to Supabase Dashboard → Database → Replication
2. Find `contacts` table
3. Toggle "Enable Realtime" to ON
4. Find `contact_replies` table
5. Toggle "Enable Realtime" to ON

### 5.2 Verify Realtime is Working

The SQL script already added the tables to the realtime publication. Verify:

```sql
-- Run this in SQL Editor
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

You should see `contacts` and `contact_replies` in the results.

---

## 🧪 Step 6: Test the System

### 6.1 Test Contact Form Submission

1. Open `nexad-website/contact.html` in browser
2. Click "Sign in with Google"
3. Fill out the contact form
4. Click "Send Message"
5. Check browser console for success messages

**Expected Console Output:**
```
📤 Submitting contact to database...
✅ Contact saved to database: {id: "...", ...}
📧 Sending email notification to admin...
✅ Email notification sent to admin
✅ Contact form submitted successfully
```

### 6.2 Check Admin Email

1. Check `nexad.support@gmail.com` inbox
2. You should receive an email with:
   - Subject: "New Contact: [Subject] - [Name]"
   - Contact details
   - Message content
   - Link to admin panel

### 6.3 Test Admin Panel Real-time Updates

1. Open `nexad-website/admin.html` in one browser tab
2. Sign in with `nexad.support@gmail.com`
3. Open `nexad-website/contact.html` in another tab
4. Submit a contact form
5. Watch the admin panel - it should update automatically!

**Expected Console Output in Admin Panel:**
```
⚡ Setting up real-time subscription...
⚡ Realtime subscription status: SUBSCRIBED
⚡ Real-time update received: {eventType: "INSERT", ...}
✅ New contact received: {name: "...", ...}
```

### 6.4 Test Reply Functionality

1. In admin panel, click "Reply" on a contact
2. Type a reply message
3. Click "Send Reply"
4. Check the customer's email inbox
5. They should receive your reply

**Expected Console Output:**
```
📤 Sending reply...
✅ Reply saved to database
✅ Reply email sent to customer
```

---

## 🔍 Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. Resend API key is correct
2. Edge function is deployed
3. Check Edge Function logs in Supabase Dashboard
4. Verify sender email domain is verified (or use test domain)

**Solution:**
```bash
# Check function logs
supabase functions logs send-contact-email

# Redeploy function
supabase functions deploy send-contact-email
```

### Issue: Real-time Not Working

**Check:**
1. Realtime is enabled for tables
2. Browser console for subscription status
3. RLS policies allow admin to read contacts

**Solution:**
```sql
-- Verify realtime is enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- If missing, run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_replies;
```

### Issue: Admin Can't See Contacts

**Check:**
1. Signed in with correct email: `nexad.support@gmail.com`
2. RLS policies are correct
3. Browser console for errors

**Solution:**
```sql
-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'contacts';

-- If missing, re-run the SQL script
```

### Issue: Contact Form Submission Fails

**Check:**
1. Browser console for errors
2. Supabase connection is working
3. RLS policy allows anonymous inserts

**Solution:**
```sql
-- Verify insert policy
SELECT * FROM pg_policies 
WHERE tablename = 'contacts' 
AND cmd = 'INSERT';
```

---

## 📊 Monitoring

### View Contact Statistics

Run in SQL Editor:
```sql
SELECT * FROM get_contact_statistics();
```

Returns:
```json
{
  "total_contacts": 10,
  "unread_contacts": 3,
  "read_contacts": 5,
  "replied_contacts": 2,
  "today_contacts": 2,
  "this_week_contacts": 7,
  "this_month_contacts": 10
}
```

### View Recent Contacts

```sql
SELECT * FROM contact_summary 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Edge Function Logs

```bash
# Real-time logs
supabase functions logs send-contact-email --follow

# Last 100 logs
supabase functions logs send-contact-email --limit 100
```

---

## 🎯 What You Get

### For Customers:
- ✅ Easy contact form with Google sign-in
- ✅ Instant confirmation message
- ✅ Email replies from admin
- ✅ Professional email formatting

### For Admin:
- ✅ Real-time notifications of new contacts
- ✅ Email alerts to Gmail inbox
- ✅ Live dashboard updates (no refresh needed)
- ✅ Reply directly from admin panel
- ✅ Track contact status (unread/read/replied)
- ✅ View contact history
- ✅ Export contacts to CSV

---

## 🔐 Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ Only admin can view/reply to contacts
- ✅ Anyone can submit contacts (anonymous)
- ✅ Email validation
- ✅ SQL injection protection
- ✅ XSS protection

---

## 💰 Cost Estimate

### Supabase (Free Tier):
- Database: 500 MB (plenty for contacts)
- Realtime: Unlimited connections
- Edge Functions: 500K invocations/month
- **Cost: FREE**

### Resend (Free Tier):
- 3,000 emails/month
- 100 emails/day
- **Cost: FREE**

### Total Monthly Cost: **$0** 🎉

---

## 🚀 Next Steps

1. ✅ Run SQL script in Supabase
2. ✅ Setup Resend account and get API key
3. ✅ Deploy Edge Function
4. ✅ Test contact form submission
5. ✅ Test admin panel real-time updates
6. ✅ Test reply functionality
7. ✅ Deploy to production

---

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase Edge Function logs
3. Verify all environment variables are set
4. Test with Resend test domain first
5. Contact: nexad.support@gmail.com

---

## 🎉 Success Checklist

- [ ] SQL script executed successfully
- [ ] Tables created in Supabase
- [ ] Realtime enabled for tables
- [ ] Resend account created
- [ ] API key obtained
- [ ] Edge Function deployed
- [ ] Environment variables set
- [ ] Contact form submission works
- [ ] Admin receives email notification
- [ ] Admin panel shows real-time updates
- [ ] Reply functionality works
- [ ] Customer receives reply email

**Once all checked, your system is fully operational!** 🚀
