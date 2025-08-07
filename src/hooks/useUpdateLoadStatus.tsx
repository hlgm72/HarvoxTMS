import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface UpdateLoadStatusParams {
  loadId: string;
  newStatus: string;
}

export const useUpdateLoadStatus = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateLoadStatusParams): Promise<void> => {
      console.log('🔄 useUpdateLoadStatus - Actualizando estado:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('update_load_status_with_validation', {
        load_id_param: params.loadId,
        new_status: params.newStatus
      });

      if (error) {
        console.error('❌ useUpdateLoadStatus - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useUpdateLoadStatus - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error actualizando estado');
      }

      console.log('✅ useUpdateLoadStatus - Estado actualizado:', data);
    },
    onSuccess: (_, params) => {
      console.log('✅ useUpdateLoadStatus - Estado actualizado para carga:', params.loadId);
      
      // Invalidar las queries de cargas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      
      showSuccess('Estado de carga actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ useUpdateLoadStatus - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};