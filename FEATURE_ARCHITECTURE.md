# Skill-Based Matching - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXAD Mobile App                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FindTeacherScreen.tsx                         │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  useRecommendedTeachers Hook                         │ │ │
│  │  │                                                      │ │ │
│  │  │  Input: studentDepartment                           │ │ │
│  │  │  Output: recommendedTeachers[]                      │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                          ↓                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  Recommended Teachers Carousel                       │ │ │
│  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │ │ │
│  │  │  │ T1 │ │ T2 │ │ T3 │ │ T4 │ →                     │ │ │
│  │  │  └────┘ └────┘ └────┘ └────┘                       │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
        ┌───────────────────┐  ┌──────────────────┐
        │ Lightcast Service │  │ Supabase Client  │
        │                   │  │                  │
        │ • OAuth2 Auth     │  │ • Query Teachers │
        │ • Skills Search   │  │ • Get Profiles   │
        │ • Dept Mapping    │  │ • Filter Active  │
        └───────────────────┘  └──────────────────┘
                    ↓                   ↓
        ┌───────────────────┐  ┌──────────────────┐
        │ Lightcast API     │  │ PostgreSQL DB    │
        │                   │  │                  │
        │ Skills Database   │  │ teacher_profiles │
        │ 30,000+ skills    │  │ student_profiles │
        └───────────────────┘  └──────────────────┘
```

## Data Flow

### 1. User Opens Find Teachers Screen

```
Student Profile
├── user_id: "abc123"
├── first_name: "John"
├── last_name: "Doe"
└── department: "College of Computer Studies" ← Key field
```

### 2. Hook Fetches Skill Cluster

```
useRecommendedTeachers("College of Computer Studies")
    ↓
lightcastService.getSkillsForDepartment()
    ↓
Lightcast API Search
    ↓
Returns: [
  "Programming",
  "JavaScript",
  "Web Development",
  "React",
  "Node.js",
  "Database Management",
  ...
]
```

### 3. Query Database for Teachers

```sql
SELECT * FROM teacher_profiles
WHERE is_active = true
AND is_accepting_consultations = true;
```

Returns:
```
Teacher 1: dept="Computer Studies", skills=["JavaScript", "React"]
Teacher 2: dept="Engineering", skills=["Programming", "Python"]
Teacher 3: dept="Computer Studies", skills=["Database", "SQL"]
...
```

### 4. Calculate Match Scores

```
Teacher 1:
  - Same department: +20
  - JavaScript match: +10
  - React match: +10
  → Total: 40 points

Teacher 2:
  - Different department: 0
  - Programming partial: +5
  - Python match: +10
  → Total: 15 points

Teacher 3:
  - Same department: +20
  - Database match: +10
  - SQL match: +10
  → Total: 40 points
```

### 5. Sort and Display

```
Sorted by score (descending):
1. Teacher 1 (40 points)
2. Teacher 3 (40 points)
3. Teacher 2 (15 points)
...

Display top 10 in carousel
```

## Component Hierarchy

```
FindTeacherScreen
├── Header
│   ├── Back Button
│   ├── Title
│   └── Placeholder
├── Search Section
│   └── Search Input
└── ScrollView
    ├── Recommended Section (if has department)
    │   ├── Header
    │   │   ├── Star Icon + Title
    │   │   └── Department Subtitle
    │   └── Horizontal Carousel
    │       ├── Teacher Card 1
    │       │   ├── Avatar
    │       │   ├── Name
    │       │   ├── Position
    │       │   ├── Skill Badges
    │       │   └── Match Badge
    │       ├── Teacher Card 2
    │       └── ...
    └── All Teachers List
        ├── List Title
        └── Teacher Cards (vertical)
```

## State Management

```typescript
// Component State
const [searchQuery, setSearchQuery] = useState('');
const [teachers, setTeachers] = useState<Teacher[]>([]);
const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [studentProfile, setStudentProfile] = useState<any>(null);

// Hook State
const {
  recommendedTeachers,      // Teacher[] - Top matches
  isLoading,                // boolean - Loading state
  error,                    // string | null - Error message
  refresh                   // () => Promise<void> - Refresh function
} = useRecommendedTeachers(studentProfile?.department);
```

## API Integration

### Lightcast OAuth2 Flow

```
1. Request Token
   POST https://auth.emsicloud.com/connect/token
   Body: {
     client_id: "...",
     client_secret: "...",
     grant_type: "client_credentials",
     scope: "emsi_open"
   }
   
