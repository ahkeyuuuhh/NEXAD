# 🚨 QUICK FIX - DO THIS NOW

## The Problem
Contacts not showing in admin because RLS is blocking database inserts.

## The Solution (30 seconds)

### 1️⃣ Go to Supabase SQL Editor
https://supabase.com/dashboard/project/klrfkhyvgtffsjpdioax/sql

### 2️⃣ Run This SQL
```sql
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_replies DISABLE ROW LEVEL SECURITY;
```

### 3️⃣ Test It
- Open contact form in incognito window
- Submit a contact
- Check admin panel - contact should appear!

## That's It! ✅

Read `CONTACTS_FIXED_GUIDE.md` for detailed explanation.
