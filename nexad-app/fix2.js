const fs = require("fs");
const filePath = "./src/services/aiService.ts";
let src = fs.readFileSync(filePath, "utf8");

const OLD_START = "    const words = text.split(/\\s+/).filter(Boolean);";
const OLD_END = "    return { summary, key_topics: detectedTopics, word_count: wordCount, flags };";

const s = src.indexOf(OLD_START);
let e = src.indexOf(OLD_END);
if (s === -1 || e === -1) { console.error("NOTFOUND s="+s+" e="+e); process.exit(1); }
e = src.indexOf("\n", e) + 1; // include the return line

const inject = [
  "    const baseName = fileName.replace(/\\.[^/.]+$/, '').replace(/[-_]/g, ' ');",
  "    const hasText = text.trim().length > 20;",
  "    const allMetaLower = (baseName + ' ' + studentDescription + ' ' + subjectLine).toLowerCase();",
  "    const topicKeywords = {",
  "      'climate change': 'Climate Change', 'global warming': 'Global Warming',",
  "      'artificial intelligence': 'AI/Machine Learning', 'machine learning': 'Machine Learning',",
  "      'mental health': 'Mental Health', 'social media': 'Social Media',",
  "      'economic': 'Economics', 'political': 'Politics', 'histor': 'History',",
  "      'environment': 'Environment', 'technolog': 'Technology', 'education': 'Education',",
  "      'health': 'Health & Medicine', 'culture': 'Culture', 'psycholog': 'Psychology',",
  "      'algorithm': 'Algorithms', 'database': 'Databases', 'network': 'Networking',",
  "      'security': 'Cybersecurity', 'programming': 'Programming', 'software': 'Software',",
  "      'math': 'Mathematics', 'physic': 'Physics', 'chemistr': 'Chemistry',",
  "      'biolog': 'Biology', 'literatur': 'Literature', 'business': 'Business',",
  "    };",
  "    if (!hasText) {",
  "      const metaTopics = Object.entries(topicKeywords).filter(([kw]) => allMetaLower.includes(kw)).map(([,l]) => l).filter((v,i,a) => a.indexOf(v)===i).slice(0,4);",
  "      return {",
  "        summary: 'File \"' + baseName + '\" was uploaded but its text could not be extracted \u2014 it may be a scanned or image-based document. Analysis is based on the filename and student description only.',",
  "        key_topics: metaTopics.length > 0 ? metaTopics : ['See filename / description'],",
  "        word_count: 0,",
  "        flags: ['Document text could not be read \u2014 may be a scanned or image-based file', 'Ask the student to share an editable DOCX copy for deeper text analysis'],",
  "      };",
  "    }",
  "    const words = text.split(/\\s+/).filter(Boolean);",
  "    const wordCount = words.length;",
  "    const lowerText = text.toLowerCase();",
  "    const aiPhrases = ['in order to','plays a crucial role','it is important to note','this essay explores',\"in today's world\",'in recent years','it can be argued','furthermore','moreover','in conclusion','significant impact','a wide range of','has been shown to'];",
  "    const foundAIPhrases = aiPhrases.filter(p => lowerText.includes(p));",
  "    const detectedTopics = Object.entries(topicKeywords).filter(([kw]) => lowerText.includes(kw)).map(([,l]) => l).filter((v,i,a) => a.indexOf(v)===i).slice(0,4);",
  "    const flags = [];",
  "    if (foundAIPhrases.length >= 2) flags.push('AI writing style phrases detected: \"' + foundAIPhrases.slice(0,3).join('\", \"') + '\"');",
  "    const hasCitation = /\\breferences?\\b|\\bbibliograph|\\bet al\\.?\\b|\\[\\d+\\]|\\(\\d{4}\\)/.test(lowerText);",
  "    if (!hasCitation && wordCount > 100) flags.push('No citations or references detected in the document');",
  "    if (wordCount < 50) flags.push('Very little text extracted \u2014 document may be partially image-based');",
  "    const excerpt = text.substring(0,250).replace(/\\s+/g,' ').trim();",
  "    const summary = excerpt.length > 30 ? 'Document begins: \"' + excerpt + '\u2026\"' : 'Text extracted from \"' + baseName + '\".';",
  "    return { summary, key_topics: detectedTopics, word_count: wordCount, flags };"
].join("\n") + "\n";

src = src.substring(0, s) + inject + src.substring(e);
fs.writeFileSync(filePath, src, "utf8");
console.log("SUCCESS s="+s);
