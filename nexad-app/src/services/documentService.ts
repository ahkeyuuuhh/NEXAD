import * as DocumentPicker from 'expo-document-picker';
import { unzipSync, unzlibSync, inflateSync } from 'fflate';
import { supabase } from '../config/supabase';
import type { UploadedDocument, ApiResponse } from '../types';

const MAX_FILE_SIZE_MB = parseInt(process.env.EXPO_PUBLIC_MAX_FILE_SIZE_MB || '10');
const ALLOWED_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export const documentService = {
  /**
   * Pick document from device
   */
  async pickDocument(): Promise<ApiResponse<DocumentPicker.DocumentPickerResult>> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { error: 'Document selection cancelled' };
      }

      // Check file size
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return { error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit` };
      }

      return { data: result };
    } catch (error: any) {
      return { error: error.message || 'Failed to pick document' };
    }
  },

  /**
   * Upload document to Supabase storage
   */
  async uploadDocument(
    file: DocumentPicker.DocumentPickerAsset,
    consultationRequestId?: string,
    attachmentBinId?: string,
    uploadedBy?: string
  ): Promise<ApiResponse<UploadedDocument>> {
    try {
      if (!file.uri) {
        return { error: 'Invalid file URI' };
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      // First folder MUST be the uploader's user ID to satisfy storage RLS policy
      const filePath = uploadedBy ? `${uploadedBy}/${fileName}` : `public/${fileName}`;

      // Use fetch + arrayBuffer — the reliable way to read files in React Native/Expo
      // (avoids the unreliable atob() path that silently fails on some devices)
      const fetchResponse = await fetch(file.uri);
      if (!fetchResponse.ok) {
        return { error: 'Failed to read file from device' };
      }
      const arrayBuffer = await fetchResponse.arrayBuffer();

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('consultation-documents')
        .upload(filePath, arrayBuffer, {
          contentType: file.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record in the database
      const { data: documentData, error: documentError } = await supabase
        .from('uploaded_documents')
        .insert({
          consultation_request_id: consultationRequestId,
          attachment_bin_id: attachmentBinId,
          file_name: file.name,
          file_type: 'docx',
          file_size_bytes: file.size || arrayBuffer.byteLength,
          storage_path: uploadData.path,
          uploaded_by: uploadedBy,
        })
        .select()
        .single();

      if (documentError) throw documentError;

      return { data: documentData };
    } catch (error: any) {
      return { error: error.message || 'Failed to upload document' };
    }
  },

  /**
   * Get document download URL
   */
  async getDocumentUrl(storagePath: string): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.storage
        .from('consultation-documents')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) throw error;

      return { data: data.signedUrl };
    } catch (error: any) {
      return { error: error.message || 'Failed to get document URL' };
    }
  },

  /**
   * Get documents for consultation request
   */
  async getConsultationDocuments(
    consultationRequestId: string
  ): Promise<ApiResponse<UploadedDocument[]>> {
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('consultation_request_id', consultationRequestId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch documents' };
    }
  },

  /**
   * Download a file from Supabase Storage and extract its text content.
   * Supports DOCX only. Returns empty string on failure (graceful).
   */
  async extractTextFromFile(storagePath: string, fileType: string): Promise<string> {
    try {
      const urlResult = await this.getDocumentUrl(storagePath);
      if (urlResult.error || !urlResult.data) return '';

      const response = await fetch(urlResult.data);
      if (!response.ok) return '';

      const arrayBuffer = await response.arrayBuffer();
      return this.extractDocxText(arrayBuffer);
    } catch {
      return '';
    }
  },

  /**
   * Extract plain text from a DOCX (Office Open XML) file.
   * DOCX is a ZIP archive — we unzip it and parse word/document.xml.
   */
  extractDocxText(arrayBuffer: ArrayBuffer): string {
    try {
      const bytes = new Uint8Array(arrayBuffer);
      const unzipped = unzipSync(bytes);
      const xmlBytes = unzipped['word/document.xml'];
      if (!xmlBytes) return '';

      const xml = new TextDecoder('utf-8').decode(xmlBytes);

      // Extract text inside <w:t> tags (OOXML text runs)
      const matches = xml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || [];
      const text = matches
        .map(m => m.replace(/<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>/, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text;
    } catch {
      return '';
    }
  },

  /**
   * Parse text-drawing operators from a decompressed PDF content stream string.
   * Looks for Tj, TJ array, and ' " operators. Operates on already-decoded text.
   */
  _parsePdfStreamText(stream: string, parts: string[]): void {
    // Extract all BT...ET blocks first (text object boundaries)
    // Fall back to scanning full stream if no BT/ET found
    const blocks: string[] = [];
    let btIdx = stream.indexOf('BT');
    if (btIdx === -1) {
      blocks.push(stream); // no BT/ET: scan entire stream
    } else {
      while (btIdx !== -1) {
        const etIdx = stream.indexOf('ET', btIdx + 2);
        if (etIdx === -1) break;
        blocks.push(stream.substring(btIdx + 2, etIdx));
        btIdx = stream.indexOf('BT', etIdx + 2);
      }
    }

    for (const block of blocks) {
      // Strategy A: [(text) -250 (more text)] TJ
      let i = 0;
      while (i < block.length) {
        const tjIdx = block.indexOf('] TJ', i);
        const tjIdx2 = block.indexOf(']TJ', i);
        const arrEnd = tjIdx !== -1 && tjIdx2 !== -1 ? Math.min(tjIdx, tjIdx2)
          : tjIdx !== -1 ? tjIdx : tjIdx2;
        if (arrEnd !== -1) {
          const arrStart = block.lastIndexOf('[', arrEnd);
          if (arrStart !== -1) {
            const inner = block.substring(arrStart + 1, arrEnd);
            // extract parenthesis strings from array
            let pi = 0;
            while (pi < inner.length) {
              const ps = inner.indexOf('(', pi);
              if (ps === -1) break;
              let pe = ps + 1;
              while (pe < inner.length) {
                if (inner[pe] === '\\') { pe += 2; continue; }
                if (inner[pe] === ')') break;
                pe++;
              }
              const raw = inner.substring(ps + 1, pe)
                .replace(/\\n/g, ' ').replace(/\\r/g, ' ')
                .replace(/\\t/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')')
                .replace(/\\[0-7]{1,3}/g, ' ');
              if (/[a-zA-Z]{2,}/.test(raw)) parts.push(raw.trim());
              pi = pe + 1;
            }
            i = arrEnd + 4;
            continue;
          }
        }

        // Strategy B: (text) Tj or (text) '
        const ps = block.indexOf('(', i);
        if (ps === -1) break;
        let pe = ps + 1;
        while (pe < block.length) {
          if (block[pe] === '\\') { pe += 2; continue; }
          if (block[pe] === ')') break;
          pe++;
        }
        if (pe >= block.length) { i = ps + 1; continue; }
        // Check operator after closing paren (skip spaces)
        let op = pe + 1;
        while (op < block.length && (block[op] === ' ' || block[op] === '\t' || block[op] === '\r' || block[op] === '\n')) op++;
        const opChar = block.substring(op, op + 2);
        if (opChar === 'Tj' || opChar[0] === "'" || opChar[0] === '"') {
          const raw = block.substring(ps + 1, pe)
            .replace(/\\n/g, ' ').replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')')
            .replace(/\\[0-7]{1,3}/g, ' ');
          if (/[a-zA-Z]{2,}/.test(raw)) parts.push(raw.trim());
        }
        i = pe + 1;
      }

      // Strategy C: hex strings <ABCD> Tj
      const hexRe = /<([0-9a-fA-F]{2,})>\s*(?:Tj|')/g;
      let hm: RegExpExecArray | null;
      while ((hm = hexRe.exec(block)) !== null) {
        const hex = hm[1];
        let result = '';
        for (let hi = 0; hi + 1 < hex.length; hi += 2) {
          const code = parseInt(hex.substring(hi, hi + 2), 16);
          if (code >= 32 && code < 127) result += String.fromCharCode(code);
          else result += ' ';
        }
        if (/[a-zA-Z]{2,}/.test(result)) parts.push(result.trim());
      }
    }
  },

  /**
   * Locate byte sequence `needle` inside `haystack` starting from `from`.
   */
  _findBytes(haystack: Uint8Array, needle: number[], from: number): number {
    const nl = needle.length;
    outer: for (let i = from; i <= haystack.length - nl; i++) {
      for (let j = 0; j < nl; j++) {
        if (haystack[i + j] !== needle[j]) continue outer;
      }
      return i;
    }
    return -1;
  },

  /**
   * Extract readable text from a PDF file using byte-level stream scanning.
   * Avoids regex over binary data (which fails in Hermes on large files).
   * Handles both uncompressed and FlateDecode (zlib) compressed streams.
   */
  extractPdfText(arrayBuffer: ArrayBuffer): string {
    try {
      const fb = new Uint8Array(arrayBuffer);
      const STREAM  = [115,116,114,101,97,109];      // 'stream'
      const ENDSTRM = [101,110,100,115,116,114,101,97,109]; // 'endstream'

      const parts: string[] = [];
      let pos = 0;

      while (pos < fb.length) {
        const si = this._findBytes(fb, STREAM, pos);
        if (si === -1) break;

        // 'stream' must be followed by \n or \r\n
        const after = si + 6;
        let dataStart = -1;
        if (fb[after] === 10) dataStart = after + 1;               // \n
        else if (fb[after] === 13 && fb[after + 1] === 10) dataStart = after + 2; // \r\n

        if (dataStart === -1) { pos = si + 6; continue; }

        const ei = this._findBytes(fb, ENDSTRM, dataStart);
        if (ei === -1) break;

        // Trim trailing \r\n before endstream
        let dataEnd = ei;
        if (dataEnd > 0 && fb[dataEnd - 1] === 10) dataEnd--;
        if (dataEnd > 0 && fb[dataEnd - 1] === 13) dataEnd--;

        // Inspect dictionary before this stream (latin1 string, 600 bytes back)
        const dictBuf = fb.slice(Math.max(0, si - 600), si);
        const dictStr = Array.from(dictBuf).map(b => String.fromCharCode(b)).join('');

        const isFlate      = /\/FlateDecode|\bFlate\b/.test(dictStr);
        const isFontProg   = /\/FontFile\d?\b/.test(dictStr);
        const isImage      = /Subtype\s*\/Image/.test(dictStr);
        const isObjStm     = /\/Type\s*\/ObjStm/.test(dictStr);
        const isXrefStm    = /\/Type\s*\/XRef/.test(dictStr);

        if (isFontProg || isImage || isObjStm || isXrefStm) {
          pos = ei + 9; continue;
        }

        const streamData = fb.slice(dataStart, dataEnd);

        if (isFlate) {
          try {
            let dec: Uint8Array;
            try { dec = unzlibSync(streamData); }   // standard PDF zlib (RFC 1950)
            catch { dec = inflateSync(streamData); } // raw deflate fallback
            const text = new TextDecoder('latin1').decode(dec);
            this._parsePdfStreamText(text, parts);
          } catch { /* decompression failed, skip stream */ }
        } else {
          // Uncompressed: convert bytes to latin1 string
          const text = Array.from(streamData).map(b => String.fromCharCode(b)).join('');
          this._parsePdfStreamText(text, parts);
        }

        pos = ei + 9;
      }

      // Last-resort: scan raw file bytes if nothing extracted yet
      if (parts.length === 0) {
        const full = Array.from(fb.slice(0, Math.min(fb.length, 200000)))
          .map(b => String.fromCharCode(b)).join('');
        this._parsePdfStreamText(full, parts);
      }

      const deduped = parts.filter((v, i) => v !== parts[i - 1]);
      return deduped.join(' ').replace(/\s+/g, ' ').trim();
    } catch {
      return '';
    }
  },
};
