# Troubleshooting: Recommendations Not Showing

## Why Recommendations Might Not Appear

The "Recommended for You" section only shows when ALL of these conditions are met:

### ✅ Checklist:

1. **Student has a department**
   - The student profile must have a `department` field filled in
   - Example: "Computer Science", "Engineering", "Business", etc.

2. **Teachers have expertise tags**
   - Teachers must have `expertise_tags` in their profiles
   - Example: ["Programming", "JavaScript", "Web Development"]

3. **Not searching**
   - Recommendations hide when you're actively searching
   - Clear the search box to see recommendations

4. **Update downloaded**
   - App must have downloaded the latest OTA update
   - Close and reopen the app to trigger update check

---

## Quick Diagnostic Steps

### Step 1: Check Student Profile

Run this SQL query in Supabase SQL Editor:

```sql
-- Check if student has department
SELECT 
  user_id,
  first_name,
  last_name,
  department,
  course
FROM student_profiles
WHERE email = 'your_student_email@example.com';
```

**Expected Result**: `department` column should have a value like "Computer Science"

**If NULL or empty**: Update it with:
```sql
UPDATE student_profiles
SET department = 'Computer Science'
WHERE email = 'your_student_email@example.com';
```

---

### Step 2: Check Teacher Profiles

Run this SQL query:

```sql
-- Check if teachers have expertise tags
SELECT 
  user_id,
  first_name,
  last_name,
  department,
  expertise_tags,
  is_active
FROM teacher_profiles
WHERE is_active = true
ORDER BY last_name;
```

**Expected Result**: `expertise_tags` should be an array like:
```
{Programming, JavaScript, Web Development}
```

**If NULL or empty**: Update with:
```sql
UPDATE teacher_profiles
SET expertise_tags = ARRAY['Programming', 'JavaScript', 'Web Development', 'React', 'Node.js']
WHERE user_id = 'teacher_user_id_here';
```

---

### Step 3: Force Update Download

On your device:

1. **Completely close the app** (swipe away from recent apps)
2. **Clear app cache** (optional but recommended):
   - Go to Settings → Apps → NEXAD → Storage → Clear Cache
3. **Reopen the app**
4. **Wait 30 seconds** on the login screen
5. **Log in** and navigate to Find Teachers

---

### Step 4: Check Console Logs

If you have access to React Native debugger or can see console logs:

Look for these messages:
```
✅ "Fetching recommended teachers for department: Computer Science"
✅ "Found X recommended teachers"
✅ "Recommended teachers loaded successfully"

❌ "No department found for student"
❌ "No matching teachers found"
```

---

## Common Issues & Solutions

### Issue 1: "I have a department but no recommendations"

**Cause**: Teachers don't have matching expertise tags

**Solution**: Add expertise tags to teacher profiles:

```sql
-- For Computer Science teachers
UPDATE teacher_profiles
SET expertise_tags = ARRAY[
  'Programming', 'JavaScript', 'Python', 'Web Development',
  'Software Engineering', 'Database Management', 'React'
]
WHERE department ILIKE '%computer%';

-- For Engineering teachers
UPDATE teacher_profiles
SET expertise_tags = ARRAY[
  'Engineering', 'Mathematics', 'CAD', 'AutoCAD',
  'Project Management', 'Technical Drawing'
]
WHERE department ILIKE '%engineering%';

-- For Business teachers
UPDATE teacher_profiles
SET expertise_tags = ARRAY[
  'Business Administration', 'Management', 'Marketing',
  'Finance', 'Accounting', 'Leadership'
]
WHERE department ILIKE '%business%';
```

---

### Issue 2: "Update not downloading"

**Cause**: App not checking for updates

**Solution**:
1. Check internet connection
2. Force close and reopen app
3. Wait on splash screen for 10-30 seconds
4. Check EAS update logs:

```bash
cd nexad-app
eas update:list --channel production
```

Verify the latest update shows:
- Runtime version: 1.0.7
- Status: Published
- Recent timestamp

---

### Issue 3: "Recommendations show but wrong teachers"

