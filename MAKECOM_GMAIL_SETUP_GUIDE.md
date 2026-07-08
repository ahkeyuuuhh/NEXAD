# 📧 MAKE.COM GMAIL SETUP - VISUAL GUIDE

## YOUR WEBHOOK URL
```
https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr
```

---

## STEP-BY-STEP SETUP

### STEP 1: Open Your Make.com Scenario

1. Go to: https://www.make.com
2. Log in to your account
3. Find your scenario with the webhook
4. Click to open it

---

### STEP 2: Verify Webhook Module

You should see:
- **Module 1:** Webhooks → Custom webhook
- **Webhook URL:** https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr

If you don't see this, create a new webhook with this URL.

---

### STEP 3: Add Gmail Module

1. Click the **"+"** button (or circle) after the webhook module
2. In the search box, type: **"Gmail"**
3. Select: **"Gmail"** (with Google logo)
4. Select: **"Send an Email"**

---

### STEP 4: Connect Gmail Account

1. Click **"Create a connection"**
2. A Google sign-in window will open
3. Sign in with: **zitacristel@gmail.com** (or any Gmail account)
4. Click **"Allow"** to give Make.com permission
5. Connection created! ✅

---

### STEP 5: Configure Email Fields

Now you'll see a form with fields. Fill them in:

#### Field 1: To
- Click in the **"To"** field
- You'll see a list of variables from the webhook
- Click on: **`contact_email`**
- It will insert: `{{1.contact_email}}`

#### Field 2: Subject
- Click in the **"Subject"** field
- Type: `Re: `
- Then click on: **`contact_subject`**
- Result: `Re: {{1.contact_subject}}`

#### Field 3: Content
- Click **"Show advanced settings"** (at the bottom)
- Find **"Content Type"** dropdown
- Select: **"HTML"**
- Click in the **"Content"** field
- Paste this HTML template:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Reply from NEXAD Support</h2>
    
    <p>Hi {{1.contact_name}},</p>
    
    <p>Thank you for contacting NEXAD. Here's our response to your inquiry:</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
        {{1.reply_message}}
    </div>
    
    <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Your original message:</strong>
        <p style="color: #666;">{{1.original_message}}</p>
    </div>
    
    <p>If you have any further questions, feel free to reply to this email.</p>
    
    <p>Best regards,<br>
    NEXAD Support Team</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="font-size: 12px; color: #999;">
        This email was sent from NEXAD Support
    </p>
</div>
```

**Note:** The `{{1.variable_name}}` format is how Make.com inserts data from the webhook.

#### Field 4: From Name (Optional)
- Find **"From Name"** field
- Type: `NEXAD Support`

---

### STEP 6: Save and Activate

1. Click **"OK"** (bottom right of Gmail module)
2. Click **"Save"** (bottom left of scenario)
3. Toggle the switch at the bottom to **"ON"**
4. The scenario is now active! ✅

---

### STEP 7: Test the Flow

#### 7.1 Send Test Reply
1. Go to Admin Dashboard: http://localhost:8080/admin.html
2. Refresh the page (Ctrl+F5)
3. Click on any contact
4. Click "Reply"
5. Type: "This is a test reply from the new webhook system!"
6. Click "Send Reply"

#### 7.2 Check Admin Dashboard
You should see:
- ✅ Green notification: "Reply sent successfully!"
- ✅ Contact status changed to "Replied"
- ✅ Modal closed

#### 7.3 Check Browser Console
Press F12 and look for:
```
✅ Reply saved to database
✅ Contact updated: status: 'replied'
📧 Sending reply to webhook automation...
📦 Sending to webhook: https://hook.eu1.make.com/...
📬 Webhook response status: 200
✅ Reply sent to webhook successfully!
```

#### 7.4 Check Make.com
1. Go back to Make.com
2. Click on the scenario
3. Look at the bottom - you should see execution history
4. Click on the latest execution
5. You should see:
   - Webhook received data ✅
   - Gmail sent email ✅

#### 7.5 Check Email
1. Go to the recipient's email inbox
2. Look for email from your Gmail account
3. Subject: "Re: [original subject]"
4. Should have formatted HTML content
5. Check spam folder if not in inbox

---

## TROUBLESHOOTING

### "No data received" in webhook?
- Make sure admin.js has the correct webhook URL
- Refresh admin dashboard (Ctrl+F5)
- Check browser console for errors

### Gmail module shows error?
- Reconnect Gmail account
- Check Gmail permissions
- Try with a different Gmail account

### Email not received?
- Check spam/junk folder
- Verify email address is correct
- Check Make.com execution log for errors
- Try sending to your own email first

### Variables not showing in Gmail module?
- Make sure webhook received data first
- Send a test reply from admin dashboard
- Click "OK" on webhook module after receiving data
- Then configure Gmail module

---

## MAKE.COM FIELD MAPPING

When configuring Gmail module, use these webhook variables:

| Gmail Field | Webhook Variable | Example |
|-------------|------------------|---------|
| To | `contact_email` | roldancchristian@gmail.com |
| Subject | `contact_subject` | General Inquiry |
| Content | `reply_message` | Thank you for contacting us... |
| | `contact_name` | Christian Roldan |
| | `original_message` | Hello! |
| | `admin_email` | nexad.support@gmail.com |

---

## FINAL CHECKLIST

Before testing, make sure:
- ✅ Webhook URL is correct in admin.js
- ✅ Gmail account connected in Make.com
- ✅ All email fields configured
- ✅ Content type set to HTML
- ✅ Scenario is saved
- ✅ Scenario is turned ON
- ✅ Admin dashboard refreshed

---

## SUCCESS INDICATORS

When everything works:
- ✅ Admin sees success notification
- ✅ Reply saves to database
- ✅ Contact status updates to "Replied"
- ✅ Make.com shows successful execution
- ✅ Customer receives formatted email
- ✅ No console errors

---

**You're almost done! Just configure the Gmail module and test!**

