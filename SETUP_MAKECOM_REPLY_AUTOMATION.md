# 📧 SETUP MAKE.COM AUTOMATION FOR ADMIN REPLIES

## OVERVIEW

Instead of using Resend API (which has testing mode limitations), we'll use Make.com to send emails via Gmail. This way you can send emails to ANY address without domain verification!

---

## STEP 1: CREATE MAKE.COM SCENARIO

### 1.1 Go to Make.com
- Open: https://www.make.com
- Log in to your account

### 1.2 Create New Scenario
- Click "Create a new scenario"
- Name it: "NEXAD Admin Reply Email"

---

## STEP 2: ADD WEBHOOK TRIGGER

### 2.1 Add Webhook Module
- Click the "+" button
- Search for "Webhooks"
- Select "Custom webhook"
- Click "Create a webhook"
- Name it: "Admin Reply Webhook"
- Click "Save"

### 2.2 Copy Webhook URL
- Make.com will show you a webhook URL
- It looks like: `https://hook.eu1.make.com/xxxxxxxxxxxxx`
- **COPY THIS URL** - you'll need it later

### 2.3 Test the Webhook
- Leave the Make.com tab open
- The webhook is now waiting for data

---

## STEP 3: UPDATE ADMIN.JS WITH WEBHOOK URL

### 3.1 Open admin.js
- Open file: `nexad-website/scripts/admin.js`
- Find this line (around line 940):
```javascript
const WEBHOOK_URL = 'YOUR_MAKE_COM_WEBHOOK_URL_HERE';
```

### 3.2 Replace with Your Webhook URL
Change to:
```javascript
const WEBHOOK_URL = 'https://hook.eu1.make.com/xxxxxxxxxxxxx';
```
(Use the URL you copied from Make.com)

### 3.3 Save the File

---

## STEP 4: TEST THE WEBHOOK

### 4.1 Send a Test Reply
- Go to your Admin Dashboard
- Click on any contact
- Click "Reply"
- Type a test message
- Click "Send Reply"

### 4.2 Check Make.com
- Go back to Make.com tab
- You should see the webhook received data
- Click "OK" to continue

### 4.3 Verify Data Structure
You should see data like:
```json
{
  "type": "admin_reply",
  "contact_name": "Christian Roldan",
  "contact_email": "roldancchristian@gmail.com",
  "contact_subject": "General Inquiry",
  "original_message": "Hello! ",
  "reply_message": "Thank you for contacting us...",
  "admin_email": "nexad.support@gmail.com",
  "replied_at": "2026-04-05T08:50:00.000Z"
}
```

---

## STEP 5: ADD GMAIL MODULE

### 5.1 Add Gmail Module
- Click the "+" button after the webhook
- Search for "Gmail"
- Select "Send an Email"

### 5.2 Connect Gmail Account
- Click "Create a connection"
- Sign in with your Gmail account (zitacristel@gmail.com or any Gmail)
- Allow Make.com to access Gmail
- Click "Save"

### 5.3 Configure Email
Fill in the fields using webhook data:

**To:**
- Click in the field
- Select from webhook: `contact_email`

**Subject:**
- Type: `Re: `
- Click and select: `contact_subject`

**Content:**
- Click "Show advanced settings"
- Select "HTML" for Content Type
- Use this template:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Reply from NEXAD Support</h2>
    
    <p>Hi {{contact_name}},</p>
    
    <p>Thank you for contacting NEXAD. Here's our response to your inquiry:</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
        {{reply_message}}
    </div>
    
    <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Your original message:</strong>
        <p style="color: #666;">{{original_message}}</p>
    </div>
    
    <p>If you have any further questions, feel free to reply to this email.</p>
    
    <p>Best regards,<br>
    NEXAD Support Team</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="font-size: 12px; color: #999;">
        This email was sent from NEXAD Support<br>
        Reply to this email to contact us
    </p>
</div>
```

**From Name (optional):**
- Type: `NEXAD Support`

---

## STEP 6: TEST THE COMPLETE FLOW

### 6.1 Turn On the Scenario
- Click "Save" in Make.com
- Toggle the switch to "ON"

### 6.2 Send Another Test Reply
- Go to Admin Dashboard
- Reply to a contact
- Click "Send Reply"

### 6.3 Check Results
- Check Make.com: Should show successful execution
- Check recipient's email: Should receive the reply
- Check console: Should show success

---

## STEP 7: ADD ERROR HANDLING (OPTIONAL)

### 7.1 Add Error Handler
- Right-click on Gmail module
- Select "Add error handler"
- Add "Ignore" module

This ensures the automation doesn't fail if Gmail has issues.

---

## DATA STRUCTURE REFERENCE

The webhook sends this data to Make.com:

```json
{
  "type": "admin_reply",
  "contact_name": "Customer Name",
  "contact_email": "customer@email.com",
  "contact_subject": "Subject Line",
  "original_message": "Customer's original message",
  "reply_message": "Admin's reply message",
  "admin_email": "nexad.support@gmail.com",
  "replied_at": "2026-04-05T08:50:00.000Z"
}
```

---

## BENEFITS OF THIS APPROACH

✅ **No API limitations** - Send to ANY email address
✅ **Use Gmail** - No domain verification needed
✅ **Free** - Gmail allows 500 emails/day
✅ **Reliable** - Gmail delivery is excellent
✅ **Easy to modify** - Change email template in Make.com
✅ **No console errors** - Clean and simple

---

## TROUBLESHOOTING

### Webhook not receiving data?
- Check the webhook URL in admin.js
- Make sure you saved the file
- Refresh the admin dashboard
- Check browser console for errors

### Gmail not sending?
- Check Gmail connection in Make.com
- Verify Gmail account has permission
- Check Make.com execution history for errors

### Email not received?
- Check spam folder
- Verify email address is correct
- Check Make.com execution log

---

## CURRENT STATUS

✅ **Code Updated** - admin.js now uses webhook
✅ **Resend API Removed** - No more testing mode issues
✅ **Ready for Setup** - Just need to configure Make.com

---

## NEXT STEPS

1. Create Make.com scenario
2. Copy webhook URL
3. Update admin.js with webhook URL
4. Test the flow
5. Turn on the scenario

**Time Required:** 10-15 minutes
**Cost:** FREE (Gmail + Make.com free tier)

---

**This solution completely bypasses Resend API limitations and works with ANY email address!**

