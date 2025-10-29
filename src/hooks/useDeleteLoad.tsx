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
    mutationFn: async (data: { 
      loadId: string; 
      loadNumber: string;
      skipPaidPeriodCheck?: boolean;
    }): Promise<{ 
      loadId: string; 
      loadNumber: string; 
      paymentPeriodId?: string; 
      driverId?: string; 
    }> => {
      console.log('🗑️ useDeleteLoad - Starting ACID deletion for load:', data.loadId);
      
      if (!user) {
        throw new Error(t('list.user_not_authenticated'));
      }

      // Si no se está omitiendo la validación, verificar si es un período pagado
      if (!data.skipPaidPeriodCheck) {
        const { data: loadData, error: loadError } = await supabase
          .from('loads')
          .select(`
            id,
            driver_user_id,
            payment_period_id,
            company_payment_periods!inner(
              id,
              user_payrolls!inner(
                user_id,
                payment_status
              )
            )
          `)
          .eq('id', data.loadId)
          .single();

        if (loadError) {
          console.warn('⚠️ No se pudo validar el período de pago:', loadError);
        } else if (loadData?.driver_user_id && loadData?.payment_period_id) {
          const payrolls = (loadData.company_payment_periods as any)?.user_payrolls || [];
          const driverPayroll = payrolls.find((p: any) => p.user_id === loadData.driver_user_id);
          
          if (driverPayroll && driverPayroll.payment_status === 'paid') {
            const error: any = new Error('Esta carga pertenece a un período de pago ya marcado como pagado.');
            error.isPaidPeriodError = true;
            error.loadData = loadData;
            throw error;
          }
        }
      }

      // Usar la función ACID para eliminar la carga
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
      
      return {
        loadId: data.loadId,
        loadNumber: data.loadNumber,
        paymentPeriodId: (result as any)?.payment_period_id,
        driverId: (result as any)?.driver_id
      };
    },
    onSuccess: async (result, data) => {
      console.log('✅ useDeleteLoad - Eliminación exitosa para:', data.loadId);
      
      // Los triggers automáticos han recalculado todo
      // Solo invalidamos cache para mostrar datos actualizados
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['load', data.loadId] });
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      
      // Refetch inmediato para sincronización rápida
      queryClient.refetchQueries({ queryKey: ['loads'] });
      queryClient.refetchQueries({ queryKey: ['company-payment-periods'] });
      
      // Si había un período de pago y conductor, forzar recálculo adicional
      if (result.paymentPeriodId && result.driverId) {
        try {
          console.log('🔄 Recalculando período después de eliminar carga de período pagado...');
          await supabase.rpc('calculate_user_payment_period_with_validation', {
            calculation_id: result.paymentPeriodId
          });
          console.log('✅ Período recalculado correctamente');
          queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
        } catch (recalcError) {
          console.error('⚠️ Error recalculando período:', recalcError);
        }
      }
      
      console.log('✅ useDeleteLoad - Cache invalidated - triggers handled recalculation');
      
      showSuccess(t('list.delete_success', { loadNumber: data.loadNumber }));
    },
    onError: (error: Error, data) => {
      console.error('❌ useDeleteLoad - Error:', error);
      showError(t('list.delete_error', { message: error.message }));
    },
  });
};