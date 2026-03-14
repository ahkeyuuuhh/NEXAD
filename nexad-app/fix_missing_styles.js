const fs = require('fs');
let c = fs.readFileSync('src/screens/teacher/ClassroomHubScreen.tsx', 'utf8');

const oldStyles = /appBar:\s*\{[\s\S]*?appBarTitle:\s*\{.*?\},/m;

const newStyles = `// Top Bar (Burger Menu)
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, backgroundColor: 'transparent' },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', position: 'relative' },
  notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#D93025', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  profileButton: { },
  profileImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8EAED' },
  profileInitial: { color: '#202124', fontSize: 16, fontWeight: '600' },
  profileImg: { width: 40, height: 40, borderRadius: 20 },
  greetingStack: { flex: 1, justifyContent: 'center' },
  greeting: { fontSize: 14, color: '#5F6368' },
  userName: { fontSize: 18, fontWeight: '700', color: '#202124', marginTop: 2 },`;

c = c.replace(oldStyles, newStyles);
fs.writeFileSync('src/screens/teacher/ClassroomHubScreen.tsx', c);
console.log('Fixed missing styles in teacher hub');
