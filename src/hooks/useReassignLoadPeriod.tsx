import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface ReassignLoadPeriodParams {
  loadId: string;
  newPeriodId: string;
}

export const useReassignLoadPeriod = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReassignLoadPeriodParams): Promise<void> => {
      console.log('🔄 useReassignLoadPeriod - Reasignando carga:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('reassign_load_payment_period', {
        load_id_param: params.loadId,
        target_company_period_id: params.newPeriodId
      });

      if (error) {
        console.error('❌ useReassignLoadPeriod - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useReassignLoadPeriod - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error en la reasignación');
      }

      console.log('✅ useReassignLoadPeriod - Reasignación exitosa:', data);
    },
    onSuccess: (_, params) => {
      console.log('✅ useReassignLoadPeriod - Reasignación completada para carga:', params.loadId);
      
      // Invalidar las queries de cargas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      
      showSuccess('Carga reasignada exitosamente al nuevo período');
    },
    onError: (error: Error) => {
      console.error('❌ useReassignLoadPeriod - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};