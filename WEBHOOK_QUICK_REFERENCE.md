# 📨 Webhook Integration - Quick Reference

## TL;DR

Your contact form now automatically sends data to Make.com webhook when submitted.

---

## 🔗 Webhook Details

**URL:** `https://hook.eu1.make.com/rjls5ysrfykr7vzhgx6w1biqtrg3t6b8`

**Method:** POST

**Content-Type:** application/json

**Form ID:** `#contactForm`

---

## 📦 Data Sent

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "message": "Message content",
  "subject": "General Inquiry",
  "timestamp": "2026-03-30T12:34:56.789Z",
  "user_info": {
    "name": "User Name",
    "email": "user@example.com",
    "picture": "https://avatar-url.com/image.jpg"
  }
}
```

---

## 📁 Where Is The Code?

**File:** `nexad-website/scripts/contact.js`

**Function:** `sendToWebhook(contactData)`

**Called From:** `handleFormSubmit(e)` function

---

## 🔧 How It Works

1. User fills form and clicks "Send Message"
2. Form submission intercepted (no page reload)
3. Data collected from form fields
4. Sent to webhook as JSON POST request
5. Also saved to database and localStorage
6. Success message shown to user

---

## ✅ Features

- ✅ No page reload
- ✅ Automatic field collection
- ✅ JSON POST request
- ✅ Proper headers
- ✅ Error handling
- ✅ Console logging
- ✅ User notifications
- ✅ Multiple backups

---

## 🧪 Test It

1. Go to contact page
2. Sign in with Google
3. Fill form and submit
4. Check browser console (F12)
5. Check Make.com execution history

---

## 🔍 Console Output

**Success:**
```
📤 Sending to Make.com webhook...
🔗 Sending to webhook: https://hook.eu1.make.com/...
📦 Data: {...}
✅ Webhook response: {...}
✅ Successfully sent to webhook
```

**Error:**
```
❌ Webhook error: [error message]
⚠️ Webhook send failed: [error details]
```

---

## 🛠️ Customization

### Change Webhook URL

Edit line in `contact.js`:
```javascript
const WEBHOOK_URL = 'https://your-new-webhook-url.com';
```

### Add More Fields

Modify `contactData` object:
```javascript
const contactData = {
    // existing fields...
    customField: formData.get('customField'),
};
```

---

## 🚀 Deploy

```bash
cd nexad-website
git add scripts/contact.js
git commit -m "Add webhook integration"
git push
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS Error | Webhook should allow CORS by default |
| 404 Error | Check webhook URL is correct |
| No data received | Check console logs for data being sent |
| Network error | Check internet connection |

---

## 📞 Test with curl

```bash
curl -X POST https://hook.eu1.make.com/rjls5ysrfykr7vzhgx6w1biqtrg3t6b8 \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Test"}'
```

---

## 📚 Full Documentation

See `WEBHOOK_INTEGRATION_GUIDE.md` for complete details.

---

**Status:** ✅ Ready to use!

**File:** `nexad-website/scripts/contact.js`

**Last Updated:** March 30, 2026