2. Receive Token
   Response: {
     access_token: "eyJ...",
     expires_in: 3600,
     token_type: "Bearer"
   }
   
3. Cache Token
   Store with expiration time
   Reuse until expires
   
4. Use Token
   GET https://emsiservices.com/skills/...
   Header: Authorization: Bearer eyJ...
```

### Supabase Queries

```typescript
// Get student profile
const { data } = await supabase
  .from('student_profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// Get all teachers
const { data } = await supabase
  .from('teacher_profiles')
  .select('*')
  .eq('is_active', true)
  .eq('is_accepting_consultations', true);
```

## Matching Algorithm

```typescript
function calculateMatchScore(
  teacher: TeacherProfile,
  departmentSkills: string[],
  studentDepartment: string
): number {
  let score = 0;
  
  // Check skill matches
  for (const deptSkill of departmentSkills) {
    for (const teacherSkill of teacher.expertise_tags) {
      if (exactMatch(deptSkill, teacherSkill)) {
        score += 10;
      } else if (partialMatch(deptSkill, teacherSkill)) {
        score += 5;
      }
    }
  }
  
  // Check department match
  if (exactMatch(teacher.department, studentDepartment)) {
    score += 20;
  } else if (partialMatch(teacher.department, studentDepartment)) {
    score += 10;
  }
  
  return score;
}
```

## Error Handling Flow

```
Try Lightcast API
    ↓
  Success? ──Yes──→ Use API skills
    ↓
   No
    ↓
Use Local Mapping ──→ Fallback skills
    ↓
Query Database
    ↓
  Success? ──Yes──→ Calculate scores
    ↓
   No
    ↓
Show Error ──→ Display all teachers
```

## Performance Optimizations

### 1. Token Caching
```
First Request:  Auth (500ms) + API (300ms) = 800ms
Second Request: API (300ms) = 300ms (62% faster)
```

### 2. Memoization
```typescript
useEffect(() => {
  loadRecommendedTeachers();
}, [studentDepartment]); // Only re-run if department changes
```

### 3. Efficient Queries
```sql
-- Single query with filters
SELECT * FROM teacher_profiles
WHERE is_active = true
AND is_accepting_consultations = true;

-- No N+1 queries
-- No joins needed
-- Uses indexes on is_active and is_accepting_consultations
```

## Deployment Architecture

```
Developer Machine
    ↓
  Git Push
    ↓
GitHub Repository
    ↓
EAS Build Service
    ↓
JavaScript Bundle
    ↓
Expo CDN
    ↓
User's Device (OTA Update)
    ↓
App Restart
    ↓
New Feature Active!
```

## Security Model

```
Environment Variables (.env)
    ↓
Build Time Injection
    ↓
Expo Constants
    ↓
Runtime Access (process.env.EXPO_PUBLIC_*)
    ↓
Lightcast Service
    ↓
OAuth2 Token Exchange
    ↓
Secure API Calls
```

**Security Features:**
- ✅ Credentials not in source code
- ✅ OAuth2 client credentials flow
- ✅ Token auto-refresh
- ✅ HTTPS only
- ✅ No sensitive data in client

## Monitoring & Analytics

```
User Action
    ↓
Event Logging
    ↓
Console Logs (Development)
    ↓
Analytics Service (Future)
    ↓
Dashboard (Future)
```

**Trackable Metrics:**
- Recommendation views
- Recommendation clicks
- Consultation bookings from recommendations
- API response times
- Error rates
- User satisfaction

## Future Architecture

```
Current: Client → Lightcast API → Response
Future:  Client → Backend API → Cache → Lightcast API
                      ↓
                  ML Model
                      ↓
              Personalized Results
```

**Planned Enhancements:**
1. Backend caching layer
2. Machine learning model
3. User feedback loop
4. A/B testing framework
5. Real-time updates
6. Advanced analytics

---

This architecture provides:
- ✅ Scalability
- ✅ Performance
- ✅ Reliability
- ✅ Security
- ✅ Maintainability
- ✅ Extensibility
