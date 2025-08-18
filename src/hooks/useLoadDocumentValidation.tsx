import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoadDocumentValidation {
  hasRateConfirmation: boolean;
  hasLoadOrder: boolean;
  hasRequiredWorkDocument: boolean; // RC o LO
  activeWorkDocument: 'load_order' | 'rate_confirmation' | null; // El documento que tiene prioridad
  missingRequiredDocuments: string[];
  canMarkAsDelivered: boolean;
  canStartWork: boolean; // Nueva validación para que conductor pueda comenzar
}

export const useLoadDocumentValidation = (loadId: string) => {
  return useQuery({
    queryKey: ['load-document-validation', loadId],
    queryFn: async (): Promise<LoadDocumentValidation> => {
      // console.log('🔍 Validating documents for load:', loadId);
      
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

      // Check if Load Order exists
      const hasLoadOrder = documents?.some(doc => 
        doc.document_type === 'load_order' && 
        doc.archived_at === null
      ) || false;

      // Check if POD exists
      const hasPOD = documents?.some(doc => 
        doc.document_type === 'pod' && 
        doc.archived_at === null
      ) || false;

      // Determine active work document (LO has priority over RC)
      const activeWorkDocument = hasLoadOrder ? 'load_order' : 
                               hasRateConfirmation ? 'rate_confirmation' : null;

      // Has at least one required work document (RC or LO)
      const hasRequiredWorkDocument = hasLoadOrder || hasRateConfirmation;

      // Can start work if has either RC or LO
      const canStartWork = hasRequiredWorkDocument;

      // Define required documents for completion (work document + POD)
      const requiredDocuments = [activeWorkDocument, 'pod'].filter(Boolean);
      
      // Only consider non-archived documents for validation
      const activeDocumentTypes = documents
        ?.filter(doc => doc.archived_at === null)
        ?.map(doc => doc.document_type) || [];
      
      const missingRequiredDocuments = requiredDocuments.filter(
        reqDoc => !activeDocumentTypes.includes(reqDoc)
      );

      const canMarkAsDelivered = hasRequiredWorkDocument && hasPOD;

      // console.log('📋 Document validation result:', {
      //   hasRateConfirmation,
      //   hasPOD,
      //   missingRequiredDocuments,
      //   canMarkAsDelivered,
      //   totalDocuments: documents?.length || 0
      // });

      return {
        hasRateConfirmation,
        hasLoadOrder,
        hasRequiredWorkDocument,
        activeWorkDocument,
        missingRequiredDocuments,
        canMarkAsDelivered,
        canStartWork
      };
    },
    enabled: !!loadId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
};