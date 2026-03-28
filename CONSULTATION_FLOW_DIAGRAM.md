# 🎥 Virtual Consultation - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXAD APP                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  Teacher Side    │              │  Student Side    │         │
│  └──────────────────┘              └──────────────────┘         │
│           │                                  │                   │
│           ▼                                  ▼                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │ Create           │              │ Join             │         │
│  │ Consultation     │              │ Consultation     │         │
│  └──────────────────┘              └──────────────────┘         │
│           │                                  │                   │
│           │                                  │                   │
│           ▼                                  ▼                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │ Display:         │              │ Input:           │         │
│  │ - Invite Code    │─────────────▶│ - Enter Code     │         │
│  │ - QR Code        │              │ - Scan QR        │         │
│  └──────────────────┘              └──────────────────┘         │
│           │                                  │                   │
│           │                                  │                   │
│           └──────────────┬───────────────────┘                   │
│                          ▼                                       │
│                 ┌──────────────────┐                             │
│                 │  Video Call      │                             │
│                 │  Screen          │                             │
│                 └──────────────────┘                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │         External Services            │
        ├─────────────────────────────────────┤
        │                                      │
        │  ┌──────────────┐  ┌──────────────┐ │
        │  │  Daily.co    │  │  Supabase    │ │
        │  │  (Video)     │  │  (Database)  │ │
        │  └──────────────┘  └──────────────┘ │
        │                                      │
        └─────────────────────────────────────┘
```

---

## Teacher Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEACHER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. Open App
   │
   ▼
2. Dashboard
   │
   ▼
3. Tap "Virtual Consultation"
   │
   ▼
4. TeacherConsultationScreen
   │
   ├─ No Active Consultation?
   │  │
   │  ▼
   │  Tap "Create Consultation"
   │  │
   │  ▼
   │  System Creates:
   │  ├─ Daily.co Room
   │  ├─ 6-Char Invite Code (ABC123)
   │  ├─ QR Code (nexad://join/ABC123)
   │  └─ Database Record
   │  │
   │  ▼
   │  Display:
   │  ├─ QR Code (scannable)
   │  ├─ Invite Code (ABC123)
   │  ├─ Share Button
   │  └─ "Start Consultation" Button
   │
   └─ Has Active Consultation?
      │
      ▼
      Display Active Consultation
      │
      ▼
5. Teacher Shares Code/QR with Student
   │
   ▼
6. Tap "Start Consultation"
   │
   ▼
7. VideoCallScreen
   │
   ├─ Camera On/Off
   ├─ Mic On/Off
   ├─ Participant Count
   └─ Leave Call Button
   │
   ▼
8. Conduct Consultation
   │
   ▼
9. Tap "Leave Call"
   │
   ▼
10. System:
    ├─ Ends Consultation
    ├─ Calculates Duration
    ├─ Updates Database
    └─ Deletes Daily.co Room
```

---

## Student Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                      STUDENT JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. Open App
   │
   ▼
2. Dashboard
   │
   ▼
3. Tap "Join Consultation"
   │
   ▼
4. StudentJoinConsultationScreen
   │
   ├─ Option A: Manual Entry
   │  │
   │  ▼
   │  Enter 6-Char Code (ABC123)
   │  │
   │  ▼
   │  Tap "Join Consultation"
   │  │
   │  ▼
   │  System Validates Code
   │  │
   │  └─────────────────┐
   │                    │
   └─ Option B: QR Scan │
      │                 │
      ▼                 │
      Tap "Scan QR Code"│
      │                 │
      ▼                 │
      ConsultationQRScannerScreen
      │                 │
      ▼                 │
      Camera Opens      │
      │                 │
      ▼                 │
      Scan QR Code      │
      │                 │
      ▼                 │
      Extract Code      │
      │                 │
      └─────────────────┘
                        │
                        ▼
5. System:
   ├─ Validates Code
   ├─ Checks Expiration
   ├─ Updates Database (student_id, student_name)
   └─ Gets Room URL
   │
   ▼
6. Navigate to VideoCallScreen
   │
   ├─ Camera On/Off
   ├─ Mic On/Off
   ├─ Participant Count
   └─ Leave Call Button
   │
   ▼
7. Conduct Consultation
   │
   ▼
8. Tap "Leave Call"
   │
   ▼
