# Lightcast API Setup Guide - Step by Step

## 📋 What You'll Need
- Email address
- 5 minutes of your time
- Internet connection

---

## Step 1: Register for Lightcast API (2 minutes)

### 1.1 Go to Registration Page
Open this link in your browser:
```
https://lightcast.io/open-skills/access
```

### 1.2 Fill Out the Form
You'll see a registration form. Fill in:
- **Name**: Your full name
- **Email**: Your work/personal email
- **Organization**: Your company/school name (e.g., "NEXAD")
- **Use Case**: Select "Education" or "Application Development"
- **Description**: Brief description like "Building a teacher-student matching system"

### 1.3 Submit the Form
Click the submit button and wait for confirmation.

---

## Step 2: Verify Your Email (1 minute)

### 2.1 Check Your Inbox
Look for an email from Lightcast (check spam folder if not in inbox)

### 2.2 Click Verification Link
Click the verification link in the email to confirm your email address

---

## Step 3: Receive Your Credentials (1 minute)

### 3.1 Wait for Credentials Email
After verification, you'll receive another email with:
- **Client ID**: A long string like `abc123def456`
- **Client Secret**: Another long string like `xyz789uvw012`

### 3.2 Copy Your Credentials
Keep this email open - you'll need these values in the next step

---

## Step 4: Add Credentials to Your App (1 minute)

### 4.1 Open the .env File
The `.env` file is already prepared in your `nexad-app` folder.

### 4.2 Add Your Credentials
Replace the empty values with your actual credentials:

```env
# Before (empty):
EXPO_PUBLIC_LIGHTCAST_CLIENT_ID=
EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET=

# After (with your credentials):
EXPO_PUBLIC_LIGHTCAST_CLIENT_ID=your_actual_client_id_here
EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET=your_actual_client_secret_here
```

**Example:**
```env
EXPO_PUBLIC_LIGHTCAST_CLIENT_ID=abc123def456ghi789
EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET=xyz789uvw012rst345
```

### 4.3 Save the File
Save the `.env` file after adding your credentials.

---

## Step 5: Test the Integration (Optional - 2 minutes)

### 5.1 Start the Development Server
```bash
cd nexad-app
npm start
```

### 5.2 Test on Your Device
1. Open the app on your device
2. Log in as a student
3. Go to "Find Teachers"
4. You should see "Recommended for You" section

### 5.3 Check Console
Look for messages like:
- ✅ "Lightcast token obtained successfully"
- ✅ "Skills fetched for department: ..."

---

## Step 6: Deploy to Production (5 minutes)

Once testing is successful, deploy the update:

### Windows:
```cmd
cd nexad-app
npm run update:preview
```

### Mac/Linux:
```bash
cd nexad-app
npm run update:preview
```

Or use the automated script:
- **Windows**: Double-click `deploy-skill-matching.bat`
- **Mac/Linux**: Run `./deploy-skill-matching.sh`

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Received Lightcast credentials email
- [ ] Added credentials to `.env` file
- [ ] Saved the `.env` file
- [ ] (Optional) Tested locally - recommendations appear
- [ ] Deployed OTA update
- [ ] Tested on device - recommendations work

---

## 🐛 Troubleshooting

### Problem: "Didn't receive credentials email"
**Solution**: 
- Check spam/junk folder
- Wait 10-15 minutes (sometimes delayed)
- Contact Lightcast support: https://lightcast.io/contact-us

### Problem: "Recommendations not showing"
**Solution**:
- Make sure student profile has a department set
- Check console for error messages
- Verify credentials are correct (no extra spaces)
- Restart the app after adding credentials

### Problem: "API authentication failed"
**Solution**:
- Double-check Client ID and Secret are correct
- Make sure there are no quotes around the values
- Verify no extra spaces before/after the values
- Try regenerating credentials from Lightcast

### Problem: "Environment variables not loading"
**Solution**:
- Make sure file is named exactly `.env` (not `.env.txt`)
- Restart the development server
- Clear cache: `npm start -- --clear`

---

## 📞 Need Help?

### Lightcast Support
- Website: https://lightcast.io/contact-us
- Documentation: https://docs.lightcast.io/

### Check Your Setup
1. Verify `.env` file exists in `nexad-app` folder
2. Verify credentials have no extra spaces
3. Check console logs for specific error messages
4. Try the test script (if available)

---

## 🎉 Success!

Once you see the "Recommended for You" section with teachers matched to the student's department, you're all set!

The feature will:
- Automatically match teachers to students based on department
- Show relevant skills for each teacher
- Update in real-time as students change departments
- Work offline with cached data

---

## 📊 What You Get with Free API Access

- ✅ 33,000+ skills database
- ✅ 75,000+ job titles
- ✅ Skill metadata and categories
- ✅ Autocomplete search
- ✅ Related skills lookup
- ✅ Monthly updates to skill taxonomy
- ✅ No credit card required
- ✅ No expiration

---

## 🚀 Next Steps

After successful setup:

1. **Monitor Usage**: Check how students interact with recommendations
2. **Gather Feedback**: Ask students if recommendations are helpful
3. **Optimize**: Adjust department mappings based on feedback
4. **Expand**: Consider adding more matching criteria

---

**Setup Time**: ~5 minutes
**Cost**: $0 (completely free)
**Difficulty**: Easy (just copy-paste!)

Good luck! 🎊
