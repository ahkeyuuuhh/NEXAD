# 🔧 Supabase Database Fix - Step by Step

## ✅ Your App is Updated!
I can see "Virtual Consultation v2.1" in your screenshot - the OTA update worked!

## ❌ But Database Needs Fixing
Error: "Database error: Permission denied. RLS policy blocking insert."

---

## 📝 STEP-BY-STEP INSTRUCTIONS:

### 1. Open Supabase Dashboard
```
URL: https://supabase.com/dashboard
```
- Log in with your account
- You should see your projects

### 2. Select NEXAD Project
- Click on your NEXAD project
- Wait for it to load

### 3. Open SQL Editor
- Look at the LEFT sidebar
- Find "SQL Editor" (has a database icon)
- Click it

### 4. Create New Query
- Click "New Query" button (top right)
- A blank editor will appear

### 5. Copy the SQL Fix
- Open file: `COPY_PASTE_THIS_IN_SUPABASE.sql`
- Select ALL text (Ctrl+A or Cmd+A)
- Copy it (Ctrl+C or Cmd+C)

### 6. Paste in Supabase
- Click in the SQL Editor
- Paste (Ctrl+V or Cmd+V)
- You should see the SQL code

### 7. Run the SQL
- Click the "RUN" button (or press F5)
- Wait 2-3 seconds
- Check the results below

### 8. Verify Success
Look for these messages in results:
```
✅ RLS policies fixed!
```

And a list of policies showing:
- Users can view their consultations
- Authenticated users can create consultations
- Hosts can update their consultations
- Students can update joined consultations

### 9. Test in App
- Go back to your NEXAD app
- Click "Create Consultation" again
- Should work now! 🎉

---

## 🎯 What You Should See:

### Before SQL Fix:
❌ "Database error: Permission denied"

### After SQL Fix:
✅ QR code appears
✅ 6-character invite code shows
✅ "Share Code" button works
✅ Success!

---

## 🆘 If SQL Fails:

### Error: "relation virtual_consultations does not exist"
**Solution**: Run the full setup from `RUN_THIS_IN_SUPABASE.sql` instead

### Error: "permission denied for table"
**Solution**: Make sure you're logged in as the project owner

### No errors but still doesn't work:
**Solution**: 
1. Close app completely
2. Reopen app
3. Try again

---

## ⏱️ Quick Summary:
1. Open Supabase Dashboard
2. Select NEXAD project
3. Click SQL Editor
4. Copy `COPY_PASTE_THIS_IN_SUPABASE.sql`
5. Paste and click RUN
6. Test app
7. Done! ✅

**Total time: 2 minutes**