9. Return to Dashboard
```

---

## Database Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE OPERATIONS                           │
└─────────────────────────────────────────────────────────────────┘

CREATE CONSULTATION:
┌──────────────────────────────────────┐
│ 1. Teacher creates consultation      │
│    ↓                                  │
│ 2. Call: consultationService         │
│    .createConsultation()              │
│    ↓                                  │
│ 3. Daily.co creates room              │
│    ↓                                  │
│ 4. Generate invite code (RPC)         │
│    ↓                                  │
│ 5. Insert into virtual_consultations │
│    - room_id, room_url                │
│    - invite_code                      │
│    - host_id, host_name               │
│    - status: 'active'                 │
│    - expires_at: +24 hours            │
└──────────────────────────────────────┘

JOIN CONSULTATION:
┌──────────────────────────────────────┐
│ 1. Student enters code                │
│    ↓                                  │
│ 2. Call: consultationService          │
│    .joinConsultation()                │
│    ↓                                  │
│ 3. RPC: join_consultation_by_code()   │
│    - Validates code                   │
│    - Checks expiration                │
│    - Updates student_id, student_name │
│    - Returns room_url                 │
│    ↓                                  │
│ 4. Navigate to video call             │
└──────────────────────────────────────┘

END CONSULTATION:
┌──────────────────────────────────────┐
│ 1. User leaves call                   │
│    ↓                                  │
│ 2. Call: consultationService          │
│    .endConsultation()                 │
│    ↓                                  │
│ 3. Calculate duration                 │
│    ↓                                  │
│ 4. Update database:                   │
│    - status: 'completed'              │
│    - ended_at: now()                  │
│    - duration_minutes                 │
│    ↓                                  │
│ 5. Delete Daily.co room               │
└──────────────────────────────────────┘
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY & RLS POLICIES                       │
└─────────────────────────────────────────────────────────────────┘

ROW LEVEL SECURITY (RLS):

SELECT Policy:
┌────────────────────────────────────┐
│ User can view consultation if:     │
│ - User is host (teacher), OR       │
│ - User is student                  │
└────────────────────────────────────┘

INSERT Policy:
┌────────────────────────────────────┐
│ User can create consultation if:   │
│ - User is authenticated             │
│ - User is the host                  │
└────────────────────────────────────┘

UPDATE Policy:
┌────────────────────────────────────┐
│ User can update consultation if:   │
│ - User is host (teacher), OR       │
│ - User is student                  │
└────────────────────────────────────┘

EXPIRATION:
┌────────────────────────────────────┐
│ Consultations expire after:        │
│ - 24 hours from creation            │
│ - Status changes to 'expired'       │
│ - Room is deleted                   │
└────────────────────────────────────┘
```

---

## Deep Linking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEEP LINKING                                │
└─────────────────────────────────────────────────────────────────┘

QR CODE GENERATION:
┌────────────────────────────────────┐
│ 1. Invite code: ABC123              │
│    ↓                                │
│ 2. Create deep link:                │
│    nexad://join/ABC123              │
│    ↓                                │
│ 3. Generate QR code                 │
│    (using react-native-qrcode-svg)  │
│    ↓                                │
│ 4. Display to teacher               │
└────────────────────────────────────┘

QR CODE SCANNING:
┌────────────────────────────────────┐
│ 1. Student scans QR                 │
│    ↓                                │
│ 2. Extract URL:                     │
│    nexad://join/ABC123              │
│    ↓                                │
│ 3. Parse invite code: ABC123        │
│    ↓                                │
│ 4. Call joinConsultation(ABC123)    │
│    ↓                                │
│ 5. Navigate to video call           │
└────────────────────────────────────┘

DEEP LINK HANDLING:
┌────────────────────────────────────┐
│ 1. App receives: nexad://join/ABC123│
│    ↓                                │
│ 2. Navigation config matches route  │
│    ↓                                │
│ 3. Extract params: { code: ABC123 } │
│    ↓                                │
│ 4. Navigate to StudentJoinConsultation
│    with code pre-filled             │
└────────────────────────────────────┘
```

---

## Video Call Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIDEO CALL (Daily.co)                         │
└─────────────────────────────────────────────────────────────────┘

INITIALIZATION:
┌────────────────────────────────────┐
│ 1. User navigates to VideoCallScreen│
│    ↓                                │
│ 2. Create Daily call object         │
│    ↓                                │
│ 3. Set up event listeners:          │
│    - joined-meeting                 │
│    - participant-joined             │
│    - participant-left               │
│    - error                          │
│    - left-meeting                   │
│    ↓                                │
│ 4. Join room with URL               │
└────────────────────────────────────┘

DURING CALL:
┌────────────────────────────────────┐
│ Controls Available:                 │
│ ├─ Toggle Camera                    │
│ │  └─ callObject.setLocalVideo()    │
│ ├─ Toggle Microphone                │
│ │  └─ callObject.setLocalAudio()    │
│ └─ Leave Call                       │
│    └─ callObject.leave()            │
└────────────────────────────────────┘

CLEANUP:
┌────────────────────────────────────┐
│ 1. User leaves call                 │
│    ↓                                │
│ 2. callObject.leave()               │
│    ↓                                │
│ 3. End consultation (if host)       │
│    ↓                                │
│ 4. callObject.destroy()             │
│    ↓                                │
│ 5. Navigate back                    │
└────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                               │
└─────────────────────────────────────────────────────────────────┘

INVALID CODE:
┌────────────────────────────────────┐
│ Student enters wrong code           │
│    ↓                                │
│ Database validation fails           │
│    ↓                                │
│ Show alert: "Invalid invite code"   │
│    ↓                                │
│ Allow retry                         │
└────────────────────────────────────┘

EXPIRED CODE:
┌────────────────────────────────────┐
│ Student enters expired code         │
│    ↓                                │
│ Database checks expires_at          │
│    ↓                                │
│ Show alert: "Code has expired"      │
│    ↓                                │
│ Suggest contacting teacher          │
└────────────────────────────────────┘

CAMERA PERMISSION:
┌────────────────────────────────────┐
│ App needs camera access             │
│    ↓                                │
│ Request permission                  │
│    ↓                                │
│ If denied:                          │
│ - Show permission screen            │
│ - Guide to settings                 │
│ - Allow manual code entry           │
└────────────────────────────────────┘

NETWORK ERROR:
┌────────────────────────────────────┐
│ Daily.co connection fails           │
│    ↓                                │
│ Show error screen                   │
│    ↓                                │
│ Offer retry or go back              │
└────────────────────────────────────┘
```

---

This diagram shows the complete flow of the Virtual Consultation feature from start to finish!
