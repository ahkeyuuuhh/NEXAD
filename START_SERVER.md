# 🚀 HOW TO START THE SERVER CORRECTLY

## THE PROBLEM

You're getting a 404 error because the server isn't running from the correct directory.

## THE SOLUTION

You have TWO options:

---

## OPTION 1: Run Server from PARENT Directory (Recommended)

This matches your current URL structure: `http://localhost:8080/nexad-website/contact.html`

### Steps:

1. **Open terminal in the PARENT directory** (the one that CONTAINS the nexad-website folder)

2. **Run this command:**
   ```bash
   python -m http.server 8080
   ```

3. **Open browser and go to:**
   ```
   http://localhost:8080/nexad-website/contact.html
   ```

4. **Supabase Redirect URL should be:**
   ```
   http://localhost:8080/nexad-website/contact.html
   ```

---

## OPTION 2: Run Server from INSIDE nexad-website (Simpler)

This changes the URL to: `http://localhost:8080/contact.html`

### Steps:

1. **Open terminal INSIDE the nexad-website folder**
   ```bash
   cd nexad-website
   ```

2. **Run this command:**
   ```bash
   python -m http.server 8080
   ```

3. **Open browser and go to:**
   ```
   http://localhost:8080/contact.html
   ```

4. **Supabase Redirect URL should be:**
   ```
   http://localhost:8080/contact.html
   ```

---

## WHICH OPTION TO CHOOSE?

**Use OPTION 2** - It's simpler and cleaner!

---

## COMPLETE STEPS FOR OPTION 2:

1. **Stop any running servers** (Ctrl + C in terminal)

2. **Navigate to nexad-website folder:**
   ```bash
   cd nexad-website
   ```

3. **Start the server:**
   ```bash
   python -m http.server 8080
   ```

4. **Update Supabase:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to: Authentication → URL Configuration
   - Add Redirect URL: `http://localhost:8080/contact.html`
   - Site URL: `http://localhost:8080`
   - Click Save

5. **Clear browser cache:**
   - Press Ctrl + Shift + Delete
   - Clear cookies and cache
   - Close browser

6. **Test:**
   - Open browser
   - Go to: `http://localhost:8080/contact.html`
   - Click "Continue with Google"
   - Sign in
   - Should redirect back and show the form!

---

## TROUBLESHOOTING

### If you see "This localhost page can't be found":
- Make sure the server is running (you should see "Serving HTTP on..." in terminal)
- Check you're in the correct directory
- Try refreshing the page

### If login keeps loading:
- Make sure you added the correct redirect URL to Supabase
- Clear browser cache completely
- Check browser console for errors (F12)

### If you see "Address already in use":
- Another server is using port 8080
- Either stop that server, or use a different port:
  ```bash
  python -m http.server 8081
  ```
  Then update all URLs to use 8081 instead of 8080

---

## QUICK COMMAND REFERENCE

**Start server (from nexad-website folder):**
```bash
python -m http.server 8080
```

**Stop server:**
```
Ctrl + C
```

**Check if server is running:**
- You should see: "Serving HTTP on 0.0.0.0 port 8080..."
- Open: http://localhost:8080

---

## ✅ FINAL CHECKLIST

- [ ] Terminal is in nexad-website folder
- [ ] Server is running (python -m http.server 8080)
- [ ] Can access http://localhost:8080/contact.html
- [ ] Supabase redirect URL is: http://localhost:8080/contact.html
- [ ] Browser cache is cleared
- [ ] Ready to test login!
