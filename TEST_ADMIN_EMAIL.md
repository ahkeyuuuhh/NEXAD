# 🧪 TEST ADMIN EMAIL NOTIFICATIONS

## Enhanced logging is now active!

---

## 📋 STEP-BY-STEP TEST:

### Step 1: Open Contact Page
1. Go to: **http://localhost:8080/contact.html**
2. Press **F12** to open console

### Step 2: Submit Contact Form
1. Fill out the form with test data:
   - Name: Test User
   - Email: test@example.com
   - Subject: Test Notification
   - Message: Testing admin email notification
2. Click **Submit**

### Step 3: Watch Console Logs
You should see these logs in order:
```
📤 Attempting to save to database...
✅ Contact saved to database: {...}
📧 Sending email notification to admin...
📦 Email payload: {...}
📬 Email response status: 200
📄 Email response: {"success":true,...}
✅ Email notification sent to admin successfully!
```

### Step 4: Check Supabase Logs
1. Go to: https://supabase.com/dashboard/project/klrfkhyvgtffsjpdioax/functions/send-contact-email/logs
2. Look for the latest log entry
3. You should see:
```
📧 Email function called
✅ API key found
📨 Request type: new_contact
📤 Sending email to admin...
📧 sendEmailToAdmin called for: test@example.com
📮 Calling Resend API to send admin notification...
📧 Sending to: nexad.support@gmail.com
📬 Resend API response status: 200
✅ Admin notification sent successfully
```

### Step 5: Check Gmail
1. Go to: https://mail.google.com
2. Login to: **nexad.support@gmail.com**
3. Check **Inbox** and **Spam** folder
4. You should see email with subject: "New Contact: Test Notification - Test User"

---

## ❌ TROUBLESHOOTING

### If Console Shows Error:

**Error: "Email response status: 401"**
- The API key is wrong or missing
- Check Supabase secrets: `RESEND_API_KEY_WEB`

**Error: "Email response status: 422"**
- Invalid email format
- Check the contact email is valid

**Error: "Email response status: 500"**
- Resend API issue
- Check Resend dashboard for errors

### If No Email in Gmail:

1. **Check Spam Folder**
   - Emails from new senders often go to spam
   - Mark as "Not Spam" if found

2. **Check Resend Dashboard**
   - Go to: https://resend.com/emails
   - Look for the sent email
   - Check delivery status

3. **Verify API Key**
   - Go to: https://resend.com/api-keys
   - Make sure the key is active
   - Check if you've exceeded sending limits

4. **Check Supabase Logs**
   - Look for any errors in the Edge Function logs
   - The logs will show exactly what went wrong

---

## 🔍 WHAT TO TELL ME IF IT FAILS:

Please copy and paste:

1. **Console logs** (from browser F12):
   ```
   [Paste the console output here]
   ```

2. **Supabase Function logs**:
   ```
   [Paste from Supabase dashboard]
   ```

3. **Any error messages you see**

---

## ✅ SUCCESS INDICATORS:

- ✅ Console shows: "Email notification sent to admin successfully!"
- ✅ Supabase logs show: "Admin notification sent successfully"
- ✅ Email appears in nexad.support@gmail.com inbox (or spam)
- ✅ Email has NEXAD branding (black background, white text)

---

**GO TEST NOW!** 🚀

After testing, tell me:
- Did you see the console logs?
- Did you check Supabase logs?
- Did the email arrive?
- If not, what error did you see?
