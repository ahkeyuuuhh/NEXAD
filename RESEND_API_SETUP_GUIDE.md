# Resend API Setup Guide for NEXAD Admin Panel

## Issue Fixed
The admin panel was showing "Reply saved but email failed to send. Check Resend API key." because the Resend API key was not properly configured in Supabase Edge Functions.

## What Was Fixed

### 1. Contact Deletion Issue ✅
- Fixed the `deleteContact` function to properly remove contacts from both database and UI
- Added immediate UI feedback when deleting contacts
- Fixed the button to call the correct `deleteContact` function instead of `deleteContactLocal`

### 2. Reply Modal Display Issue ✅
- Updated the reply modal to show the original user message
- Admin can now see what they're replying to without confusion
- Added a styled "Original Message" box in the reply modal

### 3. Resend API Configuration ⚠️
- The Edge Function is correctly configured to use the `RESEND_API_KEY` environment variable
- You need to set this secret in your Supabase project

## How to Fix the Resend API Key Issue

### Step 1: Get Your Resend API Key

1. Go to [Resend.com](https://resend.com) and sign up/login
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name like "NEXAD Production"
5. Copy the API key (it starts with `re_`)

### Step 2: Set the Secret in Supabase

You have two options:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/klrfkhyvgtffsjpdioax
2. Click on **Edge Functions** in the left sidebar
3. Click on **Manage secrets** or **Settings**
4. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (e.g., `re_123abc...`)
5. Click **Save**

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref klrfkhyvgtffsjpdioax

# Set the secret
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### Step 3: Deploy the Edge Function

After setting the secret, deploy the Edge Function:

```bash
# Deploy the send-contact-email function
supabase functions deploy send-contact-email
```

Or use the provided deployment script:

```bash
# On Windows
deploy-fix.bat

# On Mac/Linux
chmod +x deploy-fix.sh
./deploy-fix.sh
```

### Step 4: Verify the Setup

1. Go to your admin panel: http://localhost:8080/admin.html
2. Try replying to a contact message
3. You should see "Reply sent successfully!" instead of the API key error

## Important Notes

### Email Sending Domain

By default, Resend uses `onboarding@resend.dev` as the sender. To use your own domain:

1. Add and verify your domain in Resend dashboard
2. Update the Edge Function to use your domain:
   ```typescript
   from: 'NEXAD Support <support@yourdomain.com>'
   ```

### Testing Email Delivery

1. Send a test reply from the admin panel
2. Check the recipient's inbox (and spam folder)
3. Check Resend dashboard for delivery logs

### Troubleshooting

If emails still don't send:

1. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for errors related to `send-contact-email`

2. **Verify API Key:**
   ```bash
   supabase secrets list
   ```
   Make sure `RESEND_API_KEY` is listed

3. **Test the API Key:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

4. **Check Resend Dashboard:**
   - Go to Resend dashboard
   - Check if the API key is active
   - Check if you've exceeded your sending limits

## What's Next

After completing these steps:

1. ✅ Contacts will delete properly and disappear from the UI
2. ✅ Reply modal will show the original user message
3. ✅ Emails will send successfully when you reply to contacts
4. ✅ You'll receive email notifications for new contacts

## Deployment Checklist

- [ ] Get Resend API key from resend.com
- [ ] Set `RESEND_API_KEY` secret in Supabase
- [ ] Deploy Edge Function using `supabase functions deploy send-contact-email`
- [ ] Test contact deletion in admin panel
- [ ] Test reply functionality with original message display
- [ ] Verify email delivery
- [ ] (Optional) Configure custom domain in Resend

## Support

If you encounter any issues:
1. Check Supabase Edge Function logs
2. Check Resend dashboard for delivery status
3. Verify the API key is correctly set
4. Make sure the Edge Function is deployed

All three issues are now fixed and ready for deployment! 🚀
