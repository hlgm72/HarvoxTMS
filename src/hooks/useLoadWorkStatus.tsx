import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoadWorkStatus {
  isInProgress: boolean; // Si el conductor ya comenzó a trabajar en la carga
  currentStatus: string;
  canDeleteDocuments: boolean;
  canReplaceRateConfirmation: boolean;
  canRegenerateLoadOrder: boolean;
  protectedDocuments: string[]; // Documentos que no se pueden eliminar
}

export const useLoadWorkStatus = (loadId: string) => {
  return useQuery({
    queryKey: ['load-work-status', loadId],
    queryFn: async (): Promise<LoadWorkStatus> => {
      if (!loadId) {
        return {
          isInProgress: false,
          currentStatus: '',
          canDeleteDocuments: true,
          canReplaceRateConfirmation: true,
          canRegenerateLoadOrder: true,
          protectedDocuments: []
        };
      }

      // Get load status
      const { data: load, error } = await supabase
        .from('loads')
        .select('status')
        .eq('id', loadId)
        .single();

      if (error) {
        console.error('❌ Error fetching load status:', error);
        throw new Error(error.message);
      }

      const currentStatus = load?.status || '';
      
      // Determine if driver has started working (any status beyond 'pending' and 'assigned')
      const workInProgressStatuses = [
        'en_route_pickup',
        'at_pickup', 
        'loaded',
        'en_route_delivery',
        'at_delivery',
        'delivered'
      ];
      
      const isInProgress = workInProgressStatuses.includes(currentStatus);
      
      // Once work is in progress, protect documents
      const protectedDocuments = isInProgress ? ['rate_confirmation', 'load_order'] : [];
      
      return {
        isInProgress,
        currentStatus,
        canDeleteDocuments: !isInProgress, // No se pueden eliminar documentos si está en progreso
        canReplaceRateConfirmation: true, // Siempre se puede reemplazar RC
        canRegenerateLoadOrder: true, // Siempre se puede regenerar LO
        protectedDocuments
      };
    },
    enabled: !!loadId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });
};