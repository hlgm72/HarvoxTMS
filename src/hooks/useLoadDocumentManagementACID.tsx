import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

// Interface for load document data
export interface LoadDocumentData {
  load_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  content_type?: string;
  metadata?: any;
  [key: string]: any;
}

// Interface for the response from Supabase RPC
export interface LoadDocumentACIDResponse {
  success: boolean;
  operation: 'CREATE' | 'UPDATE';
  message: string;
  document: any;
  processed_by: string;
  processed_at: string;
}

// Hook for creating/updating load documents with ACID validation
export const useLoadDocumentManagementACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ 
      documentData, 
      documentId 
    }: { 
      documentData: LoadDocumentData; 
      documentId?: string; 
    }) => {
      console.log('🔄 Executing ACID load document operation...', { documentData, documentId });

      try {
        const { data, error } = await supabase.rpc(
          'create_or_update_load_document_with_validation',
          {
            document_data: documentData,
            document_id: documentId || null
          }
        );

        if (error) {
          console.error('❌ ACID load document error:', error);
          throw new Error(error.message);
        }

        const result = data as unknown as LoadDocumentACIDResponse;
        if (!result?.success) {
          console.error('❌ ACID operation failed:', result);
          throw new Error(result?.message || 'Error in load document operation');
        }

        console.log('✅ ACID load document operation successful:', result);
        return result;
      } catch (error) {
        console.error('❌ Mutation error in load document ACID:', error);
        throw error;
      }
    },
    onSuccess: (data: LoadDocumentACIDResponse) => {
      const operation = data.operation;
      const message = operation === 'CREATE' 
        ? 'Load document created successfully' 
        : 'Load document updated successfully';
      
      showSuccess(message);
      
      // Invalidate relevant cache
      queryClient.invalidateQueries({ queryKey: ['load-documents'] });
      queryClient.invalidateQueries({ queryKey: ['load-document-validation'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error in ACID load document operation:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for handling complete load document upload flow (Storage + Database)
export const useLoadDocumentUploadFlowACID = () => {
  const documentManagement = useLoadDocumentManagementACID();
  const { showError, showSuccess } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({
      file,
      documentData,
      bucketName = 'load-documents'
    }: {
      file: File;
      documentData: Omit<LoadDocumentData, 'file_url' | 'file_size' | 'content_type' | 'file_name'>;
      bucketName?: string;
    }) => {
      console.log('🔄 Starting complete load document upload ACID flow...', { file, documentData });

      // 1. Generate consistent file path for document type (allows replacement)
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentData.document_type}.${fileExt}`;
      const filePath = `${documentData.load_id}/${fileName}`;

      try {
        // 2. Upload to Supabase Storage
        console.log('📁 Uploading file to storage...', filePath);
        const { data: storageData, error: storageError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (storageError) {
          console.error('❌ Storage error:', storageError);
          throw new Error(`Error uploading file: ${storageError.message}`);
        }

        // 3. Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        // 4. Save to database with ACID validation
        const completeDocumentData: LoadDocumentData = {
          load_id: documentData.load_id,
          document_type: documentData.document_type,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
          metadata: documentData.metadata
        };

        const result = await documentManagement.mutateAsync({
          documentData: completeDocumentData
        });

        console.log('✅ Complete ACID flow successful:', result);
        return result;

      } catch (error) {
        // Cleanup: Remove uploaded file if database operation failed
        console.log('🧹 Cleaning up file due to error...', filePath);
        await supabase.storage.from(bucketName).remove([filePath]);
        throw error;
      }
    },
    onSuccess: (data: LoadDocumentACIDResponse) => {
      showSuccess('Load document uploaded and validated successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Error in complete load document flow:', error);
      showError(`Upload error: ${error.message}`);
    },
  });
};