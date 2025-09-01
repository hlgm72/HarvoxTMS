import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

export const useDeleteLoad = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('loads');

  return useMutation({
    mutationFn: async (data: { loadId: string; loadNumber: string }): Promise<void> => {
      console.log('🗑️ useDeleteLoad - Starting ACID deletion for load:', data.loadId);
      
      if (!user) {
        throw new Error(t('list.user_not_authenticated'));
      }

      // ✅ USE ACID FUNCTION FOR ATOMIC DELETION
      const { data: result, error: acidError } = await supabase.rpc(
        'delete_load_with_validation',
        {
          load_id_param: data.loadId
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
    onSuccess: (_, data) => {
      console.log('✅ useDeleteLoad - Eliminación exitosa para:', data.loadId);
      
      // Invalidar múltiples queries relacionadas con cargas
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['load', data.loadId] });
      
      // Forzar refetch inmediato de las queries de cargas
      queryClient.refetchQueries({ queryKey: ['loads'] });
      
      showSuccess(t('list.delete_success', { loadNumber: data.loadNumber }));
    },
    onError: (error: Error, data) => {
      console.error('❌ useDeleteLoad - Error:', error);
      showError(t('list.delete_error', { message: error.message }));
    },
  });
};