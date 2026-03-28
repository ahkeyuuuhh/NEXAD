# Skill-Based Matching - Testing Guide

## Quick Test Checklist

### Prerequisites
- [ ] Lightcast API credentials added to `.env`
- [ ] App deployed via OTA update
- [ ] Test device has the APK installed
- [ ] Test accounts created (student + teachers)

## Test Scenarios

### Scenario 1: Student with Department Sees Recommendations

**Setup:**
1. Log in as a student
2. Ensure profile has department set (e.g., "College of Computer Studies")
3. Ensure at least 3 teachers exist with relevant skills

**Steps:**
1. Navigate to "Find Teachers" screen
2. Observe the top section

**Expected Results:**
- ✅ "Recommended for You" section appears at the top
- ✅ Shows "Based on [Department Name]"
- ✅ Displays 1-10 teacher cards in horizontal carousel
- ✅ Each card shows:
  - Teacher photo or initials
  - Full name
  - Position
  - 1-2 skill badges
  - Green "Match" badge
- ✅ Tapping a card navigates to teacher profile

**Screenshot Locations:**
- Top of Find Teachers screen
- Horizontal scrollable carousel

---

### Scenario 2: Student without Department

**Setup:**
1. Log in as a student
2. Ensure profile has NO department set (null or empty)

**Steps:**
1. Navigate to "Find Teachers" screen

**Expected Results:**
- ✅ No "Recommended for You" section
- ✅ Shows "All Teachers" list immediately
- ✅ All active teachers displayed
- ✅ No errors or crashes

---

### Scenario 3: Search Functionality

**Setup:**
1. Log in as a student with department
2. Navigate to "Find Teachers"

**Steps:**
1. Observe recommendations section
2. Type in search box (e.g., "John")
3. Observe changes

**Expected Results:**
- ✅ Recommendations section disappears when searching
- ✅ Search results appear below
- ✅ Clearing search brings back recommendations
- ✅ Search works as before (name, department, position, skills)

---

### Scenario 4: No Matching Teachers

**Setup:**
1. Create a student with unique department (e.g., "Test Department")
2. Ensure no teachers have matching skills or department

**Steps:**
1. Log in as the test student
2. Navigate to "Find Teachers"

**Expected Results:**
- ✅ No "Recommended for You" section (or empty carousel)
- ✅ Shows "All Teachers" list
- ✅ No errors in console
- ✅ App remains functional

---

### Scenario 5: API Failure Handling

**Setup:**
1. Temporarily remove Lightcast credentials from `.env`
2. Rebuild/restart app

**Steps:**
1. Log in as a student with department
2. Navigate to "Find Teachers"
3. Check console logs

**Expected Results:**
- ✅ Recommendations still appear (using fallback mapping)
- ✅ Console shows "Lightcast API unavailable, using local mapping"
- ✅ No crashes or errors
- ✅ Recommendations based on local department-to-skills map

---

### Scenario 6: Performance Test

**Setup:**
1. Create 50+ teacher profiles
2. Log in as a student

**Steps:**
1. Navigate to "Find Teachers"
2. Measure load time
3. Scroll through recommendations
4. Search for teachers

**Expected Results:**
- ✅ Screen loads in <2 seconds
- ✅ Smooth scrolling in carousel
- ✅ No lag or stuttering
- ✅ Search remains responsive

---

### Scenario 7: Different Departments

**Test each department mapping:**

| Department | Expected Skills |
|------------|----------------|
| College of Computer Studies | Programming, JavaScript, Web Development |
| College of Engineering | CAD, Mathematics, Engineering |
| College of Business | Management, Marketing, Finance |
| College of Arts and Sciences | Research, Writing, Critical Thinking |
| College of Education | Teaching, Pedagogy, Curriculum |
| College of Nursing | Patient Care, Medical Terminology |

**Steps for each:**
1. Create/update student with specific department
2. Navigate to "Find Teachers"
3. Verify recommendations match expected skills

**Expected Results:**
- ✅ Recommendations relevant to department
- ✅ Teachers with matching skills ranked higher
- ✅ Same department teachers appear first

---

## Edge Cases

### Edge Case 1: Special Characters in Department
- Department: "College of Computer Studies & Engineering"
- Expected: Matches both CS and Engineering skills

