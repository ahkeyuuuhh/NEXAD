# 🚀 NEXAD Admin Panel - Quick Reference Guide

## 📋 Quick Links

### Test & Verify:
- **Test Tracking**: Open `nexad-website/test-tracking.html`
- **Admin Panel**: Open `nexad-website/admin.html`
- **Main Website**: Open `nexad-website/index.html`
- **Manual Page**: Open `nexad-website/manual.html`

### Admin Login:
- **Email**: `nexad.support@gmail.com`
- **Method**: Google OAuth via Supabase

---

## 🎯 What Each File Does

### HTML Files:
| File | Purpose |
|------|---------|
| `index.html` | Main website with download buttons (tracks downloads) |
| `manual.html` | User manual page (tracks page views) |
| `contact.html` | Contact form with Google OAuth |
| `admin.html` | Admin dashboard with authentication |
| `test-tracking.html` | Test page for verifying tracking works |

### JavaScript Files:
| File | Purpose |
|------|---------|
| `scripts/download-tracker.js` | Tracks APK/IPA downloads |
| `scripts/page-view-tracker.js` | Tracks manual page views |
| `scripts/admin.js` | Admin dashboard logic & stats |
| `scripts/contact.js` | Contact form & OAuth |
| `scripts/main.js` | Main website functionality |
| `scripts/manual.js` | Manual page functionality |

### CSS Files:
| File | Purpose |
|------|---------|
| `styles/admin.css` | Admin panel dark theme |
| `styles/contact.css` | Contact page styling |
| `styles/manual.css` | Manual page styling |
| `styles/main.css` | Main website styling |

---

## 📊 localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `nexad_apk_downloads` | String (number) | Counts Android APK downloads |
| `nexad_ipa_downloads` | String (number) | Counts iOS IPA downloads |
| `nexad_manual_views` | String (number) | Counts manual page views |
| `nexad_contacts` | JSON Array | Stores contact form submissions |

---

## 🧪 Testing Commands

### View localStorage in Browser Console:
```javascript
// View all NEXAD data
console.log('APK Downloads:', localStorage.getItem('nexad_apk_downloads'));
console.log('IPA Downloads:', localStorage.getItem('nexad_ipa_downloads'));
console.log('Manual Views:', localStorage.getItem('nexad_manual_views'));
console.log('Contacts:', JSON.parse(localStorage.getItem('nexad_contacts')));

// Reset all counters
localStorage.setItem('nexad_apk_downloads', '0');
localStorage.setItem('nexad_ipa_downloads', '0');
localStorage.setItem('nexad_manual_views', '0');

// Clear all NEXAD data
localStorage.removeItem('nexad_apk_downloads');
localStorage.removeItem('nexad_ipa_downloads');
localStorage.removeItem('nexad_manual_views');
localStorage.removeItem('nexad_contacts');
```

---

## 🔧 Common Tasks

### Update IPA URL (After Building):
1. Open `nexad-website/scripts/admin.js`
2. Find line 11: `const IPA_URL = '';`
3. Replace with: `const IPA_URL = 'YOUR_IPA_URL_HERE';`
4. Open `nexad-website/index.html`
5. Find line 298: `<a href="#" class="download-btn ios-btn">`
6. Replace `#` with your IPA URL

### Build iOS IPA:
```bash
cd nexad-app
eas build --platform ios --profile preview
```

### Export Contacts:
1. Open admin panel
2. Go to Contacts tab
3. Click "Export to CSV" button
4. File downloads automatically

### Reset Statistics:
1. Open browser console (F12)
2. Run reset commands (see Testing Commands above)
3. Refresh admin panel

---

## 🎨 Admin Panel Tabs

### Overview Tab:
- Total Contacts count
- Total App Downloads (APK + IPA)
- Manual Page Views
- Recent Activity feed (last 5 contacts)

### Contacts Tab:
- List all contact submissions
- Reply button (opens email)
- Delete button (removes contact)
- Export to CSV button

### Analytics Tab:
- Contact submissions count
- APK downloads with progress bar
- IPA downloads with progress bar
- Manual views count
- Visual percentage distribution

---

## 🔐 Security Notes

- Only `nexad.support@gmail.com` can access admin panel
- OAuth handled by Supabase
- All data stored in browser localStorage
- No server-side database required
- Supabase anon key is safe for client-side use

---

## 📱 Current URLs

### APK Download:
```
https://expo.dev/artifacts/eas/jy8mSzY1mcXU3dk5Xkxfb.apk
```

### IPA Download:
```
Not yet built - requires Apple Developer credentials
```

---

## 🐛 Troubleshooting

### Downloads not tracking:
1. Open browser console (F12)
2. Click download button
3. Look for: `📱 APK download tracked: X`
4. If missing, check if `download-tracker.js` is loaded
5. Verify localStorage is enabled in browser

### Manual views not tracking:
1. Open browser console (F12)
2. Load manual.html
3. Look for: `📖 Manual page view tracked: X`
4. If missing, check if `page-view-tracker.js` is loaded
5. Verify localStorage is enabled in browser

### Admin panel not loading:
1. Check browser console for errors
2. Verify Supabase redirect URL is configured
3. Try signing out and signing in again
4. Clear browser cache and cookies
5. Ensure using correct email: `nexad.support@gmail.com`

### Stats not updating:
1. Click "Refresh Stats" button in test page
2. Check localStorage values in console
3. Hard refresh admin panel (Ctrl+Shift+R)
4. Verify tracking scripts are loaded

---

## 📞 Support

**Email**: nexad.support@gmail.com

**Check Console**: Always check browser console (F12) for error messages

**Test Page**: Use `test-tracking.html` to verify tracking works

---

## ✅ Deployment Checklist

- [ ] All files uploaded to web server
- [ ] Supabase redirect URLs configured
- [ ] Admin login tested with correct email
- [ ] Download tracking tested
- [ ] Page view tracking tested
- [ ] Contact form tested
- [ ] Admin dashboard shows correct stats
- [ ] iOS IPA built (optional - can do later)
- [ ] IPA URL updated in code (if built)
- [ ] Final testing in production

---

## 🎉 Quick Start

1. **Test Locally**:
   - Open `test-tracking.html`
   - Click simulation buttons
   - Verify stats update

2. **Test Real Flow**:
   - Open `index.html`
   - Click download button
   - Open `manual.html`
   - Check admin panel

3. **Deploy**:
   - Upload all files
   - Configure Supabase URLs
   - Test in production

4. **Build IPA** (Optional):
   - Run EAS build command
   - Update IPA URL in code
   - Test IPA download tracking

---

## 📚 Documentation Files

- `DEPLOYMENT_READY.md` - Complete deployment guide
- `ADMIN_PANEL_COMPLETE.md` - Feature overview
- `TRACKING_IMPLEMENTATION_COMPLETE.md` - Technical details
- `TRACKING_FLOW_DIAGRAM.md` - Visual flow diagrams
- `QUICK_REFERENCE.md` - This file

---

**Everything is ready! Deploy and enjoy your new admin panel!** 🚀
