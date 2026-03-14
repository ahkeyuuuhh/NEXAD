const fs = require('fs');

function unifyStudentDetail() {
  const filePath = 'src/screens/student/StudentClassroomDetailScreen.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  const headerRegex = /\{\/\*\s*Header\s*\*\/\}\s*<View style=\{styles\.header\}>[\s\S]*?<\/View>/;
  
  const newHeader = `{/* Unified Hero Banner */}
      <View style={[styles.banner, { backgroundColor: '#202124' }]}>
        <View style={styles.bannerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.bannerNavBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.bannerNavBtn} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bannerInfo}>
          <Text style={styles.bannerTitle} numberOfLines={2}>{classroom?.name}</Text>
          <View style={styles.bannerMeta}>
            <Ionicons name="key-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.bannerMetaText}>{classroom?.invite_code}</Text>
            <Text style={styles.bannerMetaDot}>·</Text>
            <Text style={styles.bannerMetaText}>{classroom?.member_count || 1} student{classroom?.member_count !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>`;

  content = content.replace(headerRegex, newHeader);

  // injecting banner styles
  const stylesRegex = /header:\s*\{[\s\S]*?\},/;
  const newStyles = `
  banner: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, backgroundColor: '#202124' },
  bannerNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  bannerNavBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bannerInfo: { paddingHorizontal: 4 },
  bannerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  bannerMeta: { flexDirection: 'row', alignItems: 'center' },
  bannerMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginLeft: 4 },
  bannerMetaDot: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginHorizontal: 6, bottom: 1 },
  `;

  content = content.replace(stylesRegex, newStyles);
  
  // Also we should ensure statusbar matches
  content = content.replace(/barStyle="dark-content" backgroundColor="#fff"/, 'barStyle="light-content" backgroundColor="#202124"');
  
  fs.writeFileSync(filePath, content);
  console.log('Fixed ' + filePath);
}

unifyStudentDetail();