### Edge Case 2: Case Sensitivity
- Department: "college of computer studies" (lowercase)
- Expected: Still matches correctly

### Edge Case 3: Partial Department Names
- Department: "Computer Studies"
- Expected: Matches "College of Computer Studies" teachers

### Edge Case 4: Empty Skills Array
- Teacher with `expertise_tags: []`
- Expected: Not recommended (score = 0)

### Edge Case 5: Null Skills
- Teacher with `expertise_tags: null`
- Expected: Not recommended (score = 0)

---

## Visual Regression Tests

### UI Elements to Verify:

1. **Recommended Section Header**
   - Star icon (gold color)
   - "Recommended for You" text (bold)
   - Department subtitle (gray)

2. **Teacher Cards**
   - Width: 140px
   - Rounded corners
   - White background with shadow
   - Avatar: 56x56px circle
   - Name: centered, bold
   - Position: centered, gray
   - Skill badges: blue background
   - Match badge: green with checkmark

3. **Carousel Behavior**
   - Horizontal scroll
   - Smooth scrolling
   - Proper spacing between cards
   - No horizontal scrollbar visible

4. **Responsive Design**
   - Works on small screens (320px width)
   - Works on large screens (tablet)
   - Portrait and landscape orientations

---

## Console Log Checks

### Expected Logs:

```
✅ "Skills for College of Computer Studies: [...]"
✅ "Found X recommended teachers for College of Computer Studies"
✅ "Loading teachers from database..."
✅ "Teachers loaded: X"
```

### Error Logs to Watch For:

```
❌ "Lightcast authentication error"
❌ "Error loading recommended teachers"
❌ "Supabase error"
❌ "Failed to get skills for department"
```

---

## Database Verification

### Check Student Profile:
```sql
SELECT id, first_name, last_name, department 
FROM student_profiles 
WHERE user_id = 'test_student_id';
```

### Check Teacher Profiles:
```sql
SELECT id, first_name, last_name, department, expertise_tags 
FROM teacher_profiles 
WHERE is_active = true 
AND is_accepting_consultations = true;
```

### Verify Recommendations Query:
```sql
-- This should return teachers with matching skills
SELECT 
  t.first_name,
  t.last_name,
  t.department,
  t.expertise_tags,
  CASE 
    WHEN t.department = 'College of Computer Studies' THEN 20
    ELSE 0
  END as dept_score
FROM teacher_profiles t
WHERE t.is_active = true
AND t.is_accepting_consultations = true
ORDER BY dept_score DESC;
```

---

## Automated Testing (Future)

### Unit Tests:
- [ ] `lightcastService.getSkillsForDepartment()`
- [ ] `lightcastService.getDepartmentSkillKeywords()`
- [ ] `useRecommendedTeachers` hook
- [ ] Matching algorithm scoring

### Integration Tests:
- [ ] API authentication flow
- [ ] Database queries
- [ ] Recommendation generation
- [ ] UI rendering

### E2E Tests:
- [ ] Complete user flow
- [ ] Navigation
- [ ] Search interaction
- [ ] Profile navigation

---

## Bug Report Template

If you find issues, report using this template:

```markdown
**Bug Title:** [Brief description]

**Environment:**
- Device: [e.g., Samsung Galaxy S21]
- OS: [e.g., Android 12]
- App Version: 1.0.7
- Channel: [preview/production]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[Attach screenshots]

**Console Logs:**
[Paste relevant logs]

**Additional Context:**
[Any other relevant information]
```

---

## Success Criteria

The feature is ready for production when:

- ✅ All test scenarios pass
- ✅ No console errors
- ✅ Performance is acceptable (<2s load)
- ✅ UI matches design
- ✅ Works on multiple devices
- ✅ Fallback system works
- ✅ No crashes or freezes
- ✅ User feedback is positive

---

## Rollback Procedure

If critical issues are found:

1. **Immediate:**
   ```bash
   cd nexad-app
   git revert HEAD
   npm run update:preview  # or update:production
   ```

2. **Notify users** (if needed)

3. **Fix issues** in development

4. **Re-test** thoroughly

5. **Re-deploy** when ready

---

## Contact

For testing support:
- Check implementation docs: `SKILL_BASED_MATCHING_IMPLEMENTATION.md`
- Review deployment guide: `DEPLOY_SKILL_MATCHING.md`
- Check console logs for detailed errors
