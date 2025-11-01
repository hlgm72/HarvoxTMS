import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useLoadDocumentValidation } from './useLoadDocumentValidation';
import { formatDateSafe } from '@/lib/dateFormatting';

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

      // ========== VALIDACIONES PARA CANCELACIÓN ==========
      let previousStatus: string | null = null;
      
      if (params.newStatus === 'cancelled') {
        console.log('🔍 Validando cancelación de carga...');
        
        // Obtener datos de la carga para validaciones
        const { data: loadData, error: loadError } = await supabase
          .from('loads')
          .select('status, payment_status, driver_user_id, payment_period_id')
          .eq('id', params.loadId)
          .single();

        if (loadError) {
          console.error('❌ Error obteniendo datos de la carga:', loadError);
          throw new Error('Error verificando datos de la carga');
        }

        if (!loadData) {
          throw new Error('Carga no encontrada');
        }

        // Guardar el estado anterior para el historial
        previousStatus = loadData.status;
        console.log('📝 Estado anterior guardado:', previousStatus);

        // 1. Validación de estado operativo: solo 'created' o 'assigned'
        const allowedStatuses = ['created', 'assigned'];
        if (!allowedStatuses.includes(loadData.status)) {
          throw new Error(`No se puede cancelar una carga con estado "${loadData.status}". Solo se pueden cancelar cargas en estado "Created" o "Assigned".`);
        }
        console.log('✅ Validación de estado operativo pasada');

        // 2. Validación de estado financiero: no debe estar 'applied'
        if (loadData.payment_status === 'applied') {
          throw new Error('No se puede cancelar esta carga porque el payroll ya está pagado (estado: Applied).');
        }
        console.log('✅ Validación de estado financiero pasada');

        // 3. Validación de período pagado/bloqueado (si tiene driver y período)
        if (loadData.driver_user_id && loadData.payment_period_id) {
          console.log('🔍 Validando período de pago...');
          
          const { data: validationData, error: validationError } = await supabase.rpc(
            'can_modify_financial_data_with_user_check',
            {
              period_id: loadData.payment_period_id,
              user_id_param: loadData.driver_user_id
            }
          );

          if (validationError) {
            console.error('❌ Error validando período de pago:', validationError);
            throw new Error('Error verificando el estado del período de pago');
          }

          const validation = validationData as any;

          // Verificar si el período está bloqueado
          if (validation?.is_locked) {
            throw new Error('No se puede cancelar esta carga porque el período de pago está bloqueado.');
          }

          // Verificar si el conductor ya está pagado
          if (validation?.driver_is_paid) {
            throw new Error('No se puede cancelar esta carga porque el conductor ya está pagado en este período.');
          }

          console.log('✅ Validación de período de pago pasada');
        }

        console.log('✅ Todas las validaciones de cancelación pasadas');
      }
      // ========== FIN VALIDACIONES PARA CANCELACIÓN ==========

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
          // ✅ CORREGIDO: Usar funciones centralizadas para formatear fechas UTC
          const utcDate = new Date(params.eta.getTime() - (params.eta.getTimezoneOffset() * 60000));
          
          // Separar fecha y hora para los nuevos campos (ahora en UTC)
          const etaDate = formatDateSafe(utcDate, 'yyyy-MM-dd');
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

      // 🔄 Registrar en historial si el cambio es una cancelación (incluso sin stopId)
      if (params.newStatus === 'cancelled') {
        console.log('📝 Registrando cancelación en historial...');
        const { error: historyError } = await supabase
          .from('load_status_history')
          .insert({
            load_id: params.loadId,
            new_status: params.newStatus,
            previous_status: previousStatus,
            changed_by: user.id,
            notes: params.notes || 'Carga cancelada'
          });

        if (historyError) {
          console.error('❌ Error registrando historial de cancelación:', historyError);
        } else {
          console.log('✅ Cancelación registrada en historial con previous_status:', previousStatus);
        }
      }

      // 🔄 Si la carga fue CANCELADA, recalcular el payroll del driver
      if (params.newStatus === 'cancelled') {
        console.log('🔄 Carga cancelada - recalculando payroll del driver...');
        
        // Obtener información de la carga para recalcular payroll
        const { data: loadData, error: loadError } = await supabase
          .from('loads')
          .select('driver_user_id, payment_period_id')
          .eq('id', params.loadId)
          .single();

        if (loadError) {
          console.error('❌ Error obteniendo datos de la carga para recalcular:', loadError);
          // No lanzar error para no bloquear la cancelación
        } else if (loadData?.driver_user_id && loadData?.payment_period_id) {
          console.log('🔍 Datos de carga obtenidos:', {
            driver: loadData.driver_user_id,
            period: loadData.payment_period_id
          });

          // Buscar el user_payroll correspondiente
          const { data: userPayroll, error: payrollError } = await supabase
            .from('user_payrolls')
            .select('id')
            .eq('user_id', loadData.driver_user_id)
            .eq('company_payment_period_id', loadData.payment_period_id)
            .single();

          if (payrollError) {
            console.error('❌ Error obteniendo user_payroll:', payrollError);
          } else if (userPayroll) {
            console.log('🔄 Recalculando payroll con ID:', userPayroll.id);
            
            // Recalcular el payroll
            const { error: recalcError } = await supabase.rpc(
              'calculate_user_payment_period_with_validation',
              { calculation_id: userPayroll.id }
            );

            if (recalcError) {
              console.error('❌ Error recalculando payroll después de cancelar:', recalcError);
            } else {
              console.log('✅ Payroll recalculado exitosamente después de cancelar la carga');
            }
          }
        }
      }

      console.log('✅ useUpdateLoadStatusWithValidation - Estado actualizado:', data);
    },
    onSuccess: (_, params) => {
      console.log('✅ useUpdateLoadStatusWithValidation - Estado actualizado para carga:', params.loadId);
      
      // Invalidar las queries relevantes
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      // 🚨 CRÍTICO - Invalidar resúmenes de períodos para reflejar recálculos automáticos
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-payment-periods-summary'] });
      queryClient.invalidateQueries({ queryKey: ['load-document-validation', params.loadId] });
      // Invalidar el historial de estados para esta carga específica
      queryClient.invalidateQueries({ queryKey: ['load-status-history', params.loadId] });
      queryClient.invalidateQueries({ queryKey: ['user-payrolls'] }); // Actualizar Available Payment Reports
      
      showSuccess('Estado de carga actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ useUpdateLoadStatusWithValidation - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};