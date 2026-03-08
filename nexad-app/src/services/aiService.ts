import { supabase } from '../config/supabase';
import { cloudmersiveService } from './cloudmersiveService';
import type { ApiResponse } from '../types';

interface SmartBriefData {
  summary: string;
  key_points: string[];
  student_concerns: string[];
  suggested_prep_materials: string[];
  estimated_duration_minutes: number;
}

/**
 * AI Service for generating smart briefs and document analysis
 * Uses intelligent text analysis to provide teachers with consultation insights
 */
export const aiService = {
  /**
   * Generate a smart brief for a consultation request
   * Analyzes the request details and generates actionable insights.
   * If documentNames are provided, the brief will note the uploaded files
   * and encourage the teacher to review them before the consultation.
   */
  async generateSmartBrief(
    consultationRequestId: string,
    studentName: string,
    subjectLine: string,
    description: string,
    urgency: string,
    topic: string,
    documentNames: string[] = []
  ): Promise<ApiResponse<any>> {
    try {
      // Perform intelligent analysis
      const analysis = this.analyzeConsultationRequest(
        subjectLine,
        description,
        urgency,
        topic,
        documentNames
      );

      // Create smart brief in database
      const { data, error } = await supabase
        .from('ai_smart_briefs')
        .insert({
          consultation_request_id: consultationRequestId,
          summary: analysis.summary,
          key_points: analysis.key_points,
          student_concerns: analysis.student_concerns,
          suggested_prep_materials: analysis.suggested_prep_materials,
          estimated_consultation_duration_minutes: analysis.estimated_duration_minutes,
          ai_model_version: 'nexad-v1.0',
          confidence_score: 0.85,
          generated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      console.error('Smart brief generation error:', error);
      return { error: error.message || 'Failed to generate smart brief' };
    }
  },

  /**
   * Analyze consultation request and extract insights
   * Uses semantic analysis to understand student needs.
   * documentNames: list of uploaded file names provided by the student.
   */
  analyzeConsultationRequest(
    subjectLine: string,
    description: string,
    urgency: string,
    topic: string,
    documentNames: string[] = []
  ): SmartBriefData {
    const text = `${subjectLine} ${description}`.toLowerCase();
    
    // Extract key points from description
    const key_points = this.extractKeyPoints(description, documentNames);
    
    // Identify student concerns
    const student_concerns = this.identifyStudentConcerns(text, urgency, documentNames);
    
    // Generate summary (include file info)
    const summary = this.generateSummary(subjectLine, description, topic, urgency, documentNames);
    
    // Suggest preparation materials (factor in uploaded files)
    const suggested_prep_materials = this.suggestPrepMaterials(text, topic, documentNames);
    
    // Estimate duration (longer if there are attachments to review)
    const estimated_duration_minutes = this.estimateDuration(
      text, urgency, key_points.length, documentNames.length
    );

    return {
      summary,
      key_points,
      student_concerns,
      suggested_prep_materials,
      estimated_duration_minutes,
    };
  },

  /**
   * Extract key points from description
   */
  extractKeyPoints(description: string, documentNames: string[] = []): string[] {
    const points: string[] = [];
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Take first 3-5 meaningful sentences as key points
    sentences.slice(0, Math.min(5, sentences.length)).forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed) {
        points.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
      }
    });

    // Add note about uploaded files
    if (documentNames.length > 0) {
      points.push(
        `Student attached ${documentNames.length} file${documentNames.length > 1 ? 's' : ''} for review: ${documentNames.join(', ')}`
      );
    }

    return points.length > 0 ? points : ['Student seeks guidance on the specified topic'];
  },

  /**
   * Identify student concerns from text
   */
  identifyStudentConcerns(text: string, urgency: string, documentNames: string[] = []): string[] {
    const concerns: string[] = [];

    // Keywords indicating different types of concerns
    const concernPatterns = {
      'understanding': ['confused', 'don\'t understand', 'unclear', 'difficult', 'struggling'],
      'deadline': ['deadline', 'due date', 'submission', 'upcoming', 'soon'],
      'grade': ['grade', 'fail', 'passing', 'score', 'marks'],
      'project': ['project', 'assignment', 'homework', 'task'],
      'exam': ['exam', 'test', 'quiz', 'midterm', 'final'],
      'concept': ['concept', 'theory', 'principle', 'idea'],
      'application': ['apply', 'implement', 'practice', 'use'],
      'career': ['career', 'job', 'internship', 'future'],
    };

    Object.entries(concernPatterns).forEach(([concern, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        concerns.push(this.formatConcern(concern));
      }
    });

    if (urgency === 'urgent') {
      concerns.unshift('Time-sensitive request requiring prompt attention');
    }

    if (documentNames.length > 0) {
      concerns.push(`Student has uploaded ${documentNames.length} attachment${documentNames.length > 1 ? 's' : ''} — please review before the session`);
    }

    return concerns.length > 0 
      ? concerns 
      : ['General consultation seeking guidance and clarification'];
  },

  /**
   * Format concern for display
   */
  formatConcern(concern: string): string {
    const concernMap: { [key: string]: string } = {
      'understanding': 'Difficulty understanding core concepts',
      'deadline': 'Approaching deadline causing pressure',
      'grade': 'Concerns about academic performance',
      'project': 'Project-related challenges',
      'exam': 'Exam preparation assistance needed',
      'concept': 'Conceptual clarity required',
      'application': 'Practical application guidance needed',
      'career': 'Career planning and guidance',
    };
    return concernMap[concern] || concern;
  },

  /**
   * Generate consultation summary
   */
  generateSummary(
    subjectLine: string,
    description: string,
    topic: string,
    urgency: string,
    documentNames: string[] = []
  ): string {
    const urgencyText = urgency === 'urgent' ? ' (Urgent)' : '';
    const topicText = topic.charAt(0).toUpperCase() + topic.slice(1);
    
    const firstSentence = description.split(/[.!?]/)[0]?.trim() || subjectLine;
    
    const fileNote = documentNames.length > 0
      ? ` The student has uploaded ${documentNames.length} supporting file${documentNames.length > 1 ? 's' : ''} (${documentNames.join(', ')}) for the teacher to review.`
      : '';
    
    return `${topicText} consultation${urgencyText}: ${firstSentence}. Student is seeking guidance to address their concerns and improve understanding.${fileNote}`;
  },

  /**
   * Suggest preparation materials based on topic
   */
  suggestPrepMaterials(text: string, topic: string, documentNames: string[] = []): string[] {
    const suggestions: string[] = [];

    // Topic-specific suggestions
    const topicSuggestions: { [key: string]: string[] } = {
      'academic': [
        'Course syllabus and learning objectives',
        'Relevant textbook chapters',
        'Previous assignment submissions',
      ],
      'career': [
        'Student\'s resume or CV',
        'Career interest inventory results',
        'Job market research for student\'s field',
      ],
      'research': [
        'Research proposal or outline',
        'Literature review sources',
        'Research methodology guidelines',
      ],
      'personal': [
        'Academic progress report',
        'Previous consultation notes',
      ],
    };

    if (topicSuggestions[topic]) {
      suggestions.push(...topicSuggestions[topic]);
    } else {
      suggestions.push(
        'Student\'s academic records',
        'Related course materials',
        'Previous consultation history'
      );
    }

    // Add specific suggestions based on content
    if (text.includes('thesis') || text.includes('dissertation')) {
      suggestions.push('Thesis/dissertation draft or outline');
    }
    if (text.includes('code') || text.includes('program')) {
      suggestions.push('Code files or programming examples');
    }
    if (text.includes('presentation')) {
      suggestions.push('Presentation slides or outline');
    }

    // Explicitly list uploaded files as materials to review
    if (documentNames.length > 0) {
      documentNames.forEach(name => {
        suggestions.unshift(`📎 Review student-uploaded file: ${name}`);
      });
    }

    return suggestions;
  },

  /**
   * Estimate consultation duration
   */
  estimateDuration(text: string, urgency: string, keyPointsCount: number, documentCount: number = 0): number {
    let duration = 30; // Base duration in minutes

    // Adjust based on complexity (text length)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 200) duration += 15;
    if (wordCount > 400) duration += 15;

    // Adjust based on key points
    duration += Math.min(keyPointsCount * 5, 20);

    // Urgent requests might need more focused time
    if (urgency === 'urgent') duration += 10;

    // Extra time to discuss uploaded documents
    duration += documentCount * 5;

    return Math.min(duration, 90); // Cap at 90 minutes
  },

  /**
   * Get smart brief for a consultation request
   */
  async getSmartBrief(consultationRequestId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('ai_smart_briefs')
        .select('*')
        .eq('consultation_request_id', consultationRequestId)
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to retrieve smart brief' };
    }
  },

  /**
   * AI Assistant: Provide help to students preparing for consultation
   * Automatically offers assistance when student enters consultation details
   */
  async askForPreparationAssistance(
    subjectLine: string,
    description: string,
    category?: string
  ): Promise<{ needsHelp: boolean; suggestions: string[]; isProjectRelated: boolean; shouldUploadDraft: boolean }> {
    // Analyze if the request needs additional preparation help
    const text = `${subjectLine} ${description}`.toLowerCase();
    const needsHelp = text.length > 20; // Only offer help for substantial requests

    const suggestions = this.generatePreparationSuggestions(subjectLine, description, category);
    const isProjectRelated = this.detectProjectConsultation(subjectLine, description, category);
    const shouldUploadDraft = isProjectRelated;

    return {
      needsHelp,
      suggestions,
      isProjectRelated,
      shouldUploadDraft,
    };
  },

  /**
   * Detect if consultation is about a project
   */
  detectProjectConsultation(
    subjectLine: string,
    description: string,
    category?: string
  ): boolean {
    const text = `${subjectLine} ${description}`.toLowerCase();

    // Check category first
    if (category === 'Project Assistance' || category === 'Research Consultation') {
      return true;
    }

    // Project-related keywords
    const projectKeywords = [
      'project', 'assignment', 'homework', 'task', 'capstone',
      'thesis', 'dissertation', 'research', 'paper', 'report',
      'presentation', 'proposal', 'draft', 'submission',
      'development', 'implementation', 'design', 'application',
      'system', 'software', 'code', 'program', 'website',
      'app', 'portfolio', 'prototype', 'mockup'
    ];

    // Check if text contains project keywords
    return projectKeywords.some(keyword => text.includes(keyword));
  },

  /**
   * Generate preparation suggestions for students
   */
  generatePreparationSuggestions(
    subjectLine: string,
    description: string,
    category?: string
  ): string[] {
    const text = `${subjectLine} ${description}`.toLowerCase();
    const suggestions: string[] = [];

    // Category-specific suggestions
    if (category === 'Academic Support') {
      suggestions.push(
        'Review the specific topics or chapters you need help with',
        'Prepare any assignments or exercises where you\'re stuck',
        'Note down specific questions or concepts that confuse you'
      );
    } else if (category === 'Career Guidance') {
      suggestions.push(
        'Prepare your resume or CV to discuss',
        'List your career interests and goals',
        'Think about specific questions about career paths or opportunities'
      );
    } else if (category === 'Research Consultation') {
      suggestions.push(
        'Bring your research proposal or outline',
        'Prepare a list of research questions',
        'Have your literature review sources ready',
        'Think about your research methodology'
      );
    } else if (category === 'Exam Preparation') {
      suggestions.push(
        'Review the exam syllabus and format',
        'Identify topics you find most challenging',
        'Prepare sample questions you\'ve struggled with',
        'Bring your study materials and notes'
      );
    } else if (category === 'Project Assistance') {
      suggestions.push(
        'Bring your project outline or plan',
        'Prepare specific questions about the project',
        'Have relevant code, documents, or materials ready'
      );
    }

    // Content-based suggestions
    if (text.includes('code') || text.includes('program') || text.includes('software')) {
      suggestions.push('Prepare code snippets showing the issue you\'re facing');
    }
    if (text.includes('deadline') || text.includes('urgent')) {
      suggestions.push('Clearly state your deadline to help prioritize');
    }
    if (text.includes('confused') || text.includes('don\'t understand')) {
      suggestions.push('Write down exactly what you understand and where confusion starts');
    }
    if (text.includes('assignment') || text.includes('homework')) {
      suggestions.push('Bring the assignment instructions and any work you\'ve done');
    }

    // General best practices
    if (suggestions.length < 3) {
      suggestions.push(
        'Be specific about what you need help with',
        'Bring relevant materials or documents',
        'Write down your questions ahead of time'
      );
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  },

  /**
   * AI Chat Assistant: Respond to student queries about their consultation
   */
  async generateAIChatResponse(
    userMessage: string,
    consultationContext: {
      subjectLine: string;
      description: string;
      category?: string;
    }
  ): Promise<string> {
    const lowerMessage = userMessage.toLowerCase();
    const { subjectLine, description, category } = consultationContext;
    const text = `${subjectLine} ${description}`.toLowerCase();

    // Intent detection and appropriate responses
    if (this.containsWords(lowerMessage, ['help', 'prepare', 'ready', 'what should'])) {
      const suggestions = this.generatePreparationSuggestions(subjectLine, description, category);
      const isProject = this.detectProjectConsultation(subjectLine, description, category);
      let response = `Based on your consultation request about "${subjectLine}", here's how you can prepare:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      
      if (isProject) {
        response += `\n\n📎 IMPORTANT: Since this is project-related, I highly recommend uploading a draft or progress document. This will help your teacher:\n• Review your work beforehand\n• Provide more specific feedback\n• Prepare targeted guidance\n• Save consultation time`;
      }
      
      return response + `\n\nWould you like specific guidance on any of these points?`;
    }

    if (this.containsWords(lowerMessage, ['document', 'file', 'upload', 'attach', 'material', 'draft'])) {
      const isProject = this.detectProjectConsultation(subjectLine, description, category);
      let response = `For your consultation about "${subjectLine}", consider bringing these materials:\n\n${this.suggestDocuments(text, category).map((d, i) => `• ${d}`).join('\n')}`;
      
      if (isProject) {
        response += `\n\n🎯 PROJECT DRAFT RECOMMENDATION:\n\nSince this is about a project, please upload your current draft or work-in-progress. This allows your teacher to:\n✓ Review your progress ahead of time\n✓ Identify specific areas needing improvement\n✓ Prepare detailed feedback\n✓ Make the consultation more productive\n\nYou can upload a DOCX file (up to 5MB) in the consultation request form.`;
      }
      
      return response + `\n\nHaving these ready will help your teacher provide better guidance.`;
    }

    if (this.containsWords(lowerMessage, ['time', 'how long', 'duration', 'when'])) {
      const duration = this.estimateDuration(text, 'normal', description.split('.').length);
      return `Based on the complexity of your request, I estimate this consultation will take approximately ${duration} minutes. This gives you enough time to cover:\n\n• Discussion of your main concerns\n• Detailed explanation of concepts\n• Q&A session\n• Action plan for next steps`;
    }

    if (this.containsWords(lowerMessage, ['question', 'ask', 'what to say'])) {
      return `Great questions to ask during your consultation:\n\n${this.generateSmartQuestions(text, category).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nThese will help you get the most out of your meeting!`;
    }

    if (this.containsWords(lowerMessage, ['urgent', 'soon', 'quickly', 'asap'])) {
      return `I understand this is time-sensitive. To expedite your consultation:\n\n1. Mark your request as "urgent" when submitting\n2. Clearly state your deadline in the description\n3. Be specific about what you need immediately\n4. Have all relevant materials ready\n\nThis will help your teacher prioritize and respond faster.`;
    }

    if (this.containsWords(lowerMessage, ['improve', 'better', 'clearer', 'more detail'])) {
      const analysis = this.analyzeRequestQuality(subjectLine, description);
      return analysis.suggestions.length > 0
        ? `I analyzed your request and found these areas to improve:\n\n${analysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nMaking these changes will help your teacher understand your needs better!`
        : `Your request looks comprehensive! You've included:\n\n${analysis.strengths.map(s => `✓ ${s}`).join('\n')}\n\nI think you're all set to submit!`;
    }

    // Default helpful response
    return `I'm here to help you prepare for your consultation about "${subjectLine}". I can assist you with:\n\n• Preparation tips and materials to bring\n• Suggested questions to ask\n• Improving your request for clarity\n• Understanding what to expect\n\nWhat would you like help with?`;
  },

  /**
   * Helper: Check if message contains specific words
   */
  containsWords(text: string, words: string[]): boolean {
    return words.some(word => text.includes(word));
  },

  /**
   * Suggest documents to bring to consultation
   */
  suggestDocuments(text: string, category?: string): string[] {
    const docs: string[] = [];

    if (text.includes('assignment') || text.includes('homework')) {
      docs.push('Assignment instructions and requirements');
      docs.push('Your current work or draft');
    }
    if (text.includes('code') || text.includes('program')) {
      docs.push('Code files with the issue highlighted');
      docs.push('Error messages or logs');
    }
    if (text.includes('thesis') || text.includes('research')) {
      docs.push('Research proposal or outline');
      docs.push('Literature review and sources');
    }
    if (text.includes('grade') || text.includes('exam')) {
      docs.push('Previous exams or quizzes');
      docs.push('Study notes and materials');
    }

    if (category === 'Career Guidance') {
      docs.push('Your resume or CV');
      docs.push('Job listings you\'re interested in');
    }

    if (docs.length === 0) {
      docs.push('Relevant course materials');
      docs.push('Your notes or questions');
      docs.push('Previous assignments on the topic');
    }

    return docs;
  },

  /**
   * Generate smart questions for the student to ask
   */
  generateSmartQuestions(text: string, category?: string): string[] {
    const questions: string[] = [];

    if (text.includes('confused') || text.includes('understand')) {
      questions.push('Can you explain this concept in a different way?');
      questions.push('Could you provide a practical example?');
    }

    if (text.includes('assignment') || text.includes('project')) {
      questions.push('Am I on the right track with my approach?');
      questions.push('What are the most important aspects to focus on?');
    }

    questions.push('What resources would you recommend for further study?');
    questions.push('How can I check if I\'ve understood this correctly?');
    questions.push('What common mistakes should I avoid?');

    return questions.slice(0, 5);
  },

  /**
   * Analyze request quality and provide improvement suggestions
   */
  analyzeRequestQuality(
    subjectLine: string,
    description: string
  ): { strengths: string[]; suggestions: string[] } {
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // Check subject line
    if (subjectLine.length > 5) {
      strengths.push('Clear subject line');
    } else {
      suggestions.push('Make your subject line more descriptive');
    }

    // Check description length
    if (description.length > 50) {
      strengths.push('Detailed description');
    } else {
      suggestions.push('Add more details about what you need help with');
    }

    // Check for specificity
    const hasSpecifics = /chapter|page|section|topic|concept|problem \d/i.test(description);
    if (hasSpecifics) {
      strengths.push('Specific references included');
    } else {
      suggestions.push('Include specific topics, chapters, or problems you need help with');
    }

    // Check for questions
    const hasQuestions = description.includes('?');
    if (hasQuestions) {
      strengths.push('Direct questions included');
    } else {
      suggestions.push('Consider adding specific questions you want answered');
    }

    return { strengths, suggestions };
  },

  /**
   * Generate a Consultation Prep Brief using OpenAI GPT-4o-mini.
   * Called when the teacher opens the Request Details screen.
   * Returns structured data covering: file overview, integrity check,
   * primary concerns / gaps, and recommended consultation focus.
   */
  /**
   * Simple deterministic hash — same input always returns the same number.
   */
  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  },

  /**
   * On-device content analysis — keyword analysis of extracted file text.
   */
  /**
   * Clean and filter extracted text to remove corrupted/garbled characters
   * Only keeps readable ASCII and common Unicode characters
   */
  /**
   * Check if text looks like readable English vs garbled PDF glyph data.
   */
  isTextReadable(text: string): boolean {
    if (!text || text.trim().length < 30) return false;
    const words = text.trim().split(/\s+/);
    if (words.length < 5) return false;
    const realWords = words.filter(w => w.length >= 3 && (w.match(/[a-zA-Z]/g) || []).length >= 2);
    return (realWords.length / words.length) > 0.45;
  },

  cleanExtractedText(text: string): string {
    if (!text) return '';
    
    // Split into words and keep only real words (3+ chars, mostly letters)
    const words = text.split(/\s+/).filter(w => {
      if (w.length < 2) return false; // reject single chars
      const letterCount = (w.match(/[a-zA-Z]/g) || []).length;
      // Must have at least 2 letters and be at least 50% letters
      return letterCount >= 2 && (letterCount / w.length) >= 0.5;
    });
    
    const cleanedText = words.join(' ').replace(/\s+/g, ' ').trim();
    
    console.log('[AIService] Text cleaning: original length', text.length, 'cleaned length', cleanedText.length, 'words:', words.length);
    
    return cleanedText;
  },

  localContentAnalysis(text: string, fileName: string, studentDescription: string = '', subjectLine: string = ''): {
    summary: string;
    key_topics: string[];
    word_count: number;
    flags: string[];
  }  {
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    
    // Clean the extracted text first, then check if it's actually readable
    const cleanedText = this.cleanExtractedText(text);
    const hasText = cleanedText.trim().length > 30 && this.isTextReadable(cleanedText);
    const meta = (baseName + ' ' + studentDescription + ' ' + subjectLine).toLowerCase();
    
    const T: Record<string, string> = {
      'climate change': 'Climate Change', 'global warming': 'Global Warming',
      'artificial intelligence': 'AI/Machine Learning', 'machine learning': 'Machine Learning',
      'mental health': 'Mental Health', 'social media': 'Social Media',
      'economic': 'Economics', 'political': 'Politics', 'histor': 'History',
      'environment': 'Environment', 'technolog': 'Technology', 'education': 'Education',
      'health': 'Health & Medicine', 'culture': 'Culture', 'psycholog': 'Psychology',
      'algorithm': 'Algorithms', 'database': 'Databases', 'network': 'Networking',
      'security': 'Cybersecurity', 'programming': 'Programming', 'software': 'Software',
      'math': 'Mathematics', 'physic': 'Physics', 'biolog': 'Biology',
    };
    
    if (!hasText) {
      const tops = Object.entries(T).filter(function(e) { return meta.includes(e[0]); }).map(function(e) { return e[1]; }).filter(function(x, i, a) { return a.indexOf(x) === i; }).slice(0, 4);
      return {
        summary: 'File "' + baseName + '" was uploaded but no readable text could be extracted. It may be a scanned, image-based, or encrypted document. Analysis is based on the filename and student description only.',
        key_topics: tops.length ? tops : ['See filename/description'],
        word_count: 0,
        flags: [
          'Document text could not be read — may be a scanned or image-based file',
          'Ask student to share an editable DOCX for deeper analysis',
        ],
      };
    }
    
    const words = cleanedText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const lowerText = cleanedText.toLowerCase();
    
    const aiPhrases = [
      'in order to', 'plays a crucial role', 'it is important to note',
      'this essay explores', "in today's world", 'furthermore', 'moreover',
      'in conclusion', 'significant impact', 'a wide range of', 'has been shown to',
    ];
    const aiFound = aiPhrases.filter(function(p) { return lowerText.includes(p); });
    const topics = Object.entries(T).filter(function(e) { return lowerText.includes(e[0]); }).map(function(e) { return e[1]; }).filter(function(x, i, a) { return a.indexOf(x) === i; }).slice(0, 4);
    
    const flags: string[] = [];
    if (aiFound.length >= 2) flags.push('AI writing style phrases detected: ' + aiFound.slice(0, 3).join(', '));
    if (!/\breferences?\b|\bbibliograph/.test(lowerText) && wordCount > 100) flags.push('No citations or references detected in the document');
    if (wordCount < 50 && wordCount > 0) flags.push('Document has limited text — may be image-based or sparse content');
    
    // Build a proper summary from first 2-3 sentences
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [];
    let summary = '';
    
    if (sentences.length > 0) {
      // Use first 1-2 sentences as summary
      summary = sentences.slice(0, Math.min(2, sentences.length))
        .join(' ')
        .substring(0, 300)
        .trim();
      
      // Ensure it ends properly
      if (!['.',  '!', '?'].includes(summary[summary.length - 1])) {
        summary += '...';
      }
      summary = 'Document summary: ' + summary;
    } else {
      // If no clear sentences, show first meaningful phrase
      const firstPhrase = words.slice(0, 15).join(' ');
      summary = firstPhrase.length > 10 
        ? 'Document begins: "' + firstPhrase + '..."'
        : 'Text extracted from "' + baseName + '".';
    }
    
    return { summary, key_topics: topics, word_count: wordCount, flags };
  },

  /**
   * On-device fallback scoring — now unified to use cloudmersiveService
   * Ensures student-side and teacher-side show consistent originality scores
   */
  localFallbackBrief(params: {
    fileName: string;
    studentDescription: string;
    subjectLine: string;
    topic: string;
    fileContent?: string;
  }) {
    const { fileName, studentDescription, subjectLine, topic } = params;
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    // Use unified plagiarism check from cloudmersiveService for consistency
    // This ensures student-side and teacher-side show the same scores
    const fullText = `${fileName} ${studentDescription} ${subjectLine} ${topic} ${params.fileContent || ''}`;
    const plagiarismCheckResult = cloudmersiveService.fallbackPlagiarismCheck(fullText);
    
    const originalityScore = plagiarismCheckResult.data?.originalityScore ?? 50;
    const matchPct = Math.max(0, Math.min(100, 100 - originalityScore)); // Convert originality to match percentage

    let integrityStatus: 'Clean' | 'Low Risk' | 'Warning' | 'High Risk';
    let sourceType: string;
    let integrityAnalysis: string;

    // Map originality score to risk status for teacher display
    if (originalityScore >= 85) {
      integrityStatus = 'Clean';
      sourceType = 'Clean';
      integrityAnalysis = `"${baseName}" shows excellent originality and proper academic formatting. Student provided clear personal explanation and proper citation practices.`;
    } else if (originalityScore >= 70) {
      integrityStatus = 'Low Risk';
      sourceType = 'Clean';
      integrityAnalysis = `Low risk detected for "${baseName}". Content shows good originality with few concerns. Student provided adequate context and some academic references.`;
    } else if (originalityScore >= 50) {
      integrityStatus = 'Warning';
      sourceType = 'Mixed';
      integrityAnalysis = `"${baseName}" shows moderate risk. Some content patterns suggest possible uncited material or formal text lacking personal voice. Recommend asking student to explain their approach and cite sources.`;
    } else if (originalityScore >= 30) {
      integrityStatus = 'Warning';
      sourceType = 'Uncited Website';
      integrityAnalysis = `"${baseName}" shows higher risk patterns. Content has low vocabulary diversity, limited citations, or formal structure without personal voice. Recommend asking student to explain key sections.`;
    } else {
      integrityStatus = 'High Risk';
      sourceType = 'Uncited Website';
      integrityAnalysis = `"${baseName}" shows strong risk indicators — very low vocabulary diversity, no citations, or consistent AI writing patterns detected. Ask student to explain their work verbally without referring to notes.`;
    }

    const concerns: string[] = [];
    if (originalityScore < 50) {
      concerns.push(`Ask student to explain "${baseName}" section by section in their own words`);
      concerns.push('Verify the student can articulate their understanding without the document');
    }
    if (originalityScore < 40) {
      concerns.push(`Check for uncited online sources — ask student to provide bibliography/references`);
    }
    if (concerns.length < 2) {
      concerns.push(`Review key arguments in "${baseName}" for accuracy and depth`);
      concerns.push(`Confirm student understands the marking criteria for ${subjectLine}`);
    }

    return {
      file_overview: `Document covers: "${baseName}". Student is seeking academic guidance related to ${topic || subjectLine}.`,
      academic_integrity: { percentage_match: matchPct, status: integrityStatus, analysis: integrityAnalysis, source_type: sourceType },
      content_analysis: this.localContentAnalysis(
        params.fileContent || '',
        fileName,
        studentDescription,
        subjectLine
      ),
      primary_concerns: concerns.slice(0, 3),
      consultation_focus: originalityScore < 50
        ? `Focus the consultation on verifying the student's understanding of "${baseName}" — ask them to explain the content without referring to notes.`
        : `Focus the consultation on identifying the student's specific gap in "${baseName}" and providing targeted feedback.`,
    };
  },

  /**
   * Generate a Consultation Prep Brief using Hugging Face Inference API (free).
   * Model: mistralai/Mistral-7B-Instruct-v0.2
   * Falls back to on-device analysis if API is unavailable.
   */
  async generateConsultationBrief(params: {
    fileName: string;
    studentDescription: string;
    subjectLine: string;
    topic: string;
    fileContent?: string;
  }): Promise<{
    file_overview: string;
    academic_integrity: {
      percentage_match: number;
      status: 'Clean' | 'Low Risk' | 'Warning' | 'High Risk';
      analysis: string;
      source_type: string;
    };
    content_analysis: {
      summary: string;
      key_topics: string[];
      word_count: number;
      flags: string[];
    } | null;
    primary_concerns: string[];
    consultation_focus: string;
  }> {
    const HF_KEY = process.env.EXPO_PUBLIC_HF_API_KEY;
    const { fileName, studentDescription, subjectLine, topic, fileContent } = params;

    console.log('[AI Service] Generating consultation brief for:', fileName);
    console.log('[AI Service] File content length:', fileContent?.length || 0, 'chars');
    console.log('[AI Service] File content preview:', fileContent?.substring(0, 100) || '(no content)');

    if (HF_KEY && HF_KEY !== 'your-hf-api-key-here') {
      try {
        const hasContent = fileContent && fileContent.trim().length > 50;
        const contentSnippet = hasContent ? fileContent!.substring(0, 2500) : null;

        const prompt = hasContent
          ? `<s>[INST] You are an academic integrity assistant helping a teacher review a student submission.

You have access to BOTH the file metadata AND the actual document content. Analyze everything carefully.

Return ONLY a JSON object — no markdown, no explanation, nothing outside the JSON.

File name: "${fileName}"
Subject: ${subjectLine}
Topic: ${topic}
Student's description: "${studentDescription}"

ACTUAL DOCUMENT CONTENT (first 2500 characters):
"""
${contentSnippet}
"""

Return this exact JSON:
{
  "file_overview": "Document covers: [concise summary of what the content actually discusses].",
  "academic_integrity": {
    "percentage_match": <integer 0-100>,
    "status": "<Clean|Low Risk|Warning|High Risk>",
    "analysis": "<1-2 sentences based on the document content: note any AI phrases, lack of citations, or similarity to known online text>",
    "source_type": "<Clean|AI-Generated|Uncited Website|Mixed|Direct Quote>"
  },
  "content_analysis": {
    "summary": "<2-3 sentences summarizing what the document actually contains based on the text>",
    "key_topics": ["<topic 1>", "<topic 2>", "<topic 3>"],
    "word_count": <estimated total word count>,
    "flags": ["<flag if AI phrases found>", "<flag if no citations>"] 
  },
  "primary_concerns": ["<concern 1>", "<concern 2>", "<concern 3>"],
  "consultation_focus": "<one actionable sentence for the teacher based on the actual content>"
}

Scoring guide for academic_integrity percentage_match:
- Clean (0-19%): Original writing, personal voice, cited sources.
- Low Risk (20-40%): Mostly original but some vague sections.
- Warning (41-65%): Significant AI style phrases found, or no citations detected.
- High Risk (66-100%): Heavy AI patterns like “in order to”, “plays a crucial role”, “furthermore”, “in today’s world”, “it is important to note”; OR explicit AI tool mention; OR content is clearly copied from web sources. [/INST]`
          : `<s>[INST] You are an academic integrity assistant helping a teacher review a student submission before a consultation.

You are given ONLY the file metadata — NOT the actual file content. Base your analysis on:
1. Whether the document title/filename looks like AI-generated or plagiarised work
2. Whether the student's description sounds personally written or AI-generated
3. Whether the student explains their own thinking or just labels the topic

Return ONLY a JSON object — no markdown, no explanation, nothing outside the JSON.

File name: "${fileName}"
Subject: ${subjectLine}
Topic: ${topic}
Student's description of their work: "${studentDescription}"

Return this exact JSON:
{
  "file_overview": "Document covers: [topic summary]. Student is seeking [type of help] related to [subject].",
  "academic_integrity": {
    "percentage_match": <integer 0-100>,
    "status": "<Clean|Low Risk|Warning|High Risk>",
    "analysis": "<1-2 sentences: state what signals you found and why you assigned this risk level>",
    "source_type": "<Clean|AI-Generated|Uncited Website|Mixed|Direct Quote>"
  },
  "content_analysis": null,
  "primary_concerns": ["<concern 1>", "<concern 2>", "<concern 3>"],
  "consultation_focus": "<one actionable sentence for the teacher>"
}

Scoring guide:
- Clean (0-19%): Student writes in personal voice, explains their specific challenge, provides context.
- Low Risk (20-40%): Some vagueness but student shows personal engagement.
- Warning (41-65%): Description is generic, formal, or reads like AI text; OR title is suspiciously polished.
- High Risk (66-100%): Strong AI text signals; OR explicit AI tool mention; OR student provides NO personal context. [/INST]`;

        const response = await fetch(
          'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${HF_KEY}`,
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: 500,
                temperature: 0.2,
                return_full_text: false,
              },
            }),
          }
        );

        // Handle 503 cold start: wait up to 20s and retry once before falling back
        if (response.status === 503) {
          console.warn('[NEXAD] HF model loading (cold start), retrying in 18s...');
          await new Promise(resolve => setTimeout(resolve, 18000));
          const retry = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_KEY}` },
              body: JSON.stringify({
                inputs: prompt,
                parameters: { max_new_tokens: 500, temperature: 0.2, return_full_text: false },
              }),
            }
          );
          if (!retry.ok) {
            console.warn('[NEXAD] HF retry also failed, using local fallback');
            return this.localFallbackBrief(params);
          }
          const retryBody = await retry.json();
          const retryRaw: string = Array.isArray(retryBody)
            ? (retryBody[0]?.generated_text || '')
            : (retryBody?.generated_text || '');
          const retryMatch = retryRaw.match(/\{[\s\S]*\}/);
          if (!retryMatch) return this.localFallbackBrief(params);
          const retryParsed = JSON.parse(retryMatch[0]);
          return {
            file_overview: retryParsed.file_overview || `Document: "${fileName}".`,
            academic_integrity: {
              percentage_match: Math.min(100, Math.max(0, parseInt(String(retryParsed.academic_integrity?.percentage_match)) || 0)),
              status: retryParsed.academic_integrity?.status || 'Clean',
              analysis: retryParsed.academic_integrity?.analysis || 'No integrity concerns detected.',
              source_type: retryParsed.academic_integrity?.source_type || 'Clean',
            },
            content_analysis: retryParsed.content_analysis && retryParsed.content_analysis !== null
              ? {
                  summary: retryParsed.content_analysis.summary || '',
                  key_topics: Array.isArray(retryParsed.content_analysis.key_topics) ? retryParsed.content_analysis.key_topics.slice(0, 5) : [],
                  word_count: parseInt(String(retryParsed.content_analysis.word_count)) || 0,
                  flags: Array.isArray(retryParsed.content_analysis.flags) ? retryParsed.content_analysis.flags.slice(0, 4) : [],
                }
              : this.localContentAnalysis(fileContent || '', fileName, studentDescription, topic),
            primary_concerns: Array.isArray(retryParsed.primary_concerns) ? retryParsed.primary_concerns.slice(0, 3) : [],
            consultation_focus: retryParsed.consultation_focus || 'Focus on understanding the student\'s core challenge.',
          };
        }

        const responseBody = await response.json();

        if (!response.ok) {
          const errMsg = responseBody?.error || `HTTP ${response.status}`;
          console.error('[NEXAD] HF API error:', errMsg);
          return this.localFallbackBrief(params);
        }

        const raw: string = Array.isArray(responseBody)
          ? (responseBody[0]?.generated_text || '')
          : (responseBody?.generated_text || '');

        // Extract JSON from the response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn('[NEXAD] HF response had no JSON, using fallback');
          return this.localFallbackBrief(params);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return {
          file_overview: parsed.file_overview || `Document: "${fileName}". Student description: "${studentDescription}".`,
          academic_integrity: {
            percentage_match: Math.min(100, Math.max(0, parseInt(String(parsed.academic_integrity?.percentage_match)) || 0)),
            status: parsed.academic_integrity?.status || 'Clean',
            analysis: parsed.academic_integrity?.analysis || 'No integrity concerns detected.',
            source_type: parsed.academic_integrity?.source_type || 'Clean',
          },
          content_analysis: parsed.content_analysis && parsed.content_analysis !== null
            ? {
                summary: parsed.content_analysis.summary || '',
                key_topics: Array.isArray(parsed.content_analysis.key_topics) ? parsed.content_analysis.key_topics.slice(0, 5) : [],
                word_count: parseInt(String(parsed.content_analysis.word_count)) || 0,
                flags: Array.isArray(parsed.content_analysis.flags) ? parsed.content_analysis.flags.slice(0, 4) : [],
              }
            : this.localContentAnalysis(fileContent || '', fileName, studentDescription, topic),
          primary_concerns: Array.isArray(parsed.primary_concerns) ? parsed.primary_concerns.slice(0, 3) : [],
          consultation_focus: parsed.consultation_focus || 'Focus on understanding the student\'s core challenge.',
        };
      } catch (err) {
        console.error('[NEXAD] generateConsultationBrief failed:', err);
        return this.localFallbackBrief(params);
      }
    }

    // No API key set — use on-device fallback
    return this.localFallbackBrief(params);
  },
};

