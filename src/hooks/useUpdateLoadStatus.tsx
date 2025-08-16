import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

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

      // Si hay información de ETA o notas y stopId, actualizar la parada
      if (params.stopId && (params.eta || params.notes)) {
        const stopUpdateData: any = {
          status_updated_at: new Date().toISOString(),
          status_updated_by: user.id
        };

        if (params.eta) {
          stopUpdateData.estimated_arrival_time = params.eta.toISOString();
        }

        if (params.notes) {
          stopUpdateData.driver_notes = params.notes;
        }

        const { error: stopError } = await supabase
          .from('load_stops')
          .update(stopUpdateData)
          .eq('id', params.stopId);

        if (stopError) {
          console.error('❌ useUpdateLoadStatus - Error actualizando parada:', stopError);
          // No lanzamos error para no bloquear la actualización de estado principal
        } else {
          console.log('✅ useUpdateLoadStatus - Parada actualizada con ETA/notas');
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