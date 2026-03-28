# Skill-Based Teacher Matching Implementation

## Overview
This document describes the implementation of the automated skill-based matching feature that recommends teachers to students based on their department using the Lightcast Open Skills API.

## Features Implemented

### 1. Lightcast API Integration (`nexad-app/src/services/lightcastService.ts`)
- **OAuth2 Client Credentials Flow**: Secure authentication with Lightcast API
- **Token Caching**: Automatic token refresh and caching for optimal performance
- **Skills Search**: Query skills by department or keyword
- **Related Skills**: Fetch related skills for better matching
- **Fallback Mapping**: Local department-to-skills mapping when API is unavailable

### 2. Custom Hook (`nexad-app/src/hooks/useRecommendedTeachers.ts`)
- **Automatic Recommendations**: Fetches recommended teachers based on student's department
- **Smart Matching Algorithm**:
  - Exact skill match: +10 points
  - Partial skill match: +5 points
  - Same department: +20 points
  - Partial department match: +10 points
- **Top 10 Results**: Returns the best-matched teachers
- **Real-time Updates**: Refreshes when student department changes

### 3. Enhanced UI (`nexad-app/src/screens/student/FindTeacherScreen.tsx`)
- **Recommended Section**: Horizontal carousel showing top matches
- **Visual Indicators**: Star icon and "Match" badge for recommended teachers
- **Skill Display**: Shows teacher expertise tags in compact badges
- **Department Context**: Displays student's department for transparency
- **Seamless Integration**: Recommendations appear above the full teacher list

## Architecture

```
Student Department
       ↓
Lightcast API (getSkillsForDepartment)
       ↓
Skill Cluster (e.g., ['Programming', 'Web Development', 'JavaScript'])
       ↓
Database Query (fetch all active teachers)
       ↓
Matching Algorithm (compare skills & department)
       ↓
Sorted Recommendations (top 10 by match score)
       ↓
UI Display (horizontal carousel)
```

## Setup Instructions

### 1. Get Lightcast API Credentials
1. Visit [Lightcast Registration Form](https://lightcast.io/open-skills/access)
2. Fill out the registration form with your details
3. Verify your email address
4. Receive your API credentials (Client ID and Client Secret) via email
4. Copy your `Client ID` and `Client Secret`

### 2. Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp nexad-app/.env.example nexad-app/.env
   ```

2. Add your Lightcast credentials to `.env`:
   ```env
   EXPO_PUBLIC_LIGHTCAST_CLIENT_ID=your_client_id_here
   EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET=your_client_secret_here
   ```

### 3. Install Dependencies (if needed)
```bash
cd nexad-app
npm install
```

### 4. Test the Feature
1. Start the development server:
   ```bash
   npm start
   ```

2. Log in as a student with a department set
3. Navigate to "Find Teachers"
4. You should see a "Recommended for You" section at the top

## Database Requirements

### Student Profile
The `student_profiles` table must have:
- `department` (VARCHAR): Student's academic department

### Teacher Profile
The `teacher_profiles` table must have:
- `department` (VARCHAR): Teacher's professional department
- `expertise_tags` (TEXT[]): Array of skills/expertise areas
- `is_active` (BOOLEAN): Teacher account status
- `is_accepting_consultations` (BOOLEAN): Availability status

## Matching Logic

### Department-to-Skills Mapping
The service includes predefined mappings for common departments:

- **College of Computer Studies**: Programming, Web Development, JavaScript, Python, etc.
- **College of Engineering**: CAD, AutoCAD, Mathematics, Physics, etc.
- **College of Business**: Management, Marketing, Finance, Accounting, etc.
- **College of Arts and Sciences**: Research, Writing, Critical Thinking, etc.
- **College of Education**: Teaching, Pedagogy, Curriculum Development, etc.
- **College of Nursing**: Patient Care, Medical Terminology, Anatomy, etc.

### Scoring System
```typescript
Match Score Calculation:
- Exact skill match: +10 points
- Partial skill match (contains): +5 points
- Same department: +20 points
- Partial department match: +10 points

Example:
Student: "College of Computer Studies"
Teacher A: department="Computer Studies", skills=["JavaScript", "React"]
  → Score: 20 (dept) + 10 (JavaScript) + 10 (React) = 40 points

Teacher B: department="Engineering", skills=["Programming", "Python"]
  → Score: 5 (Programming partial) + 10 (Python) = 15 points
```

## API Endpoints Used

### Lightcast Open Skills API
- **Authentication**: `POST https://auth.emsicloud.com/connect/token`
- **Search Skills**: `GET https://emsiservices.com/skills/versions/latest/skills?q={query}`
- **Get Skills by IDs**: `POST https://emsiservices.com/skills/versions/latest/skills`
- **Related Skills**: `GET https://emsiservices.com/skills/versions/latest/skills/{id}/related`

## Error Handling

### Graceful Degradation
1. **API Unavailable**: Falls back to local department-to-skills mapping
2. **No Credentials**: Uses local mapping only (no API calls)
3. **No Department**: Skips recommendations, shows all teachers
4. **No Matches**: Displays all teachers without recommendation section

### Error Messages
- User-friendly error messages in the UI
- Detailed console logs for debugging
- No app crashes on API failures

## Performance Optimizations

1. **Token Caching**: OAuth tokens cached with automatic refresh
2. **Lazy Loading**: Recommendations load only when needed
3. **Debouncing**: Search queries debounced to reduce API calls
4. **Memoization**: Results cached until department changes
5. **Efficient Queries**: Database queries optimized with indexes

## Testing Checklist

- [ ] Student with department sees recommendations
- [ ] Student without department sees all teachers
- [ ] Recommendations match student's department
- [ ] Search functionality works alongside recommendations
- [ ] Recommendations refresh when department changes
- [ ] Fallback works when API is unavailable
- [ ] UI displays correctly on different screen sizes
- [ ] Loading states display properly
- [ ] Error states handled gracefully

## Future Enhancements

1. **Machine Learning**: Train ML model on consultation history
2. **User Feedback**: Allow students to rate recommendations
3. **Advanced Filters**: Filter by availability, rating, response time
4. **Personalization**: Consider student's past consultations
5. **Real-time Updates**: WebSocket for live teacher availability
6. **Analytics Dashboard**: Track recommendation effectiveness

## Troubleshooting

### Recommendations Not Showing
1. Check if student has a department set
2. Verify Lightcast API credentials in `.env`
3. Check console for API errors
4. Ensure teachers have expertise_tags populated

### API Authentication Errors
1. Verify credentials are correct
2. Check if API quota is exceeded
3. Ensure environment variables are loaded
4. Try regenerating API credentials

### No Matches Found
1. Check if teachers have relevant skills
2. Verify department names match expected format
3. Review local mapping in `lightcastService.ts`
4. Add more skills to teacher profiles

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Review Lightcast API documentation
3. Verify database schema matches requirements
4. Test with different student departments

## License

This implementation uses the Lightcast Open Skills API under their terms of service.
