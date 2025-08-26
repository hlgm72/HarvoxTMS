import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

interface ClosePaymentPeriodParams {
  companyPeriodId: string;
}

interface PeriodSummary {
  total_drivers: number;
  paid_drivers: number;
  period_start: string;
  period_end: string;
  frequency: string;
}

interface ClosePaymentPeriodResponse {
  success: boolean;
  message: string;
  period_id: string;
  closed_at: string;
  summary: PeriodSummary;
}

export const useClosePaymentPeriod = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation<ClosePaymentPeriodResponse, Error, ClosePaymentPeriodParams>({
    mutationFn: async (params: ClosePaymentPeriodParams): Promise<ClosePaymentPeriodResponse> => {
      console.log('🔄 useClosePaymentPeriod - Cerrando período:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('close_payment_period_with_validation', {
        company_period_id: params.companyPeriodId
      });

      if (error) {
        console.error('❌ useClosePaymentPeriod - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useClosePaymentPeriod - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error cerrando período de pago');
      }

      console.log('✅ useClosePaymentPeriod - Período cerrado exitosamente:', data);
      return data as any as ClosePaymentPeriodResponse;
    },
    onSuccess: (data, params) => {
      console.log('✅ useClosePaymentPeriod - Cierre completado para período:', params.companyPeriodId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-reports'] });
      
      // Mostrar mensaje de éxito detallado
      const summary = data.summary;
      showSuccess(
        t('payments.period_closed'),
        t('payments.period_closed_desc', { 
          count: summary.paid_drivers, 
          start: summary.period_start, 
          end: summary.period_end 
        })
      );
    },
    onError: (error: Error) => {
      console.error('❌ useClosePaymentPeriod - Error:', error);
      
      // Proporcionar mensajes de error más específicos
      let errorMessage = error.message;
      if (errorMessage.includes('conductores pendientes')) {
        showError(t('payments.cannot_close_pending'), t('payments.cannot_close_pending_desc'));
      } else if (errorMessage.includes('pagos fallidos')) {
        showError(t('payments.cannot_close_failed'), t('payments.cannot_close_failed_desc'));
      } else if (errorMessage.includes('no hay conductores')) {
        showError(t('payments.cannot_close_no_drivers'), t('payments.cannot_close_no_drivers_desc'));
      } else if (errorMessage.includes('permisos de administrador')) {
        showError(t('payments.no_admin_permissions'), t('payments.no_admin_permissions_desc'));
      } else {
        showError(t('payments.closing_period_error'), errorMessage);
      }
    },
  });
};