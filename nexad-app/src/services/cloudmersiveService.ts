import type { ApiResponse } from '../types';
import { strFromU8, unzipSync } from 'fflate';
import { documentService } from './documentService';
import { cacheDirectory, downloadAsync, uploadAsync, deleteAsync, FileSystemUploadType } from 'expo-file-system/legacy';

const CLOUDMERSIVE_API_KEY = process.env.EXPO_PUBLIC_CLOUDMERSIVE_API_KEY || '';
const BASE_URL = 'https://api.cloudmersive.com';

export interface PlagiarismResult {
  originalityScore: number; // 0-100, higher is more original
  matches: Array<{
    text: string;
    url?: string;
    similarity: number;
  }>;
  isHighRisk: boolean; // true if score < 70
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface PDFTextResult {
  text: string;
  pageCount: number;
}

/**
 * Cloudmersive Service for PDF extraction, OCR, and plagiarism checking
 */
export const cloudmersiveService = {
  extractLooseAsciiTextFromPdfBytes(arrayBuffer: ArrayBuffer): string {
    try {
      const raw = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer).slice(0, 600000));
      const normalized = raw
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tokens = normalized
        .split(' ')
        .map(t => t.trim())
        .filter(t => /[a-zA-Z]{3,}/.test(t))
        .filter(t => !/^obj|endobj|stream|endstream|xref|trailer$/i.test(t));

      if (tokens.length < 60) return '';
      return tokens.slice(0, 2500).join(' ');
    } catch {
      return '';
    }
  },

  buildProxyTextForUnextractablePdf(fileName: string): string {
    const name = (fileName || 'document').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
    return [
      `Submission title: ${name}.`,
      'Automated PDF text extraction could not fully decode this file.',
      'The system will still run a conservative integrity estimate using limited available metadata.',
      'For best plagiarism accuracy, upload a text-based PDF or DOCX with selectable text and proper citations.',
      'If this file was scanned or image-based, OCR may be required before integrity analysis can be highly reliable.',
    ].join(' ');
  },

  normalizeApiOriginalityScore(result: any): number | null {
    if (!result || typeof result !== 'object') return null;

    if (typeof result.OriginalityScore === 'number') {
      return Math.max(0, Math.min(100, result.OriginalityScore));
    }

    if (typeof result.PlagiarismScore === 'number') {
      return Math.max(0, Math.min(100, 100 - result.PlagiarismScore));
    }

    if (typeof result.MatchPercentage === 'number') {
      return Math.max(0, Math.min(100, 100 - result.MatchPercentage));
    }

    const matches = Array.isArray(result.Matches) ? result.Matches : [];
    if (matches.length > 0) {
      const maxSimilarity = matches.reduce((max: number, m: any) => {
        const sim = typeof m?.SimilarityScore === 'number' ? m.SimilarityScore : 0;
        return sim > max ? sim : max;
      }, 0);

      if (maxSimilarity > 0) {
        return Math.max(0, Math.min(100, 100 - maxSimilarity));
      }
    }

    return null;
  },
  async extractDocxText(fileUri: string): Promise<ApiResponse<string>> {
    try {
      const fileResponse = await fetch(fileUri);
      const arrayBuffer = await fileResponse.arrayBuffer();
      const zipData = new Uint8Array(arrayBuffer);
      const unzipped = unzipSync(zipData);

      const documentXml = unzipped['word/document.xml'];
      if (!documentXml) {
        return { error: 'Invalid DOCX file. Could not read document content.' };
      }

      const xmlText = strFromU8(documentXml);
      const extractedText = xmlText
        .replace(/<w:p[^>]*>/g, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!extractedText) {
        return { error: 'No readable text found in DOCX file.' };
      }

      return { data: extractedText };
    } catch (error: any) {
      console.error('[Cloudmersive] DOCX extraction error:', error);
      return { error: error.message || 'Failed to extract DOCX text' };
    }
  },

  /**
   * Clean corrupted PDF ligature characters and encoding artifacts.
   * PDFs often encode ligatures (fi, fl, ff, ffi, ffl, ti, etc.) as single glyphs
   * that get decoded to garbage Unicode when converted to text.
   */
  cleanPdfLigatures(text: string): string {
    if (!text) return '';
    
    let cleaned = text;
    
    // Step 1: Replace known Unicode ligature characters with their ASCII equivalents
    cleaned = cleaned
      .replace(/\uFB00/g, 'ff')   // ff ligature
      .replace(/\uFB01/g, 'fi')   // fi ligature
      .replace(/\uFB02/g, 'fl')   // fl ligature
      .replace(/\uFB03/g, 'ffi')  // ffi ligature
      .replace(/\uFB04/g, 'ffl')  // ffl ligature
      .replace(/\uFB05/g, 'st')   // st ligature (long s + t)
      .replace(/\uFB06/g, 'st')   // st ligature
      .replace(/\u2018|\u2019/g, "'")  // smart quotes
      .replace(/\u201C|\u201D/g, '"')  // smart double quotes
      .replace(/\u2013/g, '-')    // en dash
      .replace(/\u2014/g, '-')    // em dash
      .replace(/\u2026/g, '...');  // ellipsis
    
    // Step 2: For each word, strip non-ASCII characters and try to reconstruct
    // This handles corrupted ligatures like 畍黧 in "In畍黧uence" → "Inuence" → close enough
    // We process word by word to preserve spacing
    cleaned = cleaned.split(/(\s+)/).map(token => {
      // Preserve whitespace tokens
      if (/^\s+$/.test(token)) return token;
      
      // If the token has non-ASCII chars mixed with ASCII, strip non-ASCII
      if (/[^\x00-\x7F]/.test(token) && /[a-zA-Z]/.test(token)) {
        return token.replace(/[^\x20-\x7E]/g, '');
      }
      
      // If token is entirely non-ASCII (e.g. standalone junk), remove it
      if (/^[^\x00-\x7F]+$/.test(token)) return '';
      
      // Fix } and { that appear inside words (common PDF artifacts for ti/fi)
      if (/[a-zA-Z]\}[a-zA-Z]/.test(token)) {
        token = token.replace(/\}/g, 'ti');
      }
      if (/[a-zA-Z]\{[a-zA-Z]/.test(token)) {
        token = token.replace(/\{/g, 'fi');
      }
      
      return token;
    }).join('');
    
    // Step 3: Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    console.log('[Cloudmersive] Ligature cleanup: original length', text.length, 'cleaned length', cleaned.length);
    
    return cleaned;
  },

  /**
   * Extract text from PDF file
   */
  async extractPDFText(fileUri: string, fileName: string): Promise<ApiResponse<PDFTextResult>> {
    try {
      if (!CLOUDMERSIVE_API_KEY || CLOUDMERSIVE_API_KEY === 'your-cloudmersive-api-key-here') {
        return { error: 'Cloudmersive API key not configured.' };
      }

      console.log('[Cloudmersive] extractPDFText: downloading file from URI...');

      // Download file to temp location (React Native FormData+Blob is unreliable)
      const tempPath = (cacheDirectory || '') + 'cm_pdf_' + Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9.]/g, '_');
      const downloadResult = await downloadAsync(fileUri, tempPath);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download file for extraction: HTTP ' + downloadResult.status);
      }

      console.log('[Cloudmersive] extractPDFText: file downloaded, uploading to API...');

      // Upload using uploadAsync — the only reliable multipart upload in React Native
      const uploadResult = await uploadAsync(
        `${BASE_URL}/convert/pdf/to/txt`,
        tempPath,
        {
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: 'inputFile',
          mimeType: 'application/pdf',
          headers: {
            'Apikey': CLOUDMERSIVE_API_KEY,
          },
        }
      );

      // Clean up temp file
      deleteAsync(tempPath, { idempotent: true }).catch(() => {});

      console.log('[Cloudmersive] extractPDFText: API responded with status', uploadResult.status);

      if (uploadResult.status !== 200) {
        throw new Error(`PDF extraction API failed (HTTP ${uploadResult.status}): ${uploadResult.body?.substring(0, 200)}`);
      }

      // Parse the JSON response — Cloudmersive returns {"Successful":true,"TextResult":"..."}
      let extractedText = '';
      try {
        const jsonBody = JSON.parse(uploadResult.body);
        console.log('[Cloudmersive] extractPDFText: Successful =', jsonBody.Successful, 'TextResult length =', (jsonBody.TextResult || '').length);
        if (jsonBody && typeof jsonBody.TextResult === 'string') {
          extractedText = jsonBody.TextResult;
        } else if (jsonBody && typeof jsonBody.text === 'string') {
          extractedText = jsonBody.text;
        } else {
          extractedText = uploadResult.body;
        }
      } catch {
        extractedText = uploadResult.body;
      }

      console.log('[Cloudmersive] extractPDFText result length:', extractedText.length, 'preview:', extractedText.substring(0, 150));

      // Clean ligature encoding artifacts
      extractedText = this.cleanPdfLigatures(extractedText);

      console.log('[Cloudmersive] extractPDFText after ligature cleanup preview:', extractedText.substring(0, 150));

      const pageCount = Math.max(1, Math.ceil(extractedText.length / 3000));

      return {
        data: {
          text: extractedText.trim(),
          pageCount,
        },
      };
    } catch (error: any) {
      console.error('[Cloudmersive] PDF extraction error:', error);
      return { error: error.message || 'Failed to extract PDF text' };
    }
  },

  /**
   * Extract text from image using OCR
   */
  async extractImageText(fileUri: string, fileName: string): Promise<ApiResponse<OCRResult>> {
    try {
      if (!CLOUDMERSIVE_API_KEY || CLOUDMERSIVE_API_KEY === 'your-cloudmersive-api-key-here') {
        return { error: 'Cloudmersive API key not configured. Please add EXPO_PUBLIC_CLOUDMERSIVE_API_KEY to .env' };
      }

      // Fetch the file as a blob
      const fileResponse = await fetch(fileUri);
      const fileBlob = await fileResponse.blob();

      // Create form data
      const formData = new FormData();
      formData.append('imageFile', fileBlob, fileName);

      const response = await fetch(`${BASE_URL}/ocr/image/toText`, {
        method: 'POST',
        headers: {
          'Apikey': CLOUDMERSIVE_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR failed: ${errorText}`);
      }

      const result = await response.json();

      return {
        data: {
          text: result.TextResult || result.MeanConfidenceLevel || '',
          confidence: result.MeanConfidenceLevel || 0.85,
        },
      };
    } catch (error: any) {
      console.error('[Cloudmersive] OCR error:', error);
      return { error: error.message || 'Failed to extract text from image' };
    }
  },

  /**
   * Check document for plagiarism/academic integrity
   * Uses text similarity analysis against web sources
   */
  async checkPlagiarism(text: string): Promise<ApiResponse<PlagiarismResult>> {
    try {
      if (!text || text.trim().length < 50) {
        return { error: 'Text too short for plagiarism analysis (minimum 50 characters)' };
      }

      // If API key is missing, use fallback immediately with no retry
      if (!CLOUDMERSIVE_API_KEY || CLOUDMERSIVE_API_KEY === 'your-cloudmersive-api-key-here') {
        console.warn('[Cloudmersive] API key not configured, using local analysis');
        return this.fallbackPlagiarismCheck(text);
      }

      // Use Cloudmersive plagiarism detection API
      try {
        const response = await fetch(`${BASE_URL}/nlp-v2/analytics/plagiarism/detect`, {
          method: 'POST',
          headers: {
            'Apikey': CLOUDMERSIVE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            InputText: text.substring(0, 10000), // Limit to 10k chars
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Cloudmersive] API error response:', response.status, errorText);
          console.warn('[Cloudmersive] Plagiarism API unavailable, using local analysis');
          return this.fallbackPlagiarismCheck(text);
        }

        const result = await response.json();

        console.log('[Cloudmersive] API raw response:', JSON.stringify(result).substring(0, 300));

        const heuristicResult = this.fallbackPlagiarismCheck(text);
        const heuristicOriginality = heuristicResult.data?.originalityScore ?? 50;

        const parsedOriginality = this.normalizeApiOriginalityScore(result);
        if (parsedOriginality === null) {
          console.warn('[Cloudmersive] Invalid API response structure, using local analysis');
          return heuristicResult;
        }

        console.log('[Cloudmersive] Score comparison:', {
          apiOriginality: parsedOriginality,
          heuristicOriginality,
          willUseLower: true
        });

        // Always use the lower score between API and heuristics to be conservative
        // This prevents false negatives where API misses plagiarism that heuristics catch
        const originalityScore = Math.min(parsedOriginality, heuristicOriginality);

        console.log('[Cloudmersive] Final originality score:', originalityScore);

        const matches = (result.Matches || []).map((m: any) => ({
          text: m.Text || '',
          url: m.Url,
          similarity: Math.min(100, Math.max(0, m.SimilarityScore || 0)),
        }));

        return {
          data: {
            originalityScore,
            matches,
            isHighRisk: originalityScore < 70,
          },
        };
      } catch (apiError: any) {
        console.error('[Cloudmersive] API call failed:', apiError.message);
        console.warn('[Cloudmersive] Falling back to local analysis');
        return this.fallbackPlagiarismCheck(text);
      }
    } catch (error: any) {
      console.error('[Cloudmersive] Plagiarism check error:', error);
      // Final fallback to local analysis on any error
      return this.fallbackPlagiarismCheck(text);
    }
  },

  /**
   * Fallback plagiarism checker using smart heuristics
   * Used when Cloudmersive API is unavailable
   * Analyzes content patterns, AI indicators, and citation presence
   */
  fallbackPlagiarismCheck(text: string): ApiResponse<PlagiarismResult> {
    try {
      if (!text || text.trim().length < 50) {
        return {
          data: {
            originalityScore: 0,
            matches: [],
            isHighRisk: true,
          },
        };
      }

      let plagiarismScore = 0; // 0-100 plagiarism risk (higher = more likely plagiarized)
      const textLower = text.toLowerCase();
      const words = textLower.split(/\s+/).filter(w => w.length > 0);
      const uniqueWords = new Set(words);
      const vocabDiversity = words.length > 0 ? (uniqueWords.size / words.length) * 100 : 50;
      const sentenceCount = (text.match(/[.!?]+/g) || []).length || 1;
      const avgWordsPerSentence = words.length / sentenceCount;
      const hasPersonalVoice = /\b(i |my |me |we |our |i'm|i've|i need|my perspective|my approach|my analysis)\b/i.test(text);

      console.log('[Plagiarism Analysis] Text stats:', {
        wordCount: words.length,
        uniqueWords: uniqueWords.size,
        vocabDiversity: vocabDiversity.toFixed(1),
        sentenceCount,
        avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
        hasPersonalVoice,
        textPreview: text.substring(0, 200)
      });

      // ── AI-Generated Content Indicators ──────────────────────────────
      const aiPhrases = [
        'as an ai', 'as a language model', 'as an artificial intelligence',
        'i am an ai', 'i don\'t have personal experience', 'i cannot',
        'as outlined above', 'in conclusion', 'to summarize', 'furthermore',
      ];
      const aiPhraseCount = aiPhrases.filter(phrase => textLower.includes(phrase)).length;
      if (aiPhraseCount >= 2) plagiarismScore += 35; // Strong AI indicator

      // ── Plagiarism Risk Indicators ───────────────────────────────
      // Low vocabulary diversity (indicator of copy-paste)
      if (vocabDiversity < 30) plagiarismScore += 35; // Very low diversity = likely copied
      else if (vocabDiversity < 40) plagiarismScore += 25;
      else if (vocabDiversity < 50) plagiarismScore += 15;
      else if (vocabDiversity < 60) plagiarismScore += 8;

      // Long quoted passages without citations
      const quotedSections = (text.match(/["'][^"']{80,}["']/g) || []).length;
      if (quotedSections > 3) plagiarismScore += 20;
      else if (quotedSections > 1) plagiarismScore += 10;

      // Definition-style copy indicators (very common in direct web copy/paste)
      const definitionPatterns = [
        /\bis a type of\b/i,
        /\bis the process of\b/i,
        /\brefers to\b/i,
        /\bis defined as\b/i,
        /\bis the practice of\b/i,
        /\baccording to\s+\w+/i,
        /\bcan be defined as\b/i,
        /\bis known as\b/i,
        /\bis a method (of|for)\b/i,
        /\bis a technique (for|to)\b/i,
      ];
      const definitionHits = definitionPatterns.filter(p => p.test(text)).length;
      if (definitionHits >= 3) plagiarismScore += 40; // Multiple definitions = very likely copied
      else if (definitionHits >= 2) plagiarismScore += 30;
      else if (definitionHits === 1) plagiarismScore += 20;

      // Encyclopedic tone + no personal context often indicates copied source text
      if (avgWordsPerSentence > 18 && !hasPersonalVoice) plagiarismScore += 12;

      // Check for formal structure without personal voice
      const formalTransitions = ['however', 'therefore', 'furthermore', 'moreover', 'consequently', 'Additionally'].filter(
        t => textLower.includes(t.toLowerCase())
      ).length;

      if (formalTransitions >= 4 && !hasPersonalVoice) plagiarismScore += 18;
      else if (formalTransitions >= 2 && !hasPersonalVoice) plagiarismScore += 10;

      // ── Citation & Academic Integrity Indicators ──────────────────
      const hasCitations = /\([A-Z][a-z]+,?\s+\d{4}\)|\[\d+\]|\baccording to\b|\bcited from\b|\bsource:/i.test(
        text
      );

      // No citations + large document = higher risk
      if (!hasCitations && words.length > 200) plagiarismScore += 15;
      else if (!hasCitations && words.length > 100) plagiarismScore += 8;

      // Reward for proper citations
      if (hasCitations) plagiarismScore = Math.max(0, plagiarismScore - 10);

      // ── Content Quality Indicators ──────────────────────────────
      // Short text should never be auto-100 originality because it is hard to verify.
      // Keep a conservative floor on plagiarism risk for short extracts.
      if (words.length < 40) plagiarismScore = Math.max(plagiarismScore, 28);
      else if (words.length < 80) plagiarismScore = Math.max(plagiarismScore, 20);

      // High vocabulary diversity + citations = lower risk
      if (vocabDiversity > 60 && hasCitations) plagiarismScore = Math.max(0, plagiarismScore - 15);

      // Personal voice + citations = much lower risk
      if (hasPersonalVoice && hasCitations) plagiarismScore = Math.max(0, plagiarismScore - 20);

      // Guardrails: Ensure copied encyclopedic content can't score high originality
      if (definitionHits >= 2 && !hasCitations) plagiarismScore = Math.max(plagiarismScore, 50); // Multiple definitions = at most 50% originality
      else if (definitionHits > 0 && !hasCitations) plagiarismScore = Math.max(plagiarismScore, 40); // Single definition = at most 60% originality
      
      // Low diversity + no personal voice = likely copied
      if (vocabDiversity < 45 && !hasPersonalVoice && !hasCitations) {
        plagiarismScore = Math.max(plagiarismScore, 45); // At most 55% originality
      }

      // ── Convert plagiarism risk to originality score ──────────────────────────────
      const plagiarismRiskScore = Math.min(100, Math.max(0, plagiarismScore));
      const originalityScore = Math.max(0, 100 - plagiarismRiskScore);

      console.log('[Plagiarism Analysis] Final scores:', {
        plagiarismRiskScore,
        originalityScore,
        hasCitations,
        definitionHits,
        aiPhraseCount,
        vocabDiversity: vocabDiversity.toFixed(1)
      });

      return {
        data: {
          originalityScore,
          matches: [],
          isHighRisk: originalityScore < 70,
        },
      };
    } catch (error: any) {
      console.error('[Cloudmersive] Fallback analysis error:', error);
      return {
        data: {
          originalityScore: 50, // Neutral score on error
          matches: [],
          isHighRisk: true,
        },
      };
    }
  },

  /**
  * Extract text only when needed:
  * - PDF uses local parser (more stable on mobile than multipart converter upload)
   * - DOCX is parsed locally then analyzed directly
   * - Images are intentionally skipped from plagiarism analysis
   */
  /**
   * Check if extracted text is readable English (not garbled PDF glyph IDs).
   * Garbled text has mostly 1-2 char "words" and no recognizable phrases.
   */
  isTextReadable(text: string): boolean {
    if (!text || text.trim().length < 30) return false;
    const words = text.trim().split(/\s+/);
    if (words.length < 5) return false;
    // Count words that are 3+ chars and contain at least 2 letters
    const realWords = words.filter(w => w.length >= 3 && (w.match(/[a-zA-Z]/g) || []).length >= 2);
    const ratio = realWords.length / words.length;
    console.log('[Cloudmersive] Text readability: realWords ratio', ratio.toFixed(2), '(' + realWords.length + '/' + words.length + ')');
    // Real English text has >50% words of 3+ chars; garbled has <30%
    return ratio > 0.45;
  },

  async extractTextFromFile(fileUri: string, fileName: string, mimeType?: string): Promise<ApiResponse<string>> {
    try {
      const lowerName = fileName.toLowerCase();
      const lowerMime = mimeType?.toLowerCase() || '';

      // Check if it's a PDF
      if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) {
        // Try cloud API first — it handles custom font encodings that the local parser cannot
        try {
          const cloudText = await this.extractPDFText(fileUri, fileName);
          if (cloudText.data?.text && cloudText.data.text.trim().length >= 30 && this.isTextReadable(cloudText.data.text)) {
            console.log('[Cloudmersive] Cloud PDF extraction succeeded and is readable, length:', cloudText.data.text.length);
            return { data: cloudText.data.text.trim() };
          } else {
            console.log('[Cloudmersive] Cloud PDF extraction failed or not readable:', cloudText.error || 'unreadable text');
          }
        } catch (cloudErr) {
          console.log('[Cloudmersive] Cloud PDF extraction threw error:', cloudErr);
        }

        // Fallback 1: Local byte-level PDF parser
        try {
          const fileResponse = await fetch(fileUri);
          const arrayBuffer = await fileResponse.arrayBuffer();
          const localText = documentService.extractPdfText(arrayBuffer);
          if (localText && localText.trim().length >= 30 && this.isTextReadable(localText)) {
            console.log('[Cloudmersive] Local PDF extraction succeeded and is readable, length:', localText.length);
            return { data: localText };
          }

          // Fallback 2: Loose byte scan
          const looseText = this.extractLooseAsciiTextFromPdfBytes(arrayBuffer);
          if (looseText && looseText.trim().length >= 30 && this.isTextReadable(looseText)) {
            return { data: looseText };
          }
        } catch (localErr) {
          console.log('[Cloudmersive] Local PDF extraction threw error:', localErr);
        }

        // All extraction methods failed or returned garbled text
        console.log('[Cloudmersive] All PDF extraction methods returned unreadable text, using proxy');
        return { data: '' }; // Return empty so content analysis shows "no readable text" instead of proxy summary
      }

      // DOCX is parsed locally, no extractor API call
      if (
        lowerName.endsWith('.docx') ||
        lowerMime.includes('wordprocessingml') ||
        lowerMime.includes('msword')
      ) {
        return this.extractDocxText(fileUri);
      }

      // Images are not included in plagiarism analysis
      if (
        lowerName.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/) ||
        lowerMime.includes('image')
      ) {
        return { error: 'Images are skipped for academic integrity analysis.' };
      }

      return { error: 'Unsupported file type. Upload a PDF or DOCX file for analysis.' };
    } catch (error: any) {
      console.error('[Cloudmersive] Text extraction error:', error);
      return { error: error.message || 'Failed to extract text from file' };
    }
  },
};
