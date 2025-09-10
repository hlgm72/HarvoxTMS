import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface RecalculateDriverPeriodParams {
  driverUserId: string;
  paymentPeriodId?: string;
  loadId?: string;
}

export const useRecalculateDriverPeriod = () => {
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecalculateDriverPeriodParams): Promise<void> => {
      console.log('🔄 Recalculating driver period for:', params);

      let targetCalculationId: string | null = null;

      // If we have a paymentPeriodId, find the calculation directly
      if (params.paymentPeriodId) {
        const { data: calculation, error: calcError } = await supabase
          .from('driver_period_calculations')
          .select('id')
          .eq('driver_user_id', params.driverUserId)
          .eq('company_payment_period_id', params.paymentPeriodId)
          .single();

        if (calcError && calcError.code !== 'PGRST116') {
          console.error('❌ Error finding calculation:', calcError);
          throw new Error(`Error buscando cálculo: ${calcError.message}`);
        }

        targetCalculationId = calculation?.id || null;
      }

      // If we have a loadId but no paymentPeriodId, find it from the load
      if (!targetCalculationId && params.loadId) {
        const { data: load, error: loadError } = await supabase
          .from('loads')
          .select('payment_period_id')
          .eq('id', params.loadId)
          .single();

        if (loadError) {
          console.error('❌ Error finding load payment period:', loadError);
          throw new Error(`Error buscando período de la carga: ${loadError.message}`);
        }

        if (load?.payment_period_id) {
          const { data: calculation, error: calcError } = await supabase
            .from('driver_period_calculations')
            .select('id')
            .eq('driver_user_id', params.driverUserId)
            .eq('company_payment_period_id', load.payment_period_id)
            .single();

          if (calcError && calcError.code !== 'PGRST116') {
            console.error('❌ Error finding calculation by load:', calcError);
            throw new Error(`Error buscando cálculo por carga: ${calcError.message}`);
          }

          targetCalculationId = calculation?.id || null;
        }
      }

      if (!targetCalculationId) {
        console.warn('⚠️ No calculation found to recalculate for driver:', params.driverUserId);
        return;
      }

      // Execute the recalculation
      console.log('🔄 Executing recalculation for calculation ID:', targetCalculationId);
      
      const { data: recalcResult, error: recalcError } = await supabase.rpc(
        'calculate_driver_payment_period_with_validation',
        {
          calculation_id: targetCalculationId
        }
      );

      if (recalcError) {
        console.error('❌ Error in recalculation:', recalcError);
        throw new Error(`Error en recálculo: ${recalcError.message}`);
      }

      console.log('✅ Recalculation completed successfully:', recalcResult);
    },
    onSuccess: () => {
      console.log('✅ Driver period recalculated successfully');
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-payment-periods-summary'] });
      
      // Refetch immediately for quick UI updates
      queryClient.refetchQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.refetchQueries({ queryKey: ['consolidated-drivers'] });
      
      console.log('✅ Recalculation cache invalidated and refetched');
    },
    onError: (error: Error) => {
      console.error('❌ Recalculation failed:', error);
      showError('Error al recalcular período del conductor: ' + error.message);
    }
  });
};