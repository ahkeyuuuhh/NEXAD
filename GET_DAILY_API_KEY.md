# 🚀 Get Your Daily.co API Key - Quick Guide

## Follow These Steps:

### 1. Open Daily.co Website
Click this link: **https://www.daily.co/**

Or copy and paste into your browser:
```
https://www.daily.co/
```

---

### 2. Sign Up (Choose One Method)

**Option A: Email Sign Up**
- Click "Sign Up" or "Get Started Free"
- Enter your email
- Create a password
- Click "Create Account"
- Check your email for verification link

**Option B: Google Sign Up** (Fastest!)
- Click "Sign up with Google"
- Choose your Google account
- Authorize Daily.co
- Done!

**Option C: GitHub Sign Up**
- Click "Sign up with GitHub"
- Authorize Daily.co
- Done!

---

### 3. Access Your Dashboard

After signing up, you'll be redirected to:
```
https://dashboard.daily.co/
```

Or click "Dashboard" in the top menu.

---

### 4. Get Your API Key

**Method 1: Direct Link**
Go to: **https://dashboard.daily.co/developers**

**Method 2: Navigate**
1. Look at the left sidebar
2. Click "Developers"
3. You'll see "API Keys" section

---

### 5. Copy Your API Key

You'll see something like this:

```
┌─────────────────────────────────────────────────┐
│ API Keys                                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ Default API Key                                  │
│ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0       │
│                                                  │
│ [Copy] [Regenerate] [Delete]                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Click the "Copy" button** or manually select and copy the entire key.

---

### 6. Add to Your Project

1. **Open your project folder**
   ```bash
   cd nexad-app
   ```

2. **Open `.env` file** (it's already there!)
   - Use VS Code, Notepad, or any text editor
   - Location: `nexad-app/.env`

3. **Find this line:**
   ```env
   EXPO_PUBLIC_DAILY_API_KEY=
   ```

4. **Paste your API key after the `=`**
   ```env
   EXPO_PUBLIC_DAILY_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
   ```

5. **Save the file** (Ctrl+S or Cmd+S)

---

### 7. Verify It's Correct

Your `.env` file should now look like this:

```env
# Daily.co Video Consultation API
# Get your API key from: https://www.daily.co/
EXPO_PUBLIC_DAILY_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

**Important:**
- ✅ No spaces around the `=`
- ✅ No quotes around the key
- ✅ Key is on a single line
- ✅ File is saved

---

## ✅ Done! What's Next?

Now that you have your Daily.co API key:

1. ✅ Daily.co account created
2. ✅ API key copied
3. ✅ API key added to `.env`
4. ⬜ Run database migration (next step)
5. ⬜ Build APK

---

## 🎁 What You Get (Free Tier)

- **10,000 participant minutes per month**
- Unlimited rooms
- Up to 200 participants per room
- Recording capabilities
- Screen sharing
- Chat functionality

**Example Usage:**
- 20 consultations/day × 30 minutes = 600 minutes/day
- 600 × 30 days = 18,000 minutes/month
- You'll need Pro plan ($99/month) for heavy usage

**For Testing:**
- Free tier is perfect!
- Monitor usage in dashboard
- Upgrade later if needed

---

## 🔒 Keep Your Key Safe!

**DO:**
- ✅ Keep `.env` file private
- ✅ Add `.env` to `.gitignore`
- ✅ Never share your key publicly

**DON'T:**
- ❌ Commit `.env` to GitHub
- ❌ Post key in forums
- ❌ Share key in screenshots

---

## 🐛 Troubleshooting

### "I can't find the API key"
- Make sure you're logged in
- Go directly to: https://dashboard.daily.co/developers
- Look for "API Keys" section
- If empty, click "Create API Key"

### "My key doesn't work"
- Check for extra spaces in `.env`
- Make sure key is on one line
- Verify you copied the entire key
- Try regenerating the key

### "I accidentally shared my key"
1. Go to Daily.co dashboard
2. Click "Regenerate" next to your key
3. Copy the new key
4. Update `.env` file
5. Rebuild your app

---

## 📞 Need Help?

- **Daily.co Docs**: https://docs.daily.co/
- **Daily.co Support**: support@daily.co
- **Community Forum**: https://community.daily.co/

---

## 🎯 Quick Test

Want to test if your key works? Run this in terminal:

```bash
curl -X GET https://api.daily.co/v1/rooms \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

Replace `YOUR_API_KEY_HERE` with your actual key.

**If it works, you'll see:**
```json
{
  "total_count": 0,
  "data": []
}
```

---

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

Once you have your API key in the `.env` file, you're ready for the next step!
