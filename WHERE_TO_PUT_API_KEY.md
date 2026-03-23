# 🔑 WHERE TO PUT THE API KEY - Visual Guide

## 🎯 Quick Answer

**The API key goes in Supabase, NOT in your code files.**

---

## 📍 Exact Location

### Supabase Dashboard → Edge Functions → Secrets

```
Supabase Dashboard
    └── Your Project (NEXAD)
        └── Edge Functions (left sidebar)
            └── Manage secrets / Environment variables
                └── Add new secret
                    ├── Name: RESEND_API_KEY
                    └── Value: re_your_actual_key_here
```

---

## 🖼️ Step-by-Step Visual Guide

### Step 1: Open Supabase Dashboard
```
┌─────────────────────────────────────────────────┐
│  🌐 Browser: https://supabase.com/dashboard     │
└─────────────────────────────────────────────────┘
```

### Step 2: Select Your Project
```
┌─────────────────────────────────────────────────┐
│  Projects                                        │
│  ┌─────────────────────────────────────────┐   │
│  │  📦 NEXAD Project                        │   │ ← Click this
│  │  klrfkhyvgtffsjpdioax.supabase.co       │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Step 3: Click "Edge Functions" in Sidebar
```
┌──────────────────┬──────────────────────────────┐
│  Sidebar         │  Main Content                │
│                  │                              │
│  🏠 Home         │                              │
│  📊 Table Editor │                              │
│  🔐 Auth         │                              │
│  💾 Storage      │                              │
│  ⚡ Edge Functions│ ← Click this                │
│  📈 Logs         │                              │
│  ⚙️  Settings    │                              │
└──────────────────┴──────────────────────────────┘
```

### Step 4: Click "Manage secrets"
```
┌─────────────────────────────────────────────────┐
│  Edge Functions                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  send-contact-email                      │   │
│  │  Status: Deployed                        │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [Deploy new function]  [Manage secrets] ← Click│
└─────────────────────────────────────────────────┘
```

### Step 5: Add New Secret
```
┌─────────────────────────────────────────────────┐
│  Secrets / Environment Variables                 │
│                                                  │
│  [+ Add new secret] ← Click this                │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  Name:  [RESEND_API_KEY          ]      │   │
│  │  Value: [re_abc123xyz...         ]      │   │
│  │                                          │   │
│  │  [Cancel]  [Save]                        │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Step 6: Fill in the Details
```
Name:  RESEND_API_KEY
       ↑
       Must be EXACTLY this (case-sensitive)

Value: re_abc123xyz456...
       ↑
       Your actual Resend API key from resend.com
```

### Step 7: Click "Save"
```
┌─────────────────────────────────────────────────┐
│  ✅ Secret saved successfully                    │
│                                                  │
│  Secrets:                                        │
│  • RESEND_API_KEY (hidden)                      │
└─────────────────────────────────────────────────┘
```

---

## 🚫 Where NOT to Put the API Key

### ❌ DON'T put it in these files:
```
nexad-website/scripts/admin.js          ❌ NO
nexad-website/scripts/contact.js        ❌ NO
supabase/functions/.../index.ts         ❌ NO
.env file                               ❌ NO
config.js                               ❌ NO
```

### ✅ ONLY put it here:
```
Supabase Dashboard → Edge Functions → Secrets  ✅ YES
```

---

## 🔐 Why Supabase Secrets?

### Security Benefits:
- ✅ **Encrypted** - Stored securely
- ✅ **Hidden** - Not visible in code
- ✅ **Server-side** - Never exposed to browser
- ✅ **Access controlled** - Only Edge Functions can read it

### If you put it in code:
- ❌ **Exposed** - Anyone can see it
- ❌ **Stolen** - Can be used by others
- ❌ **Dangerous** - Security risk
- ❌ **Revoked** - Resend will disable it

---

## 📝 Exact Values to Use

### Secret Name (must be exact):
```
RESEND_API_KEY
```

### Secret Value (your API key):
```
re_abc123xyz456...
```
Get this from: https://resend.com → API Keys → Create API Key

---

## 🧪 How to Test It Works

### After adding the API key:

1. **Go to admin panel**: `http://localhost:8080/admin.html`
2. **Log in** with Google (nexad.support@gmail.com)
3. **Find a contact** in the list
4. **Click "Reply"** button
5. **Type a message** in the form
6. **Click "Send Reply"**
7. **Check for success** notification

### If it works:
```
✅ "Reply sent successfully!"
✅ Contact status changes to "Replied" (green badge)
✅ Customer receives email
```

### If it doesn't work:
```
❌ "Email failed to send"
→ Check if API key is set correctly
→ Check if key starts with "re_"
→ Try creating a new API key
```

---

## 🔍 How to Verify API Key is Set

### Using Supabase CLI:
```bash
# List all secrets
supabase secrets list

# You should see:
# RESEND_API_KEY
```

### Using Supabase Dashboard:
```
Edge Functions → Manage secrets
You should see: RESEND_API_KEY (hidden)
```

---

## 🔄 How the API Key is Used

### In Your Code (`index.ts`):
```typescript
// This line reads the secret from Supabase
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
                       ↑
                       Reads from Supabase secrets
```

### Flow:
```
1. Admin clicks "Send Reply"
2. Edge Function runs
3. Function reads RESEND_API_KEY from Supabase secrets
4. Function calls Resend API with the key
5. Resend sends the email
6. Customer receives email
```

---

## 💡 Common Mistakes

### Mistake 1: Wrong Name
```
❌ resend_api_key     (lowercase)
❌ RESEND-API-KEY     (dashes)
❌ RESEND_KEY         (missing API)
✅ RESEND_API_KEY     (correct)
```

### Mistake 2: Wrong Location
```
❌ Added to .env file
❌ Added to code file
❌ Added to Supabase project settings
✅ Added to Edge Functions secrets
```

### Mistake 3: Invalid Key
```
❌ Key doesn't start with "re_"
❌ Key has spaces or line breaks
❌ Key is expired or revoked
✅ Key is valid and active
```

---

## 🎯 Quick Checklist

Before testing, make sure:

- [ ] You have a Resend account
- [ ] You created an API key in Resend
- [ ] You copied the full API key (starts with `re_`)
- [ ] You opened Supabase dashboard
- [ ] You selected your NEXAD project
- [ ] You clicked "Edge Functions" in sidebar
- [ ] You clicked "Manage secrets"
- [ ] You clicked "Add new secret"
- [ ] You entered name: `RESEND_API_KEY`
- [ ] You pasted your API key as value
- [ ] You clicked "Save"
- [ ] You see the secret in the list

---

## 📞 Need Help?

### If you're stuck:

1. **Check Resend Dashboard**:
   - Go to https://resend.com
   - Click "API Keys"
   - Verify your key is active

2. **Check Supabase Logs**:
   ```bash
   supabase functions logs send-contact-email
   ```

3. **Check Browser Console**:
   - Open admin panel
   - Press F12
   - Look for errors

4. **Try a New API Key**:
   - Create a new key in Resend
   - Update the secret in Supabase
   - Test again

---

## ✅ Success Indicators

### You'll know it's working when:

1. ✅ No errors in browser console
2. ✅ "Reply sent successfully!" notification appears
3. ✅ Contact status changes to "Replied"
4. ✅ Email appears in customer's inbox
5. ✅ Email shows in Resend dashboard logs

---

## 🎉 You're Done!

Once you see the success notification and the email is delivered, your reply system is fully configured and working!

**Remember**: The API key goes in Supabase secrets, NOT in your code files.
