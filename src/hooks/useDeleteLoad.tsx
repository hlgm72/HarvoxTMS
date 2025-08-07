import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

export const useDeleteLoad = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loadId: string): Promise<void> => {
      console.log('🗑️ useDeleteLoad - Starting ACID deletion for load:', loadId);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // ✅ USE ACID FUNCTION FOR ATOMIC DELETION
      const { data: result, error: acidError } = await supabase.rpc(
        'delete_load_with_validation',
        {
          load_id_param: loadId
        }
      );

      if (acidError) {
        console.error('❌ useDeleteLoad - ACID function error:', acidError);
        throw new Error(acidError.message);
      }

      if (!(result as any)?.success) {
        throw new Error('La operación de eliminación ACID no fue exitosa');
      }

      console.log('✅ useDeleteLoad - ACID deletion completed:', result);
    },
    onSuccess: (_, loadId) => {
      console.log('✅ useDeleteLoad - Eliminación exitosa para:', loadId);
      
      // Invalidar las queries de cargas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      
      showSuccess('Carga eliminada exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ useDeleteLoad - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};