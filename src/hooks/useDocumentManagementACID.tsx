import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

// Types for ACID operations
export interface DocumentData {
  company_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  content_type?: string;
  issue_date?: string;
  expires_at?: string;
  notes?: string;
  is_active?: boolean;
  [key: string]: any;
}

// Response types
interface DocumentACIDResponse {
  success: boolean;
  operation?: string;
  message?: string;
  document?: any;
  document_id?: string;
  archive_reason?: string;
  [key: string]: any;
}

// Hook for creating/updating documents with ACID validation
export const useDocumentManagementACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ 
      documentData, 
      documentId 
    }: { 
      documentData: DocumentData; 
      documentId?: string; 
    }) => {
      console.log('🔄 Ejecutando operación ACID de documento...', { documentData, documentId });

      const { data, error } = await supabase.rpc(
        'create_or_update_document_with_validation',
        {
          document_data: documentData,
          document_id: documentId || null
        }
      );

      if (error) {
        console.error('❌ Error ACID documento:', error);
        throw new Error(error.message);
      }

      const result = data as DocumentACIDResponse;
      if (!result?.success) {
        console.error('❌ Operación ACID falló:', result);
        throw new Error(result?.message || 'Error en operación de documento');
      }

      console.log('✅ Operación ACID documento exitosa:', result);
      return result;
    },
    onSuccess: (data: DocumentACIDResponse) => {
      const operation = data.operation;
      const message = operation === 'CREATE' 
        ? 'Documento creado exitosamente' 
        : 'Documento actualizado exitosamente';
      
      showSuccess(message);
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en operación ACID de documento:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for archiving documents with ACID validation
export const useArchiveDocumentACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      archiveReason 
    }: { 
      documentId: string; 
      archiveReason?: string; 
    }) => {
      console.log('🔄 Ejecutando archivo ACID de documento...', { documentId, archiveReason });

      const { data, error } = await supabase.rpc(
        'archive_document_with_validation',
        {
          document_id_param: documentId,
          archive_reason: archiveReason || 'Manual archive'
        }
      );

      if (error) {
        console.error('❌ Error ACID archivo documento:', error);
        throw new Error(error.message);
      }

      const result = data as DocumentACIDResponse;
      if (!result?.success) {
        console.error('❌ Archivo ACID falló:', result);
        throw new Error(result?.message || 'Error en archivo de documento');
      }

      console.log('✅ Archivo ACID documento exitoso:', result);
      return result;
    },
    onSuccess: (data: DocumentACIDResponse) => {
      showSuccess('Documento archivado exitosamente');
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en archivo ACID de documento:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for restoring archived documents with ACID validation
export const useRestoreDocumentACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (documentId: string) => {
      console.log('🔄 Ejecutando restauración ACID de documento...', documentId);

      const { data, error } = await supabase.rpc(
        'restore_document_with_validation',
        { document_id_param: documentId }
      );

      if (error) {
        console.error('❌ Error ACID restauración documento:', error);
        throw new Error(error.message);
      }

      const result = data as DocumentACIDResponse;
      if (!result?.success) {
        console.error('❌ Restauración ACID falló:', result);
        throw new Error(result?.message || 'Error en restauración de documento');
      }

      console.log('✅ Restauración ACID documento exitosa:', result);
      return result;
    },
    onSuccess: (data: DocumentACIDResponse) => {
      showSuccess('Documento restaurado exitosamente');
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en restauración ACID de documento:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for handling complete document upload flow (Storage + Database)
export const useDocumentUploadFlowACID = () => {
  const documentManagement = useDocumentManagementACID();
  const { showError, showSuccess } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({
      file,
      documentData,
      bucketName = 'company-documents'
    }: {
      file: File;
      documentData: Omit<DocumentData, 'file_url' | 'file_size' | 'content_type' | 'file_name'>;
      bucketName?: string;
    }) => {
      console.log('🔄 Iniciando flujo completo de upload ACID...', { file, documentData });

      // 1. Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${documentData.company_id}/${documentData.document_type}/${fileName}`;

      try {
        // 2. Upload to Supabase Storage
        console.log('📁 Subiendo archivo a storage...', filePath);
        const { data: storageData, error: storageError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (storageError) {
          console.error('❌ Error de storage:', storageError);
          throw new Error(`Error al subir archivo: ${storageError.message}`);
        }

        // 3. Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        // 4. Save to database with ACID validation
        const completeDocumentData: DocumentData = {
          company_id: documentData.company_id,
          document_type: documentData.document_type,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
          issue_date: documentData.issue_date,
          expires_at: documentData.expires_at,
          notes: documentData.notes,
          is_active: documentData.is_active
        };

        const result = await documentManagement.mutateAsync({
          documentData: completeDocumentData
        });

        console.log('✅ Flujo completo ACID exitoso:', result);
        return result;

      } catch (error) {
        // Cleanup: Remove uploaded file if database operation failed
        console.log('🧹 Limpiando archivo por error...', filePath);
        await supabase.storage.from(bucketName).remove([filePath]);
        throw error;
      }
    },
    onSuccess: (data: DocumentACIDResponse) => {
      showSuccess('Documento subido y validado exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ Error en flujo completo de documento:', error);
      showError(`Error en upload: ${error.message}`);
    },
  });
};