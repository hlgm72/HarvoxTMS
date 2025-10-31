import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface RestoreLoadParams {
  loadId: string;
  notes?: string;
}

export const useRestoreLoad = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RestoreLoadParams): Promise<void> => {
      console.log('🔄 useRestoreLoad - Restaurando carga:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 1. Obtener información de la carga
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select('id, status, driver_user_id, payment_period_id')
        .eq('id', params.loadId)
        .single();

      if (loadError || !loadData) {
        console.error('❌ useRestoreLoad - Error al obtener carga:', loadError);
        throw new Error('No se pudo obtener la información de la carga');
      }

      // Verificar que la carga esté cancelada
      if (loadData.status !== 'cancelled') {
        throw new Error('Solo se pueden restaurar cargas canceladas');
      }

      // 2. Buscar el estado anterior en el historial
      const { data: historyData, error: historyError } = await supabase
        .from('load_status_history')
        .select('previous_status, new_status')
        .eq('load_id', params.loadId)
        .eq('new_status', 'cancelled')
        .order('changed_at', { ascending: false })
        .limit(1)
        .single();

      if (historyError || !historyData?.previous_status) {
        console.error('❌ useRestoreLoad - Error al obtener historial:', historyError);
        throw new Error('No se pudo determinar el estado anterior de la carga');
      }

      const previousStatus = historyData.previous_status;
      console.log('🔄 useRestoreLoad - Estado anterior encontrado:', previousStatus);

      // 3. Cambiar el estado de la carga al estado anterior
      const { error: updateError } = await supabase.rpc('update_load_status_with_validation', {
        load_id_param: params.loadId,
        new_status: previousStatus
      });

      if (updateError) {
        console.error('❌ useRestoreLoad - Error al actualizar estado:', updateError);
        throw new Error(updateError.message);
      }

      // 4. Registrar en el historial
      const { error: historyInsertError } = await supabase
        .from('load_status_history')
        .insert({
          load_id: params.loadId,
          new_status: previousStatus,
          previous_status: 'cancelled',
          notes: params.notes || `Carga restaurada desde estado cancelado a ${previousStatus}`,
          changed_by: user.id
        });

      if (historyInsertError) {
        console.error('⚠️ useRestoreLoad - Error al registrar historial:', historyInsertError);
        // No lanzamos error aquí, ya que el cambio de estado fue exitoso
      }

      // 5. Recalcular payroll si hay driver asignado
      if (loadData.driver_user_id && loadData.payment_period_id) {
        console.log('🔄 useRestoreLoad - Recalculando payroll para driver:', loadData.driver_user_id);
        
        const { error: recalcError } = await supabase.rpc('calculate_user_payment_period_with_validation', {
          calculation_id: loadData.payment_period_id
        });

        if (recalcError) {
          console.error('⚠️ useRestoreLoad - Error al recalcular payroll:', recalcError);
          // No lanzamos error, la carga ya fue restaurada
        }
      }

      console.log('✅ useRestoreLoad - Carga restaurada exitosamente');
    },
    onSuccess: (_, params) => {
      console.log('✅ useRestoreLoad - Restauración completada para carga:', params.loadId);
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['load-status-history'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['driver-calculations'] });
      
      showSuccess('Carga restaurada exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ useRestoreLoad - Error:', error);
      showError(`Error al restaurar carga: ${error.message}`);
    },
  });
};
