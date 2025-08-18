import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useLoadDocumentValidation } from './useLoadDocumentValidation';

interface UpdateLoadStatusParams {
  loadId: string;
  newStatus: string;
  eta?: Date | null;
  notes?: string;
  stopId?: string;
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

      // Primero actualizar el estado de la carga - especificamos solo los parámetros necesarios
      const { data, error } = await supabase.rpc('update_load_status_with_validation', {
        load_id_param: params.loadId,
        new_status: params.newStatus
      } as { load_id_param: string; new_status: string });

      if (error) {
        console.error('❌ useUpdateLoadStatus - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useUpdateLoadStatus - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error actualizando estado');
      }

      // Actualizar el historial de estado con ETA y notas del conductor
      if (params.eta || params.notes || params.stopId) {
        const historyUpdateData: any = {
          notes: params.notes || null,
          stop_id: params.stopId || null
        };

        if (params.eta) {
          historyUpdateData.eta_provided = params.eta.toISOString();
        }

        // Buscar el registro de historial más reciente para esta carga y actualizarlo
        const { error: historyError } = await supabase
          .from('load_status_history')
          .update(historyUpdateData)
          .eq('load_id', params.loadId)
          .eq('new_status', params.newStatus)
          .order('changed_at', { ascending: false })
          .limit(1);

        if (historyError) {
          console.error('❌ useUpdateLoadStatus - Error actualizando historial:', historyError);
        } else {
          console.log('✅ useUpdateLoadStatus - Historial actualizado con ETA/notas');
        }
      }

      // Opcionalmente actualizar también la parada específica si se proporciona stopId
      // Esto permite cambiar la ETA estimada de la parada, pero no la programada
      if (params.stopId && params.eta) {
        const stopUpdateData: any = {
          last_status_update: new Date().toISOString()
        };

        // Usar formateo seguro de zona horaria para evitar problemas de conversión
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const etaDate = params.eta.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
        const etaTime = params.eta.toLocaleTimeString('en-GB', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: userTimeZone 
        });
        stopUpdateData.eta_date = etaDate;
        stopUpdateData.eta_time = etaTime;

        const { error: stopError } = await supabase
          .from('load_stops')
          .update(stopUpdateData)
          .eq('id', params.stopId);

        if (stopError) {
          console.error('❌ useUpdateLoadStatus - Error actualizando parada:', stopError);
        } else {
          console.log('✅ useUpdateLoadStatus - Parada actualizada con ETA estimada');
        }
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