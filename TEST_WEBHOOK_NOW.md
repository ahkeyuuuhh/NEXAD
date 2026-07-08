# 🧪 TEST WEBHOOK - STEP BY STEP

## CURRENT STATUS

✅ Code updated with detailed logging
✅ Webhook URL configured
✅ Make.com scenario waiting for data

---

## HOW TO TEST

### STEP 1: Prepare Make.com

1. Go to Make.com: https://www.make.com
2. Open your "NEXAD Admin Contact Reply" scenario
3. Make sure it shows "Waiting for data..."
4. Keep this tab open

### STEP 2: Refresh Admin Dashboard

1. Go to: http://localhost:8080/admin.html
2. Press **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac) to hard refresh
3. This ensures the new code is loaded

### STEP 3: Open Browser Console

1. Press **F12** to open Developer Tools
2. Click on the **"Console"** tab
3. Clear the console (click the 🚫 icon)
4. Keep this open to see logs

### STEP 4: Send a Test Reply

1. In the admin dashboard, click on any contact
2. Click the **"Reply"** button
3. Type a test message: "This is a test reply to verify webhook integration"
4. Click **"Send Reply"**

### STEP 5: Check Console Output

You should see these logs in order:

```
📤 Sending reply...
✅ Reply saved to database
✅ Contact updated: status: 'replied'
📧 Sending reply to webhook automation...
✅ Contact data validated
📦 Payload to send: {
  "type": "admin_reply",
  "contact_name": "Christian Roldan",
  "contact_email": "roldancchristian@gmail.com",
  "contact_subject": "General Inquiry",
  "original_message": "Hello! ",
  "reply_message": "This is a test reply to verify webhook integration",
  "admin_email": "nexad.support@gmail.com",
  "replied_at": "2026-04-05T09:30:00.000Z"
}
📤 Sending to webhook: https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr
📬 Webhook response status: 200
📄 Webhook response: Accepted
✅ Reply sent to webhook successfully!
🔔 NOTIFICATION: [SUCCESS] ✅ Reply sent successfully!
```

### STEP 6: Check Make.com

1. Go back to Make.com tab
2. The webhook should now show "Successfully determined"
3. You should see the data structure
4. Click **"OK"** to continue

### STEP 7: Verify Data in Make.com

You should see these fields:
- `type`: "admin_reply"
- `contact_name`: "Christian Roldan"
- `contact_email`: "roldancchristian@gmail.com"
- `contact_subject`: "General Inquiry"
- `original_message`: "Hello! "
- `reply_message`: "This is a test reply..."
- `admin_email`: "nexad.support@gmail.com"
- `replied_at`: timestamp

---

## TROUBLESHOOTING

### Issue: Console shows "Webhook response status: 404"
**Cause:** Webhook URL is incorrect
**Solution:** 
- Verify webhook URL in admin.js matches Make.com
- Should be: `https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr`

### Issue: Console shows "Webhook response status: 500"
**Cause:** Make.com scenario has an error
**Solution:**
- Check Make.com scenario is ON
- Verify webhook module is configured correctly
- Try creating a new webhook

### Issue: No webhook logs in console
**Cause:** Code not updated or page not refreshed
**Solution:**
- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check admin.js file was saved

### Issue: Make.com still shows "Waiting for data..."
**Cause:** Webhook not receiving data
**Solution:**
- Check console for errors
- Verify webhook URL is correct
- Make sure reply was sent successfully
- Check network tab in DevTools for the webhook request

### Issue: Console shows CORS error
**Cause:** Browser blocking request
**Solution:**
- This shouldn't happen with Make.com webhooks
- Try in incognito/private mode
- Check if any browser extensions are blocking

---

## WHAT TO LOOK FOR

### In Console:
✅ "Reply saved to database"
✅ "Sending reply to webhook automation"
✅ "Payload to send" with full JSON
✅ "Webhook response status: 200"
✅ "Reply sent to webhook successfully"

### In Make.com:
✅ Webhook shows "Successfully determined"
✅ Data structure visible
✅ All fields populated correctly

### In Admin Dashboard:
✅ Green success notification
✅ Contact status changed to "Replied"
✅ Modal closed

---

## AFTER SUCCESSFUL TEST

Once the webhook receives data:

1. Click **"OK"** in Make.com
2. Add Gmail module (click the + button)
3. Configure email fields using the webhook data
4. Save and turn ON the scenario
5. Test again - email should be sent!

---

## CONSOLE COMMANDS FOR DEBUGGING

If you need to debug, paste these in console:

```javascript
// Check if webhook URL is configured
console.log('Webhook URL:', 'https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr');

// Test webhook manually
fetch('https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        type: 'admin_reply',
        contact_name: 'Test User',
        contact_email: 'test@example.com',
        contact_subject: 'Test Subject',
        original_message: 'Test original message',
        reply_message: 'Test reply message',
        admin_email: 'admin@test.com',
        replied_at: new Date().toISOString()
    })
}).then(r => console.log('Response:', r.status));
```

---

## EXPECTED TIMELINE

1. Click "Send Reply" → Instant
2. Reply saves to database → 0.5 seconds
3. Webhook called → 0.5 seconds
4. Make.com receives data → 1 second
5. Total: ~2 seconds

---

**Now try sending a test reply and watch the console!**

