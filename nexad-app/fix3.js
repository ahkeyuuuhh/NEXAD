const fs = require('fs');
let src = fs.readFileSync('./src/services/aiService.ts', 'utf8');

const sigLine = "  localContentAnalysis(text: string, fileName: string, studentDescription";
const sigIdx = src.indexOf(sigLine);
if (sigIdx === -1) { console.error('sig not found'); process.exit(1); }

// Return type closes with "  } {" then the function body opens with {
const returnTypEnd = src.indexOf('  } {', sigIdx);
if (returnTypEnd === -1) { console.error('returnTypEnd not found'); process.exit(1); }
// returnTypEnd+4 is the index of '{'

// The function ends with "},\n\n  /**\n   * On-device fallback scoring"
const closeMarker = '},\r\n\r\n  /**\r\n   * On-device fallback scoring';
const closeIdx = src.indexOf(closeMarker, returnTypEnd);
if (closeIdx === -1) { console.error('close not found'); process.exit(1); }

const lines = [
  ' {',
  "    const baseName = fileName.replace(/\\.[^/.]+$/, '').replace(/[-_]/g, ' ');",
  "    const hasText = text.trim().length > 20;",
  "    const meta = (baseName + ' ' + studentDescription + ' ' + subjectLine).toLowerCase();",
  "    const T: Record<string, string> = {",
  "      'climate change': 'Climate Change', 'global warming': 'Global Warming',",
  "      'artificial intelligence': 'AI/Machine Learning', 'machine learning': 'Machine Learning',",
  "      'mental health': 'Mental Health', 'social media': 'Social Media',",
  "      'economic': 'Economics', 'political': 'Politics', 'histor': 'History',",
  "      'environment': 'Environment', 'technolog': 'Technology', 'education': 'Education',",
  "      'health': 'Health & Medicine', 'culture': 'Culture', 'psycholog': 'Psychology',",
  "      'algorithm': 'Algorithms', 'database': 'Databases', 'network': 'Networking',",
  "      'security': 'Cybersecurity', 'programming': 'Programming', 'software': 'Software',",
  "      'math': 'Mathematics', 'physic': 'Physics', 'biolog': 'Biology',",
  "    };",
  "    if (!hasText) {",
  "      const tops = Object.entries(T).filter(function(e) { return meta.includes(e[0]); }).map(function(e) { return e[1]; }).filter(function(x, i, a) { return a.indexOf(x) === i; }).slice(0, 4);",
  "      return {",
  "        summary: 'File \"' + baseName + '\" was uploaded but its text could not be extracted. It may be a scanned or image-based document. Analysis is based on the filename and student description only.',",
  "        key_topics: tops.length ? tops : ['See filename/description'],",
  "        word_count: 0,",
  "        flags: [",
  "          'Document text could not be read — may be a scanned or image-based file',",
  "          'Ask student to share an editable DOCX for deeper analysis',",
  "        ],",
  "      };",
  "    }",
  "    const words = text.split(/\\s+/).filter(Boolean);",
  "    const wordCount = words.length;",
  "    const lowerText = text.toLowerCase();",
  "    const aiPhrases = [",
  "      'in order to', 'plays a crucial role', 'it is important to note',",
  "      'this essay explores', \"in today's world\", 'furthermore', 'moreover',",
  "      'in conclusion', 'significant impact', 'a wide range of', 'has been shown to',",
  "    ];",
  "    const aiFound = aiPhrases.filter(function(p) { return lowerText.includes(p); });",
  "    const topics = Object.entries(T).filter(function(e) { return lowerText.includes(e[0]); }).map(function(e) { return e[1]; }).filter(function(x, i, a) { return a.indexOf(x) === i; }).slice(0, 4);",
  "    const flags: string[] = [];",
  "    if (aiFound.length >= 2) flags.push('AI writing style phrases detected: ' + aiFound.slice(0, 3).join(', '));",
  "    if (!/\\breferences?\\b|\\bbibliograph/.test(lowerText) && wordCount > 100) flags.push('No citations or references detected in the document');",
  "    if (wordCount < 50) flags.push('Very little text extracted — document may be partially image-based');",
  "    const ex = text.substring(0, 250).replace(/\\s+/g, ' ').trim();",
  "    const summary = ex.length > 30 ? 'Document begins: \"' + ex + '...\"' : 'Text extracted from \"' + baseName + '\".';",
  "    return { summary, key_topics: topics, word_count: wordCount, flags };",
  "  }"
];
const newBody = lines.join('\n');

// closeIdx is at the '}' of "},\r\n\r\n  /**..." — skip that '}' since newBody ends with '  }'
src = src.substring(0, returnTypEnd + 4) + newBody + src.substring(closeIdx + 1);
fs.writeFileSync('./src/services/aiService.ts', src, 'utf8');
console.log('DONE sigIdx=' + sigIdx + ' returnTypEnd=' + returnTypEnd + ' closeIdx=' + closeIdx);
