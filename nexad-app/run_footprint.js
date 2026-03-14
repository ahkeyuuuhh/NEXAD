const fs = require('fs');
let c = fs.readFileSync('src/screens/teacher/ClassroomDetailScreen.tsx', 'utf8');

c = c.replace(/streamCard:\s*\{[\s\S]*?\},\s+streamCardPinned:/, `streamCard: {
    backgroundColor: C.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  streamCardPinned:`);

c = c.replace(/streamCardHeader:\s*\{[\s\S]*?\},\s+streamCardIcon:/, `streamCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  streamCardIcon:`);

c = c.replace(/streamCardIcon:\s*\{[\s\S]*?\},\s+streamCardMeta:/, `streamCardIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  streamCardMeta:`);

c = c.replace(/streamCardTitle:\s*\{[\s\S]*?\},/, `streamCardTitle: { fontSize: 16, fontWeight: '600' as const, color: C.ink1, marginBottom: 4 },`);
c = c.replace(/streamCardContent:\s*\{[\s\S]*?\},/, `streamCardContent: { fontSize: 13, color: C.ink3, lineHeight: 18 },`);

fs.writeFileSync('src/screens/teacher/ClassroomDetailScreen.tsx', c);
console.log('Done footprint script');