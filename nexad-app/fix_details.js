const fs = require('fs');

function shrinkBinCards(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Let's find bin styles and reduce their footprint
  // The user wants 'smaller attachment bin cards'
  
  // Replace padding and margins for bin cards
  content = content.replace(/binCard:\s*\{[\s\S]*?\}/, `binCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eff0f1' }`);
  
  content = content.replace(/binContent:\s*\{[\s\S]*?\}/, `binContent: { flexDirection: 'column' }`);
  
  content = content.replace(/binHeader:\s*\{[\s\S]*?\}/, `binHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }`);
  
  content = content.replace(/headerIcon:\s*\{[\s\S]*?\}/, `headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#34A853', justifyContent: 'center', alignItems: 'center', marginRight: 12 }`);

  fs.writeFileSync(filePath, content);
  console.log('Fixed ' + filePath);
}

shrinkBinCards('src/screens/student/StudentClassroomDetailScreen.tsx');
shrinkBinCards('src/screens/teacher/ClassroomDetailScreen.tsx');
