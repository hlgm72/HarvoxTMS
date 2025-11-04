import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useLoadDocumentManagementACID } from '@/hooks/useLoadDocumentManagementACID';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';
import { formatPeriodLabel } from '@/utils/periodUtils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatDateInUserTimeZone, getTodayInUserTimeZone } from '@/lib/dateFormatting';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';
import { useRecalculateUserPeriod } from '@/hooks/useRecalculateUserPeriod';
import { sanitizeText } from '@/lib/securityUtils';

export interface CreateLoadData {
  id?: string;
  mode?: 'create' | 'edit' | 'duplicate';
  load_number: string;
  po_number?: string;
  driver_user_id: string;
  internal_dispatcher_id?: string | null;
  client_id?: string;
  client_contact_id?: string | null;
  total_amount: number;
  commodity?: string;
  weight_lbs?: number;
  notes?: string;
  customer_name?: string;
  factoring_percentage?: number;
  dispatching_percentage?: number;
  leasing_percentage?: number;
  stops?: any[];
  temporaryDocuments?: any[]; // Add temporary documents support
}

// Function to upload temporary documents to storage with custom names
const uploadTemporaryDocuments = async (
  documents: any[], 
  loadId: string, 
  loadNumber: string
): Promise<void> => {
  console.log('📄 uploadTemporaryDocuments - Starting upload process');
  
  for (const doc of documents) {
    try {
      console.log('📄 Processing document:', doc);
      
      // Generate custom filename based on document type and load number
      let customFileName: string;
      switch (doc.type) {
        case 'load_order':
          customFileName = `${loadNumber}_Load_Order.pdf`;
          break;
        case 'rate_confirmation':
          customFileName = `${loadNumber}_Rate_Confirmation.${getFileExtension(doc.fileName)}`;
          break;
        case 'driver_instructions':
          customFileName = `${loadNumber}_Driver_Instructions.${getFileExtension(doc.fileName)}`;
          break;
        case 'bol':
          customFileName = `${loadNumber}_BOL.${getFileExtension(doc.fileName)}`;
          break;
        default:
          customFileName = `${loadNumber}_${doc.fileName}`;
      }

      // Convert blob URL to file
      let file: File;
      if (doc.file) {
        // If we have the original File object
        file = new File([doc.file], customFileName, { type: doc.file.type });
      } else if (doc.url) {
        // If we have a blob URL, fetch it
        const response = await fetch(doc.url);
        const blob = await response.blob();
        const mimeType = blob.type || 'application/octet-stream';
        file = new File([blob], customFileName, { type: mimeType });
      } else {
        console.warn('⚠️ Document has no file or URL, skipping:', doc);
        continue;
      }

      // Create storage path
      const filePath = `${loadId}/${customFileName}`;
      
      console.log('⬆️ Uploading to storage:', filePath, 'for load ID:', loadId);
      
      // Upload to Supabase Storage with upsert option
      const { error: uploadError } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('load-documents')
        .getPublicUrl(filePath);

      console.log('🔗 Generated public URL:', urlData.publicUrl);

      // Save document record in database using RPC
      const { data: docResult, error: dbError } = await supabase.rpc(
        'create_or_update_load_document_with_validation',
        {
          document_data: {
            load_id: loadId,
            document_type: doc.type,
            file_name: customFileName,
            file_url: urlData.publicUrl,
            file_size: file.size,
            content_type: file.type,
          }
        }
      );

      if (dbError) {
        console.error('❌ Database save error:', dbError);
        throw dbError;
      }

      console.log('✅ Document successfully saved:', customFileName);
      
    } catch (error) {
      console.error('❌ Error processing document:', doc, error);
      // Continue with other documents even if one fails
    }
  }
  
  console.log('✅ uploadTemporaryDocuments - All documents processed');
};

// Helper function to get file extension
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
};

