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
  skipDocumentValidation?: boolean; // Para casos especiales donde queremos omitir la validación
}

export const useUpdateLoadStatusWithValidation = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateLoadStatusParams): Promise<void> => {
      console.log('🔄 useUpdateLoadStatusWithValidation - Actualizando estado:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Validar documentos requeridos si se intenta marcar como 'delivered'
      if (params.newStatus === 'delivered' && !params.skipDocumentValidation) {
        console.log('🔍 Validando documentos requeridos antes de marcar como entregada...');
        
        // Obtener validación de documentos
        const { data: documents, error: docsError } = await supabase.rpc('get_load_documents_with_validation', {
          target_load_id: params.loadId
        });

        if (docsError) {
          console.error('❌ Error obteniendo documentos para validación:', docsError);
          throw new Error('Error verificando documentos requeridos');
        }

        // Verificar si existe Rate Confirmation o Load Order
        const hasRateConfirmation = documents?.some(doc => 
          doc.document_type === 'rate_confirmation' && 
          doc.archived_at === null
        ) || false;

        const hasLoadOrder = documents?.some(doc => 
          doc.document_type === 'load_order' && 
          doc.archived_at === null
        ) || false;

        const hasRequiredWorkDocument = hasLoadOrder || hasRateConfirmation;

        // ✅ SOLO validar que tenga documento de trabajo (RC o LO) - POD NO es requerido para 'delivered'
        if (!hasRequiredWorkDocument) {
          throw new Error('No se puede marcar como entregada: falta el documento Rate Confirmation o Load Order requerido');
        }

        console.log('✅ Validación de documentos exitosa (RC/LO), procediendo con actualización de estado a delivered');
      }

      // Proceder con la actualización del estado
      const { data, error } = await supabase.rpc('update_load_status_with_validation', {
        load_id_param: params.loadId,
        new_status: params.newStatus
      } as { load_id_param: string; new_status: string });

      if (error) {
        console.error('❌ useUpdateLoadStatusWithValidation - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useUpdateLoadStatusWithValidation - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error actualizando estado');
      }

      // Si hay información de ETA o notas y stopId, actualizar la parada
      if (params.stopId && (params.eta || params.notes)) {
        const stopUpdateData: any = {
          last_status_update: new Date().toISOString()
        };

        if (params.eta) {
          // CORREGIDO: Convertir la fecha local del usuario a UTC primero
          const utcDate = new Date(params.eta.getTime() - (params.eta.getTimezoneOffset() * 60000));
          
          // Separar fecha y hora para los nuevos campos (ahora en UTC)
          const etaDate = utcDate.toISOString().split('T')[0];
          const hours = utcDate.getUTCHours().toString().padStart(2, '0');
          const minutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
          const etaTime = `${hours}:${minutes}`;
          
          stopUpdateData.eta_date = etaDate;
          stopUpdateData.eta_time = etaTime;
        }

        if (params.notes) {
          stopUpdateData.driver_notes = params.notes;
        }

        // Si el estado es 'delivered' o 'completed', registrar tiempo real
        if (params.newStatus === 'delivered' || params.newStatus === 'completed') {
          stopUpdateData.completion_datetime = new Date().toISOString();
        } else if (params.newStatus === 'in_transit' || params.newStatus === 'arrived') {
          stopUpdateData.actual_arrival_datetime = new Date().toISOString();
        }

        const { error: stopError } = await supabase
          .from('load_stops')
          .update(stopUpdateData)
          .eq('id', params.stopId);

        if (stopError) {
          console.error('❌ useUpdateLoadStatusWithValidation - Error actualizando parada:', stopError);
          // No lanzamos error para no bloquear la actualización de estado principal
        } else {
          console.log('✅ useUpdateLoadStatusWithValidation - Parada actualizada con ETA/notas');
        }

        // Registrar en historial si hay cambio de estado específico de parada
        if (params.newStatus && params.stopId) {
          const { error: historyError } = await supabase
            .from('load_status_history')
            .insert({
              load_id: params.loadId,
              stop_id: params.stopId,
              new_status: params.newStatus,
              changed_by: user.id,
              notes: params.notes || `ETA updated for stop`,
              eta_provided: params.eta ? new Date(params.eta.getTime() - (params.eta.getTimezoneOffset() * 60000)).toISOString() : null
            });

          if (historyError) {
            console.error('❌ Error registrando historial de parada:', historyError);
          }
        }
      }

      console.log('✅ useUpdateLoadStatusWithValidation - Estado actualizado:', data);
    },
    onSuccess: (_, params) => {
      console.log('✅ useUpdateLoadStatusWithValidation - Estado actualizado para carga:', params.loadId);
      
      // Invalidar las queries relevantes
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['load-document-validation', params.loadId] });
      // Invalidar el historial de estados para esta carga específica
      queryClient.invalidateQueries({ queryKey: ['load-status-history', params.loadId] });
      
      showSuccess('Estado de carga actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ useUpdateLoadStatusWithValidation - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};