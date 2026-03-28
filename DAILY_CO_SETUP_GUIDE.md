# 🎥 Daily.co API Setup Guide

## Step-by-Step Instructions

### Step 1: Create Daily.co Account (2 minutes)

1. **Go to Daily.co website**
   - Open your browser
   - Navigate to: https://www.daily.co/

2. **Sign Up**
   - Click "Sign Up" or "Get Started Free"
   - Choose sign-up method:
     - Email + Password
     - Google Account
     - GitHub Account
   - Complete the registration

3. **Verify Email** (if using email signup)
   - Check your email inbox
   - Click verification link
   - Return to Daily.co

---

### Step 2: Access Dashboard (1 minute)

1. **Log in to Daily.co**
   - Go to: https://dashboard.daily.co/
   - Or click "Dashboard" after signing up

2. **You should see:**
   - Dashboard overview
   - Usage statistics (0 minutes used)
   - Navigation menu on the left

---

### Step 3: Get Your API Key (1 minute)

1. **Navigate to Developers Section**
   - Look at the left sidebar
   - Click on "Developers" or "API Keys"
   - Or go directly to: https://dashboard.daily.co/developers

2. **Find Your API Key**
   - You'll see a section called "API Keys"
   - Your default API key is already created
   - It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

3. **Copy the API Key**
   - Click the "Copy" button next to the key
   - Or manually select and copy the entire key
   - **IMPORTANT**: Keep this key secret!

---

### Step 4: Add API Key to NEXAD (1 minute)

1. **Open your project folder**
   ```bash
   cd nexad-app
   ```

2. **Open the `.env` file**
   - Location: `nexad-app/.env`
   - Use any text editor

3. **Add your API key**
   ```env
   # Daily.co API Key for Virtual Consultations
   EXPO_PUBLIC_DAILY_API_KEY=paste_your_key_here
   ```

4. **Example:**
   ```env
   EXPO_PUBLIC_DAILY_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

5. **Save the file**

---

### Step 5: Verify Setup (1 minute)

1. **Check the `.env` file**
   ```bash
   cat nexad-app/.env
   ```
   
   You should see:
   ```
   EXPO_PUBLIC_DAILY_API_KEY=your_actual_key_here
   ```

2. **Make sure:**
   - No spaces around the `=` sign
   - No quotes around the key
   - Key is on a single line
   - File is saved

---

## ✅ Setup Complete!

Your Daily.co API is now configured. You can proceed with building the APK.

---

## 📊 Understanding Your Free Tier

### What You Get (Free):
- **10,000 participant minutes per month**
- Unlimited rooms
- Up to 200 participants per room
- Recording capabilities
- Screen sharing
- Chat functionality

### What This Means:
- **50 consultations/day × 30 minutes = 1,500 minutes/day**
- **1,500 × 30 days = 45,000 minutes/month**
- You'll need the **Pro plan** ($99/month) for this usage

### Recommended for Schools:
- **Start with Free Tier** to test
- **Monitor usage** in Daily.co dashboard
- **Upgrade to Pro** when needed

---

## 🔒 Security Best Practices

### Protect Your API Key:
- ✅ Never commit `.env` to git
- ✅ Never share your API key publicly
- ✅ Never post it in forums or chat
- ✅ Add `.env` to `.gitignore`

### If Key is Compromised:
1. Go to Daily.co Dashboard
2. Navigate to Developers → API Keys
3. Click "Regenerate" or "Delete"
4. Create new key
5. Update `.env` file
6. Rebuild APK

---

## 🧪 Test Your API Key

You can test if your API key works by running this command:

```bash
curl -X GET https://api.daily.co/v1/rooms \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

Replace `YOUR_API_KEY_HERE` with your actual key.

**Expected Response:**
```json
{
  "total_count": 0,
  "data": []
}
```

This means your API key is valid!

---

## 📱 Next Steps

Now that Daily.co is set up:

1. ✅ Daily.co API key configured
2. ⬜ Run database migration
3. ⬜ Run `npx expo prebuild --clean`
4. ⬜ Build APK with `eas build`

Continue with the deployment checklist!

---

## 🐛 Troubleshooting

### Issue: Can't find API key in dashboard
**Solution:**
- Make sure you're logged in
- Go to: https://dashboard.daily.co/developers
- Look for "API Keys" section
- If no key exists, click "Create API Key"

### Issue: API key not working
**Solution:**
- Verify key is copied correctly (no extra spaces)
- Check `.env` file format
- Ensure key starts with correct characters
- Try regenerating key in dashboard

### Issue: "Invalid API key" error
**Solution:**
- Key might be expired or deleted
- Generate new key in dashboard
- Update `.env` file
- Restart development server

---

## 💡 Pro Tips

1. **Create Multiple Keys** (for different environments)
   - Development key
   - Production key
   - Testing key

2. **Set Key Permissions** (if available)
   - Limit to specific domains
   - Set expiration dates
   - Monitor usage per key

3. **Monitor Usage**
   - Check Daily.co dashboard regularly
   - Set up usage alerts
   - Plan for scaling

---

## 📞 Need Help?

- **Daily.co Docs**: https://docs.daily.co/
- **Daily.co Support**: support@daily.co
- **Daily.co Community**: https://community.daily.co/

---

**Setup Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

Once complete, proceed to database migration!
