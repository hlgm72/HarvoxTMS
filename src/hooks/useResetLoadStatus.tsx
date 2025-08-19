import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

export const useResetLoadStatus = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loadId: string): Promise<void> => {
      console.log('🔄 useResetLoadStatus - Reseteando estado de carga:', loadId);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('reset_load_status_to_assigned', {
        load_id_param: loadId
      });

      if (error) {
        console.error('❌ useResetLoadStatus - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useResetLoadStatus - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error reseteando estado de carga');
      }

      console.log('✅ useResetLoadStatus - Estado reseteado:', data);
    },
    onSuccess: (_, loadId) => {
      console.log('✅ useResetLoadStatus - Estado reseteado exitosamente para carga:', loadId);
      
      // Invalidar las queries de cargas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['load-status-history'] });
      
      showSuccess('Estado de la carga reseteado a "assigned" exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ useResetLoadStatus - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};