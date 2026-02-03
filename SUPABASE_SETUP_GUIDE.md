# Supabase Setup Guide for NEXAD

## Step 1: ✅ Create Supabase Project
1. Go to https://supabase.com
2. Sign up/Sign in with GitHub
3. Create new project named "nexad"
4. Choose Free tier
5. Wait for project initialization

## Step 2: Get Your API Credentials

### Finding Your Project URL and Anon Key:
1. In your Supabase dashboard, click on your project
2. Go to **Settings** (gear icon in sidebar) → **API**
3. You'll see two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

### Copy These Values:
- Project URL → Will go in `EXPO_PUBLIC_SUPABASE_URL`
- anon public → Will go in `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Set Up Database Schema

### Option A: Using SQL Editor (Easiest)
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy entire contents of `database/schema.sql`
4. Paste into the query editor
5. Click **"Run"** or press Ctrl+Enter
6. Wait for confirmation (may take 30-60 seconds)

### Option B: Using Supabase CLI
```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (use the project ID from dashboard URL)
supabase link --project-ref your-project-id

# Push the schema
supabase db push
```

## Step 4: Set Up Storage Bucket

1. In Supabase dashboard, go to **Storage** (left sidebar)
2. Click **"Create a new bucket"**
3. Enter details:
   - **Name**: `consultation-documents`
   - **Public bucket**: OFF (private)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: Leave empty for now
4. Click **"Create bucket"**

### Set Storage Policies:
1. Click on the `consultation-documents` bucket
2. Go to **Policies** tab
3. Click **"New Policy"**
4. Add these policies:

**Policy 1: Users can upload their own files**
```sql
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consultation-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Users can read their own files**
```sql
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'consultation-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Teachers can read student files in their consultations**
```sql
CREATE POLICY "Teachers can read consultation files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'consultation-documents' AND
  EXISTS (
    SELECT 1 FROM public.consultation_requests cr
    WHERE cr.teacher_id = auth.uid()
  )
);
```

## Step 5: Test Your Setup

Run the app and test authentication:
```powershell
cd nexad-app
npm start
```

## Common Issues

### Issue: "Missing Supabase environment variables"
- **Fix**: Make sure `.env` file exists in `nexad-app/` folder
- Verify the credentials are correct (no extra spaces)

### Issue: "Invalid API key"
- **Fix**: Double-check you copied the **anon public** key, not service_role key

### Issue: Database schema errors
- **Fix**: Run the schema in parts if needed
- Make sure you're running it in the SQL Editor, not the Supabase CLI
- Check for any previous tables with same names (drop them first)

### Issue: Storage upload fails
- **Fix**: Verify storage policies are set up correctly
- Check bucket name is exactly `consultation-documents`

## Verification Checklist

- [ ] Supabase project created
- [ ] `.env` file created with correct credentials
- [ ] Database schema deployed successfully
- [ ] All 12 tables visible in Table Editor
- [ ] Storage bucket `consultation-documents` created
- [ ] Storage policies configured
- [ ] App starts without environment variable errors

## Next Steps After Setup

1. Test sign up/login functionality
2. Create a test consultation request
3. Upload a test document
4. Verify data appears in Supabase dashboard

## Useful Supabase Dashboard Links

- **Table Editor**: View and edit data in your tables
- **SQL Editor**: Run custom queries
- **Authentication**: Manage users and auth settings
- **Storage**: Manage uploaded files
- **Database** → **Extensions**: Enable additional Postgres features if needed

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- NEXAD Project Documentation: See `PROJECT_DOCUMENTATION.md`
- Database Schema: See `database/DATABASE_SCHEMA.md`