**Cause**: Matching algorithm needs tuning

**Solution**: The algorithm matches based on:
1. Department similarity (highest priority)
2. Skill overlap (medium priority)
3. Expertise tags (lower priority)

To improve matches, ensure:
- Teacher departments match student departments
- Teacher expertise_tags include relevant skills
- Skills are spelled consistently

---

## Manual Test

### Create Test Data

```sql
-- Create test student with department
INSERT INTO student_profiles (
  user_id, email, first_name, last_name, department, course
) VALUES (
  'test-student-id',
  'test.student@example.com',
  'Test',
  'Student',
  'Computer Science',
  'BS Computer Science'
) ON CONFLICT (user_id) DO UPDATE
SET department = 'Computer Science';

-- Create test teacher with matching skills
INSERT INTO teacher_profiles (
  user_id, email, first_name, last_name, 
  department, position, expertise_tags, is_active
) VALUES (
  'test-teacher-id',
  'test.teacher@example.com',
  'Test',
  'Teacher',
  'Computer Science',
  'Professor',
  ARRAY['Programming', 'JavaScript', 'Web Development', 'React', 'Python'],
  true
) ON CONFLICT (user_id) DO UPDATE
SET expertise_tags = ARRAY['Programming', 'JavaScript', 'Web Development', 'React', 'Python'];
```

Now log in as the test student and check Find Teachers screen.

---

## Verification Script

Run this to see what the recommendation algorithm sees:

```sql
-- See what recommendations would be generated
WITH student_dept AS (
  SELECT department
  FROM student_profiles
  WHERE email = 'your_student_email@example.com'
),
matching_teachers AS (
  SELECT 
    t.first_name,
    t.last_name,
    t.department,
    t.expertise_tags,
    -- Calculate match score
    CASE 
      WHEN t.department ILIKE '%' || (SELECT department FROM student_dept) || '%' THEN 20
      ELSE 0
    END as dept_score,
    array_length(t.expertise_tags, 1) as skill_count
  FROM teacher_profiles t
  WHERE t.is_active = true
    AND t.expertise_tags IS NOT NULL
    AND array_length(t.expertise_tags, 1) > 0
)
SELECT 
  first_name,
  last_name,
  department,
  expertise_tags,
  dept_score,
  skill_count,
  (dept_score + (skill_count * 2)) as total_score
FROM matching_teachers
ORDER BY total_score DESC
LIMIT 10;
```

This shows which teachers would be recommended and why.

---

## Still Not Working?

### Check App Version

Make sure you're using the correct APK:
- **URL**: https://expo.dev/artifacts/eas/jy8mSzY1mcXU3dk5Xkxfb.apk
- **Channel**: production
- **Runtime**: 1.0.7

### Check Update Status

```bash
cd nexad-app
eas update:view --channel production
```

Should show:
- Latest update with today's date
- Status: Published
- Platform: android, ios

### Force Republish

If nothing works, republish the update:

```bash
cd nexad-app
npm run update:production
```

---

## Contact Support

If you've tried everything and it still doesn't work:

1. **Provide**:
   - Student email
   - Screenshot of Find Teachers screen
   - Result of SQL queries above
   - Console logs (if available)

2. **Check**:
   - App version in Settings
   - Last update check time
   - Network connectivity

---

## Expected Behavior

When working correctly, you should see:

```
┌─────────────────────────────────┐
│ 🔍 Search Bar                   │
├─────────────────────────────────┤
│ ⭐ Recommended for You          │
│ Based on Computer Science       │
│                                 │
│ ┌────┬────┬────┬────┐          │
│ │ T1 │ T2 │ T3 │ T4 │ → Scroll │
│ └────┴────┴────┴────┘          │
│                                 │
│ Skills: JavaScript, Python...   │
├─────────────────────────────────┤
│ All Teachers                    │
│ • Teacher 1                     │
│ • Teacher 2                     │
└─────────────────────────────────┘
```

The recommendations appear ABOVE "All Teachers" section.

---

Good luck! 🚀
