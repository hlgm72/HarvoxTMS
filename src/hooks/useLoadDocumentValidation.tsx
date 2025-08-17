import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoadDocumentValidation {
  hasRateConfirmation: boolean;
  missingRequiredDocuments: string[];
  canMarkAsDelivered: boolean;
}

export const useLoadDocumentValidation = (loadId: string) => {
  return useQuery({
    queryKey: ['load-document-validation', loadId],
    queryFn: async (): Promise<LoadDocumentValidation> => {
      console.log('🔍 Validating documents for load:', loadId);
      
      // Get load documents using the secure function
      const { data: documents, error } = await supabase.rpc('get_load_documents_with_validation', {
        target_load_id: loadId
      });

      if (error) {
        console.error('❌ Error fetching documents for validation:', error);
        throw new Error(error.message);
      }

      // Check if Rate Confirmation exists
      const hasRateConfirmation = documents?.some(doc => 
        doc.document_type === 'rate_confirmation' && 
        doc.archived_at === null
      ) || false;

      // Define required documents
      const requiredDocuments = ['rate_confirmation'];
      const existingDocumentTypes = documents?.map(doc => doc.document_type) || [];
      
      const missingRequiredDocuments = requiredDocuments.filter(
        reqDoc => !existingDocumentTypes.includes(reqDoc)
      );

      const canMarkAsDelivered = hasRateConfirmation;

      console.log('📋 Document validation result:', {
        hasRateConfirmation,
        missingRequiredDocuments,
        canMarkAsDelivered,
        totalDocuments: documents?.length || 0
      });

      return {
        hasRateConfirmation,
        missingRequiredDocuments,
        canMarkAsDelivered
      };
    },
    enabled: !!loadId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
};