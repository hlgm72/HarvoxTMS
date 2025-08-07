import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface MarkMultipleDriversPaidParams {
  calculationIds: string[];
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

interface MarkMultipleDriversPaidResponse {
  success: boolean;
  message: string;
  success_count: number;
  error_count: number;
  errors: Array<{
    calculation_id: string;
    error: string;
  }>;
  period_closed?: boolean;
  processed_at: string;
}

export const useMarkMultipleDriversPaid = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation<MarkMultipleDriversPaidResponse, Error, MarkMultipleDriversPaidParams>({
    mutationFn: async (params: MarkMultipleDriversPaidParams): Promise<MarkMultipleDriversPaidResponse> => {
      console.log('🔄 useMarkMultipleDriversPaid - Procesando pagos múltiples:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      if (!params.calculationIds || params.calculationIds.length === 0) {
        throw new Error('Debe seleccionar al menos un conductor para pagar');
      }

      const { data, error } = await supabase.rpc('mark_multiple_drivers_as_paid_with_validation', {
        calculation_ids: params.calculationIds,
        payment_method_used: params.paymentMethod || null,
        payment_ref: params.paymentReference || null,
        notes: params.notes || null
      });

      if (error) {
        console.error('❌ useMarkMultipleDriversPaid - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useMarkMultipleDriversPaid - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error procesando pagos múltiples');
      }

      console.log('✅ useMarkMultipleDriversPaid - Pagos procesados exitosamente:', data);
      return data as any as MarkMultipleDriversPaidResponse;
    },
    onSuccess: (data, params) => {
      console.log(`✅ useMarkMultipleDriversPaid - ${data.success_count} pagos procesados exitosamente`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-reports'] });
      
      // Mostrar mensaje de éxito detallado
      if (data.error_count === 0) {
        showSuccess(
          'Pagos procesados exitosamente',
          `Se marcaron ${data.success_count} conductor${data.success_count !== 1 ? 'es' : ''} como pagados${data.period_closed ? '. El período se cerró automáticamente' : ''}`
        );
      } else {
        showSuccess(
          'Pagos procesados con advertencias',
          `${data.success_count} exitosos, ${data.error_count} con errores. Revisa los detalles.`
        );
      }
    },
    onError: (error: Error) => {
      console.error('❌ useMarkMultipleDriversPaid - Error:', error);
      
      // Proporcionar mensajes de error específicos
      let errorMessage = error.message;
      if (errorMessage.includes('Sin permisos')) {
        showError('Sin permisos', 'No tienes autorización para marcar estos conductores como pagados.');
      } else if (errorMessage.includes('Período bloqueado')) {
        showError('Período bloqueado', 'No se pueden procesar pagos en un período bloqueado.');
      } else if (errorMessage.includes('Ya está marcado como pagado')) {
        showError('Conductores ya pagados', 'Algunos conductores ya están marcados como pagados.');
      } else {
        showError('Error procesando pagos', errorMessage);
      }
    },
  });
};