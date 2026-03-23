# 📧 Resend API Key Setup Guide

## Overview
This guide shows you how to configure the Resend API key so that email notifications work when you reply to contacts from the admin panel.

---

## 🔑 Step 1: Get Your Resend API Key

1. **Sign up for Resend** (if you haven't already):
   - Go to https://resend.com
   - Click "Sign Up" and create a free account
   - Verify your email address

2. **Get your API key**:
   - Log in to your Resend dashboard
   - Go to **API Keys** section
   - Click **"Create API Key"**
   - Give it a name like "NEXAD Contact Emails"
   - Copy the API key (it starts with `re_`)
   - **IMPORTANT**: Save this key somewhere safe - you won't be able to see it again!

---

## 🚀 Step 2: Add API Key to Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project**:
   - Visit https://supabase.com/dashboard
   - Select your NEXAD project

2. **Navigate to Edge Functions Secrets**:
   - Click on **"Edge Functions"** in the left sidebar
   - Click on **"Manage secrets"** or **"Environment variables"**

3. **Add the API key**:
   - Click **"Add new secret"**
   - Name: `RESEND_API_KEY`
   - Value: Paste your Resend API key (starts with `re_`)
   - Click **"Save"**

### Option B: Using Supabase CLI

If you have the Supabase CLI installed, you can set the secret from your terminal:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Set the secret
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

---

## 📝 Step 3: Verify the Setup

1. **Check the Edge Function**:
   - The file `supabase/functions/send-contact-email/index.ts` already has the code to use this API key
   - It reads the key using: `Deno.env.get('RESEND_API_KEY')`

2. **Deploy the Edge Function** (if not already deployed):
   ```bash
   # Deploy the function
   supabase functions deploy send-contact-email
   ```

3. **Test the email functionality**:
   - Go to your admin panel
   - Click "Reply" on any contact message
   - Type a reply and click "Send Reply"
   - The email should be sent to the customer

---

## 🎯 How It Works

### When You Reply to a Contact:

1. **Admin clicks "Reply"** → Opens reply form modal
2. **Admin types message** → Enters reply text
3. **Admin clicks "Send Reply"** → Triggers the following:
   - Saves reply to database (`contact_replies` table)
   - Calls Supabase Edge Function `send-contact-email`
   - Edge Function uses Resend API to send email
   - Customer receives email with your reply
   - Contact status updates to "replied"

### Email Flow:
```
Admin Panel → Supabase Edge Function → Resend API → Customer's Email
```

---

## 📧 Email Configuration

### Current Setup:
- **From Address**: `NEXAD Support <onboarding@resend.dev>`
- **Reply-To**: `nexad.support@gmail.com`
- **Admin Email**: `nexad.support@gmail.com`

### To Use a Custom Domain (Optional):

If you want emails to come from your own domain (e.g., `support@nexad.com`):

1. **Add your domain in Resend**:
   - Go to Resend dashboard → **Domains**
   - Click **"Add Domain"**
   - Enter your domain (e.g., `nexad.com`)
   - Follow DNS verification steps

2. **Update the Edge Function**:
   - Edit `supabase/functions/send-contact-email/index.ts`
   - Change `from: 'NEXAD Support <onboarding@resend.dev>'`
   - To: `from: 'NEXAD Support <support@nexad.com>'`

3. **Redeploy**:
   ```bash
   supabase functions deploy send-contact-email
   ```

---

## 🔍 Troubleshooting

### Issue: "Email failed to send"

**Check 1: API Key is Set**
```bash
# List all secrets
supabase secrets list
```
You should see `RESEND_API_KEY` in the list.

**Check 2: API Key is Valid**
- Go to Resend dashboard
- Check if the API key is still active
- Try creating a new API key if needed

**Check 3: Edge Function Logs**
```bash
# View function logs
supabase functions logs send-contact-email
```

### Issue: "Database connection not available"

- Make sure you're logged in to the admin panel
- Check that Supabase client is initialized
- Verify your Supabase URL and anon key in `admin.js`

### Issue: Emails go to spam

- Use a verified domain in Resend (not `onboarding@resend.dev`)
- Add SPF, DKIM, and DMARC records to your domain
- Ask recipients to whitelist your email address

---

## 📊 Monitoring Email Delivery

### View Email Logs in Resend:
1. Go to Resend dashboard
2. Click **"Logs"** or **"Emails"**
3. See all sent emails, delivery status, and opens

### View Function Logs in Supabase:
```bash
# Real-time logs
supabase functions logs send-contact-email --follow

# Recent logs
supabase functions logs send-contact-email
```

---

## 🎉 Testing the Complete Flow

1. **Submit a test contact form**:
   - Go to your website contact page
   - Fill out the form and submit

2. **Check admin panel**:
   - Log in to admin panel
   - You should see the new contact

3. **Reply to the contact**:
   - Click "Reply" button
   - Type a test message
   - Click "Send Reply"

4. **Verify email was sent**:
   - Check Resend dashboard for the sent email
   - Check the customer's inbox
   - Verify the email looks correct

---

## 💡 Tips

- **Free Tier**: Resend offers 100 emails/day for free
- **Rate Limits**: Be aware of rate limits on the free tier
- **Email Templates**: You can customize the HTML templates in `index.ts`
- **Testing**: Use your own email for testing before going live
- **Backup**: Keep a copy of your API key in a secure password manager

---

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)

---

## ✅ Quick Checklist

- [ ] Created Resend account
- [ ] Generated API key from Resend
- [ ] Added `RESEND_API_KEY` to Supabase secrets
- [ ] Deployed Edge Function
- [ ] Tested reply functionality
- [ ] Verified email delivery
- [ ] (Optional) Set up custom domain

---

**Need Help?** Check the Supabase and Resend documentation or contact support.
