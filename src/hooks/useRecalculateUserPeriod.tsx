import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

interface RecalculateUserPeriodParams {
  userId: string;
  paymentPeriodId?: string;
  loadId?: string;
}

export const useRecalculateUserPeriod = () => {
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecalculateUserPeriodParams): Promise<void> => {
      console.log('🚨 DIAGNÓSTICO: useRecalculateUserPeriod - mutationFn EJECUTADO');
      console.log('🔄 Recalculating user period for:', params);
      console.log('🔍 DIAGNÓSTICO: Parámetros recibidos:', JSON.stringify(params, null, 2));

      let targetCalculationId: string | null = null;

      // If we have a paymentPeriodId, find the calculation directly
      if (params.paymentPeriodId) {
        console.log('🔍 DIAGNÓSTICO: Buscando cálculo con paymentPeriodId:', params.paymentPeriodId);
        const { data: calculation, error: calcError } = await supabase
          .from('user_payrolls')
          .select('id')
          .eq('user_id', params.userId)
          .eq('company_payment_period_id', params.paymentPeriodId)
          .single();

        console.log('🔍 DIAGNÓSTICO: Resultado búsqueda por paymentPeriodId:', { calculation, calcError });

        if (calcError && calcError.code !== 'PGRST116') {
          console.error('❌ Error finding calculation:', calcError);
          throw new Error(`Error buscando cálculo: ${calcError.message}`);
        }

        targetCalculationId = calculation?.id || null;
        console.log('🔍 DIAGNÓSTICO: targetCalculationId desde paymentPeriodId:', targetCalculationId);
      }

      // If we have a loadId but no paymentPeriodId, find it from the load
      if (!targetCalculationId && params.loadId) {
        console.log('🔍 DIAGNÓSTICO: Buscando payment_period_id desde loadId:', params.loadId);
        const { data: load, error: loadError } = await supabase
          .from('loads')
          .select('payment_period_id')
          .eq('id', params.loadId)
          .single();

        console.log('🔍 DIAGNÓSTICO: Resultado búsqueda de carga:', { load, loadError });

        if (loadError) {
          console.error('❌ Error finding load payment period:', loadError);
          throw new Error(`Error buscando período de la carga: ${loadError.message}`);
        }

        if (load?.payment_period_id) {
          console.log('🔍 DIAGNÓSTICO: payment_period_id encontrado:', load.payment_period_id);
          console.log('🔍 DIAGNÓSTICO: Buscando user_payroll para user:', params.userId);
          
          const { data: calculation, error: calcError } = await supabase
            .from('user_payrolls')
            .select('id')
            .eq('user_id', params.userId)
            .eq('company_payment_period_id', load.payment_period_id)
            .single();

          console.log('🔍 DIAGNÓSTICO: Resultado búsqueda de calculation:', { calculation, calcError });

          if (calcError && calcError.code !== 'PGRST116') {
            console.error('❌ Error finding calculation by load:', calcError);
            throw new Error(`Error buscando cálculo por carga: ${calcError.message}`);
          }

          targetCalculationId = calculation?.id || null;
          console.log('🔍 DIAGNÓSTICO: targetCalculationId desde loadId:', targetCalculationId);
        } else {
          console.log('🚨 DIAGNÓSTICO: load.payment_period_id es null/undefined');
        }
      }

      if (!targetCalculationId) {
        console.warn('🚨 DIAGNÓSTICO: No calculation found to recalculate for user:', params.userId);
        console.log('🔍 DIAGNÓSTICO: Parámetros que causaron el fallo:', params);
        console.log('🔍 DIAGNÓSTICO: targetCalculationId final:', targetCalculationId);
        return;
      }

      // Execute the recalculation
      console.log('🚨 DIAGNÓSTICO: EJECUTANDO RECÁLCULO');
      console.log('🔄 Executing recalculation for calculation ID:', targetCalculationId);
      console.log('🔍 DIAGNÓSTICO: Llamando supabase.rpc con calculation_id:', targetCalculationId);
      
      // @ts-ignore - Function exists but types not regenerated yet
      const { data: recalcResult, error: recalcError } = await supabase.rpc(
        'calculate_user_payment_period_with_validation' as any,
        {
          calculation_id: targetCalculationId
        }
      );

      console.log('🔍 DIAGNÓSTICO: Respuesta de RPC:', { recalcResult, recalcError });

      if (recalcError) {
        console.error('❌ Error in recalculation:', recalcError);
        console.error('🚨 DIAGNÓSTICO: Detalles completos del error RPC:', JSON.stringify(recalcError, null, 2));
        throw new Error(`Error en recálculo: ${recalcError.message}`);
      }

      console.log('✅ Recalculation completed successfully:', recalcResult);
      console.log('🚨 DIAGNÓSTICO: RECÁLCULO COMPLETADO EXITOSAMENTE');
    },
    onSuccess: () => {
      console.log('✅ Driver period recalculated successfully');
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-payment-periods-summary'] });
      
      // Refetch immediately for quick UI updates
      queryClient.refetchQueries({ queryKey: ['user-period-calculations'] });
      queryClient.refetchQueries({ queryKey: ['consolidated-drivers'] });
      
      console.log('✅ Recalculation cache invalidated and refetched');
    },
    onError: (error: Error) => {
      console.error('❌ Recalculation failed:', error);
      showError('Error al recalcular período del conductor: ' + error.message);
    }
  });
};