export const useCreateLoad = () => {
  const { user, userRole } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('loads');
  const queryClient = useQueryClient();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
  const recalculateUserPeriod = useRecalculateUserPeriod();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const isEdit = data.mode === 'edit' && data.id;
      const mode = isEdit ? 'edit' : 'create';

      // Helper function to convert value to appropriate type
      const toNumber = (value: any): number | null => {
        if (value === '' || value === null || value === undefined) return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      // Helper function to convert to UUID or null
      const toUUID = (value: any): string | null => {
        if (value === '' || value === null || value === undefined) return null;
        return value;
      };

      // Get company_id from user's current role
      if (!userRole?.company_id) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      // Prepare load data for ACID function
      const loadData = {
        ...(isEdit && { id: data.id }),
        load_number: data.load_number,
        po_number: data.po_number || '',
        driver_user_id: toUUID(data.driver_user_id),
        internal_dispatcher_id: data.internal_dispatcher_id || null,
        client_id: toUUID(data.client_id),
        client_contact_id: toUUID(data.client_contact_id),
        total_amount: data.total_amount,
        commodity: data.commodity || '',
        weight_lbs: toNumber(data.weight_lbs),
        notes: data.notes || '',
        customer_name: data.customer_name || '',
        factoring_percentage: toNumber(data.factoring_percentage) ?? 0,
        dispatching_percentage: toNumber(data.dispatching_percentage) ?? 0,
        leasing_percentage: toNumber(data.leasing_percentage) ?? 0
      };

      // Prepare stops data with sanitization
      // ✅ Solo incluir campos que existen en la tabla load_stops
      const stopsData = (data.stops || []).map(stop => ({
        stop_number: stop.stop_number,
        stop_type: stop.stop_type,
        facility_id: stop.facility_id || null,
        special_instructions: sanitizeText(stop.special_instructions || ''),
        driver_notes: sanitizeText(stop.driver_notes || ''),
        scheduled_date: stop.scheduled_date ? 
          (stop.scheduled_date instanceof Date ? 
            formatDateInUserTimeZone(stop.scheduled_date) : 
            stop.scheduled_date) : null,
        scheduled_time: stop.scheduled_time && stop.scheduled_time.trim() !== '' ? stop.scheduled_time.trim() : null,
        actual_date: stop.actual_date ? 
          (stop.actual_date instanceof Date ? 
            formatDateInUserTimeZone(stop.actual_date) : 
            stop.actual_date) : null,
        actual_time: stop.actual_time || null,
        pickup_timezone: stop.pickup_timezone || 'America/New_York',
        delivery_timezone: stop.delivery_timezone || 'America/New_York'
      }));

      // ===============================================
      // 🚨 SISTEMA DE PERÍODOS BAJO DEMANDA v3.0 - CRÍTICO 
      // ⚠️ DELEGAMOS LA CREACIÓN DE PERÍODOS A LA FUNCIÓN SQL
      // ===============================================
      
      // ✅ La función SQL simple_load_operation_with_deductions se encarga de:
      // 1. Crear el período de pago usando create_payment_period_if_needed
      // 2. Crear los user_payment_periods para el usuario correcto
      // 3. Generar las deducciones automáticas

      // ✅ PREPARAR DATOS PARA FUNCIÓN SQL CON FECHAS CORRECTAS
      const stopsWithDates = stopsData.filter(stop => stop.scheduled_date);
      const pickupDate = stopsWithDates.find(stop => stop.stop_type === 'pickup')?.scheduled_date;
      const deliveryDate = stopsWithDates.find(stop => stop.stop_type === 'delivery')?.scheduled_date || 
                          stopsWithDates[stopsWithDates.length - 1]?.scheduled_date;
      
      const loadDataForRPC = {
        ...loadData,
        pickup_date: pickupDate || null,
        delivery_date: deliveryDate || null,
        ...(isEdit && data.id && { id: data.id }) // Include ID for edit mode
      };
      
      // ✅ CREAR/ACTUALIZAR CARGA CON PERÍODOS Y CÁLCULOS AUTOMÁTICOS
      let loadResult: any;
      let loadError: any;
      
      try {
        const rpcResponse = await supabase.rpc(
          'simple_load_operation_with_deductions',
          {
            load_data: loadDataForRPC,
            stops_data: stopsData,
            load_id_param: isEdit ? data.id : null
          }
        );
        
        loadResult = rpcResponse.data;
        loadError = rpcResponse.error;

        if (loadError) {
          console.error('❌ ERROR RPC:', {
            message: loadError.message,
            details: loadError.details,
            hint: loadError.hint,
            code: loadError.code
          });
          
          if (loadError.message.includes('ya existe')) {
            throw new Error(loadError.message);
          }
          throw new Error(`Error en operación de carga: ${loadError.message}`);
        }

        if (!loadResult) {
          throw new Error('Load operation completed but no data returned');
        }
        
      } catch (rpcError) {
        console.error('❌ ========== ERROR EN RPC CALL ==========');
        console.error('❌ Error completo:', rpcError);
        console.error('❌ Stack trace:', rpcError instanceof Error ? rpcError.stack : 'No stack');
        throw rpcError;
      }

      if (!(loadResult as any)?.success) {
        console.error('❌ useCreateLoad - Load operation failed. Result:', loadResult);
        
        // Interceptar errores de período pagado con formato especial
        const errorMsg = (loadResult as any)?.error || '';
        if (errorMsg.includes('PAID_PERIOD_IMMUTABLE')) {
          const parts = errorMsg.split('|');
          if (parts.length === 3) {
            const [, startDate, endDate] = parts;
            const periodLabel = formatPeriodLabel(startDate, endDate);
            const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
            const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');
            
            throw new Error(t('validation.paid_period_immutable_message', {
              periodLabel,
              startDate: formattedStartDate,
              endDate: formattedEndDate
            }));
          }
        }
        
        throw new Error(`La operación de carga no fue exitosa. Detalle: ${JSON.stringify(loadResult)}`);
      }

      const loadId = (loadResult as any).load?.id || data.id;

      // Handle temporary documents upload (outside ACID transaction for performance)
      if (data.temporaryDocuments && data.temporaryDocuments.length > 0) {
        try {
          await uploadTemporaryDocuments(data.temporaryDocuments, loadId, data.load_number);
        } catch (uploadError) {
          console.error('❌ useCreateLoad - Error uploading documents:', uploadError);
          // Don't fail the whole operation for document errors
        }
      }

      // 🚨 CRÍTICO: Si se asignó un conductor, cambiar estado a 'assigned'
      if (data.driver_user_id) {
        console.log('🔄 Driver asignado, actualizando estado a "assigned"...');
        try {
          const { data: statusResult, error: statusError } = await supabase.rpc('update_load_status_with_validation', {
            load_id_param: loadId,
            new_status: 'assigned'
          });

          if (statusError) {
            console.error('❌ Error RPC actualizando estado a assigned:', statusError);
            throw new Error(`Error al actualizar estado: ${statusError.message}`);
          }
          
          // Verificar si la función SQL reportó éxito
          const result = statusResult as { success: boolean; message?: string };
          if (!result?.success) {
            console.error('❌ La función SQL falló:', result);
            throw new Error(`No se pudo actualizar el estado a "assigned": ${result?.message || 'Error desconocido'}`);
          }
          
          console.log('✅ Estado actualizado a "assigned" exitosamente');
        } catch (statusUpdateError) {
          console.error('❌ Error crítico en actualización de estado:', statusUpdateError);
          // Lanzar el error para que el usuario lo vea
          throw statusUpdateError;
        }
      }

      return loadId;
    },
    onSuccess: async (loadId, variables) => {
      const isEdit = variables.mode === 'edit';

      // If editing and driver is assigned, recalculate their payment period
      if (isEdit && variables.driver_user_id) {
        try {
          await recalculateUserPeriod.mutateAsync({
            userId: variables.driver_user_id,
            loadId: loadId
          });
        } catch (recalcError) {
          console.error('Error recalculating user period:', recalcError);
          // Don't fail the main operation, just log the error
        }
      }
      
      // Standard cache invalidations
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['load-stops'] });
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-payment-periods-summary'] });
      queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
      queryClient.invalidateQueries({ queryKey: ['available-weeks'] });
      
      // Refetch inmediato para sincronización rápida
      await queryClient.refetchQueries({ queryKey: ['loads'] });
    },
    onError: (error: Error, variables) => {
      // Traducir errores técnicos a mensajes amigables
      let errorMessage = 'No se pudo guardar la carga. Inténtalo de nuevo.';
      
      if (error.message.includes('loads_load_number_unique') || error.message.includes('duplicate key')) {
        errorMessage = `El número "${variables.load_number}" ya está en uso. Por favor ingresa un número diferente.`;
      } else if (error.message.includes('permission') || error.message.includes('policy')) {
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (error.message.includes('foreign key') || error.message.includes('violates')) {
        errorMessage = 'Algunos datos seleccionados no son válidos. Verifica la información.';
      } else if (error.message.includes('not null')) {
        errorMessage = 'Faltan campos obligatorios por completar.';
      }
      
      showError(errorMessage);
    },
  });
};