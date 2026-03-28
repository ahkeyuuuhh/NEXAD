-- ============================================
-- FIX RECOMMENDATIONS - RUN THIS NOW
-- ============================================

-- Step 1: Check current student profiles
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  department,
  course
FROM student_profiles
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Update ALL students to have a department (if they don't have one)
-- This ensures recommendations will show for everyone
UPDATE student_profiles
SET department = COALESCE(
  department,
  CASE 
    WHEN course ILIKE '%computer%' THEN 'Computer Science'
    WHEN course ILIKE '%engineering%' THEN 'Engineering'
    WHEN course ILIKE '%business%' THEN 'Business Administration'
    WHEN course ILIKE '%nursing%' THEN 'Nursing'
    WHEN course ILIKE '%education%' THEN 'Education'
    ELSE 'General Studies'
  END
)
WHERE department IS NULL OR department = '';

-- Step 3: Check current teacher profiles
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  department,
  expertise_tags,
  is_active
FROM teacher_profiles
ORDER BY created_at DESC;

-- Step 4: Update ALL teachers to have expertise tags (if they don't have any)
-- This ensures they can be recommended
UPDATE teacher_profiles
SET expertise_tags = CASE
  -- Computer Science teachers
  WHEN department ILIKE '%computer%' OR department ILIKE '%IT%' OR department ILIKE '%information%' THEN
    ARRAY['Programming', 'Software Development', 'Web Development', 'JavaScript', 'Python', 'Database Management', 'Problem Solving']
  
  -- Engineering teachers
  WHEN department ILIKE '%engineering%' THEN
    ARRAY['Engineering', 'Mathematics', 'Physics', 'CAD', 'Project Management', 'Technical Drawing', 'Problem Solving']
  
  -- Business teachers
  WHEN department ILIKE '%business%' OR department ILIKE '%management%' OR department ILIKE '%accounting%' THEN
    ARRAY['Business Administration', 'Management', 'Leadership', 'Finance', 'Marketing', 'Strategic Planning']
  
  -- Nursing/Health teachers
  WHEN department ILIKE '%nursing%' OR department ILIKE '%health%' OR department ILIKE '%medical%' THEN
    ARRAY['Patient Care', 'Medical Terminology', 'Healthcare', 'Clinical Skills', 'Health Assessment', 'Nursing Practice']
  
  -- Education teachers
  WHEN department ILIKE '%education%' OR department ILIKE '%teaching%' THEN
    ARRAY['Teaching', 'Pedagogy', 'Curriculum Development', 'Classroom Management', 'Educational Psychology', 'Student Engagement']
  
  -- Mathematics teachers
  WHEN department ILIKE '%math%' THEN
    ARRAY['Mathematics', 'Calculus', 'Statistics', 'Problem Solving', 'Mathematical Modeling', 'Analysis']
  
  -- Science teachers
  WHEN department ILIKE '%science%' OR department ILIKE '%biology%' OR department ILIKE '%chemistry%' OR department ILIKE '%physics%' THEN
    ARRAY['Research', 'Scientific Method', 'Laboratory Techniques', 'Data Analysis', 'Critical Thinking', 'Experimentation']
  
  -- English/Literature teachers
  WHEN department ILIKE '%english%' OR department ILIKE '%literature%' THEN
    ARRAY['Writing', 'Literature', 'Grammar', 'Communication', 'Critical Thinking', 'Academic Writing', 'Reading Comprehension']
  
  -- Psychology teachers
  WHEN department ILIKE '%psychology%' THEN
    ARRAY['Counseling', 'Mental Health', 'Behavioral Analysis', 'Research Methods', 'Psychology', 'Human Behavior']
  
  -- Default for any other department
  ELSE
    ARRAY['Research', 'Communication', 'Critical Thinking', 'Problem Solving', 'Analysis', 'Teaching', 'Mentoring']
END
WHERE expertise_tags IS NULL OR array_length(expertise_tags, 1) IS NULL OR array_length(expertise_tags, 1) = 0;

-- Step 5: Make sure all teachers are active
UPDATE teacher_profiles
SET is_active = true
WHERE is_active IS NULL OR is_active = false;

-- Step 6: Verify the changes
SELECT 
  'Students with departments' as check_type,
  COUNT(*) as count
FROM student_profiles
WHERE department IS NOT NULL AND department != ''
UNION ALL
SELECT 
  'Teachers with expertise tags' as check_type,
  COUNT(*) as count
FROM teacher_profiles
WHERE expertise_tags IS NOT NULL AND array_length(expertise_tags, 1) > 0
UNION ALL
SELECT 
  'Active teachers' as check_type,
  COUNT(*) as count
FROM teacher_profiles
WHERE is_active = true;

-- Step 7: Show sample matches (what students will see)
SELECT 
  s.first_name || ' ' || s.last_name as student_name,
  s.department as student_dept,
  t.first_name || ' ' || t.last_name as teacher_name,
  t.department as teacher_dept,
  t.expertise_tags as teacher_skills,
  CASE 
    WHEN t.department ILIKE '%' || s.department || '%' THEN 'MATCH'
    WHEN s.department ILIKE '%' || t.department || '%' THEN 'MATCH'
    ELSE 'PARTIAL'
  END as match_type
FROM student_profiles s
CROSS JOIN teacher_profiles t
WHERE s.department IS NOT NULL 
  AND t.is_active = true
  AND t.expertise_tags IS NOT NULL
ORDER BY s.last_name, match_type
LIMIT 20;

-- ============================================
-- DONE! Now close and reopen your app
-- ============================================
