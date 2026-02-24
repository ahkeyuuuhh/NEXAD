import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../config/supabase';
import type { UploadedDocument, ApiResponse } from '../types';

const MAX_FILE_SIZE_MB = parseInt(process.env.EXPO_PUBLIC_MAX_FILE_SIZE_MB || '10');
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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
          contentType: file.mimeType || 'application/pdf',
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
          file_type: fileExt === 'pdf' ? 'pdf' : 'docx',
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
};
