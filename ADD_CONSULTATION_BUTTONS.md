# Adding Virtual Consultation Buttons to Dashboards

## Quick Reference: How to Add Consultation Buttons

Once you've built the APK with the Virtual Consultation feature, you'll want to add buttons to the dashboards so users can access it easily.

---

## For Teacher Dashboard

Add this button to `nexad-app/src/screens/teacher/TeacherDashboard.tsx`:

```tsx
<TouchableOpacity
  style={styles.consultationButton}
  onPress={() => navigation.navigate('TeacherConsultation')}
>
  <Ionicons name="videocam" size={24} color="#FFF" />
  <Text style={styles.consultationButtonText}>Virtual Consultation</Text>
</TouchableOpacity>
```

### Suggested Placement:
- Near the top of the dashboard
- Below the welcome message
- Above or next to "Classroom Hub" button

### Button Style (add to StyleSheet):
```tsx
consultationButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#10B981', // Green for video
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 12,
  marginHorizontal: 20,
  marginVertical: 12,
  gap: 8,
},
consultationButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFF',
},
```

---

## For Student Dashboard

Add this button to `nexad-app/src/screens/student/StudentDashboard.tsx`:

```tsx
<TouchableOpacity
  style={styles.joinConsultationButton}
  onPress={() => navigation.navigate('StudentJoinConsultation')}
>
  <Ionicons name="videocam-outline" size={24} color="#1F2937" />
  <Text style={styles.joinConsultationButtonText}>Join Consultation</Text>
</TouchableOpacity>
```

### Suggested Placement:
- Near the top of the dashboard
- Below the welcome message
- Above or next to "Find Teacher" button

### Button Style (add to StyleSheet):
```tsx
joinConsultationButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255,255,255,0.7)',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.1)',
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 12,
  marginHorizontal: 20,
  marginVertical: 12,
  gap: 8,
},
joinConsultationButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#1F2937',
},
```

---

## Alternative: Add to Quick Actions Section

If your dashboards have a "Quick Actions" or "Features" section, you can add consultation cards there:

### Teacher Quick Action Card:
```tsx
<TouchableOpacity
  style={styles.quickActionCard}
  onPress={() => navigation.navigate('TeacherConsultation')}
>
  <View style={styles.quickActionIcon}>
    <Ionicons name="videocam" size={32} color="#10B981" />
  </View>
  <Text style={styles.quickActionTitle}>Virtual Consultation</Text>
  <Text style={styles.quickActionSubtitle}>Start video call with student</Text>
</TouchableOpacity>
```

### Student Quick Action Card:
```tsx
<TouchableOpacity
  style={styles.quickActionCard}
  onPress={() => navigation.navigate('StudentJoinConsultation')}
>
  <View style={styles.quickActionIcon}>
    <Ionicons name="videocam-outline" size={32} color="#3B82F6" />
  </View>
  <Text style={styles.quickActionTitle}>Join Consultation</Text>
  <Text style={styles.quickActionSubtitle}>Enter code or scan QR</Text>
</TouchableOpacity>
```

---

## Navigation Routes (Already Added)

The following routes are already configured in `App.tsx`:
- `TeacherConsultation` - Teacher creates/manages consultations
- `StudentJoinConsultation` - Student joins by code or QR
- `ConsultationQRScanner` - QR code scanner
- `VideoCall` - Video call interface

---

## Testing the Buttons

After adding the buttons:
1. Build new APK (or use OTA update if only adding buttons)
2. Open teacher dashboard → Tap "Virtual Consultation"
3. Should navigate to consultation creation screen
4. Open student dashboard → Tap "Join Consultation"
5. Should navigate to join screen

---

## Optional: Add Badge for Active Consultations

Show a badge when teacher has an active consultation:

```tsx
<TouchableOpacity
  style={styles.consultationButton}
  onPress={() => navigation.navigate('TeacherConsultation')}
>
  <Ionicons name="videocam" size={24} color="#FFF" />
  <Text style={styles.consultationButtonText}>Virtual Consultation</Text>
  {hasActiveConsultation && (
    <View style={styles.activeBadge}>
      <View style={styles.activeDot} />
    </View>
  )}
</TouchableOpacity>
```

```tsx
activeBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: '#EF4444',
  borderRadius: 12,
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
},
activeDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#FFF',
},
```

---

## That's It!

The buttons will navigate to the fully implemented consultation screens. Users can immediately start creating and joining video consultations.
