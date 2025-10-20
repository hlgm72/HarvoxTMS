import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useLoadDocumentManagementACID } from '@/hooks/useLoadDocumentManagementACID';
import { useFleetNotifications } from '@/components/notifications';
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
  const queryClient = useQueryClient();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
  const recalculateUserPeriod = useRecalculateUserPeriod();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      console.log('🚚 ========== INICIO MUTACIÓN useCreateLoad ==========');
      console.log('📦 Datos completos de entrada:', JSON.stringify(data, null, 2));
      console.log('🔍 Modo:', data.mode);
      console.log('🔍 ID de carga:', data.id);
      console.log('🔍 Driver User ID:', data.driver_user_id);
      console.log('🔍 Dispatcher ID being sent:', data.internal_dispatcher_id);
      console.log('🔍 Mapped to internal_dispatcher_id:', data.internal_dispatcher_id || '');
      console.log('🔍 Raw data object:', JSON.stringify(data, null, 2));
      
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

      console.log('🔍 useCreateLoad - Final loadData being sent to RPC:', loadData);
      console.log('🔍 useCreateLoad - Client contact ID being sent:', loadData.client_contact_id);
      console.log('🔍 useCreateLoad - Dispatcher in loadData:', loadData.internal_dispatcher_id);
      
      // Prepare stops data with sanitization
      const stopsData = (data.stops || []).map(stop => ({
        stop_number: stop.stop_number,
        stop_type: stop.stop_type,
        company_name: sanitizeText(stop.company_name || ''),
        address: sanitizeText(stop.address || ''),
        city: sanitizeText(stop.city || ''),
        state: stop.state,
        zip_code: sanitizeText(stop.zip_code || ''),
        reference_number: sanitizeText(stop.reference_number || ''),
        contact_name: sanitizeText(stop.contact_name || ''),
        contact_phone: stop.contact_phone || '',
        special_instructions: sanitizeText(stop.special_instructions || ''),
        scheduled_date: stop.scheduled_date ? 
          (stop.scheduled_date instanceof Date ? 
            formatDateInUserTimeZone(stop.scheduled_date) : 
            stop.scheduled_date) : null,
        // ✅ CORREGIDO: Enviar null para campos de tiempo vacíos en lugar de cadena vacía
        scheduled_time: stop.scheduled_time && stop.scheduled_time.trim() !== '' ? stop.scheduled_time.trim() : null,
        actual_date: stop.actual_date ? 
          (stop.actual_date instanceof Date ? 
            formatDateInUserTimeZone(stop.actual_date) : 
            stop.actual_date) : null
      }));

      console.log('🔍 useCreateLoad - Stops data being sent to RPC:', stopsData);
      console.log('🔍 useCreateLoad - Number of stops:', stopsData.length);

      // ===============================================
      // 🚨 SISTEMA DE PERÍODOS BAJO DEMANDA v3.0 - CRÍTICO 
      // ⚠️ DELEGAMOS LA CREACIÓN DE PERÍODOS A LA FUNCIÓN SQL
      // ===============================================
      console.log('🔍 useCreateLoad - Delegating payment period creation to SQL function');
      
      // ✅ VALIDACIÓN: Verificar que hay conductor asignado para cálculos correctos
      if (!data.driver_user_id) {
        console.warn('⚠️ useCreateLoad - No driver assigned, period calculations may be incomplete');
      }
      
      // ✅ La función SQL simple_load_operation_with_deductions se encarga de:
      // 1. Crear el período de pago usando create_payment_period_if_needed
      // 2. Crear los user_payment_periods para el usuario correcto
      // 3. Generar las deducciones automáticas
      console.log('✅ useCreateLoad - Payment period creation delegated to SQL function');

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
      console.log('📞 ========== LLAMANDO RPC ==========');
      console.log('🔍 Función: simple_load_operation_with_deductions');
      console.log('🔍 Parámetros completos:', {
        operation_type: isEdit ? 'UPDATE' : 'CREATE',
        has_driver: !!loadDataForRPC.driver_user_id,
        pickup_date: loadDataForRPC.pickup_date,
        delivery_date: loadDataForRPC.delivery_date,
        load_data: loadDataForRPC,
        stops_data: stopsData,
        load_id_param: isEdit ? data.id : null
      });
      
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

        console.log('📞 ========== RESPUESTA RPC ==========');
        console.log('📊 Data recibida:', JSON.stringify(loadResult, null, 2));
        console.log('📊 Error recibido:', loadError);

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
          console.error('❌ ERROR: RPC sin error pero data es null/undefined');
          throw new Error('Load operation completed but no data returned');
        }

        console.log('✅ RPC EXITOSO');
        
      } catch (rpcError) {
        console.error('❌ ========== ERROR EN RPC CALL ==========');
        console.error('❌ Error completo:', rpcError);
        console.error('❌ Stack trace:', rpcError instanceof Error ? rpcError.stack : 'No stack');
        throw rpcError;
      }

      console.log('🔍 useCreateLoad - Load operation result:', JSON.stringify(loadResult, null, 2));
      
      if (!(loadResult as any)?.success) {
        console.error('❌ useCreateLoad - Load operation failed. Result:', loadResult);
        throw new Error(`La operación de carga no fue exitosa. Detalle: ${JSON.stringify(loadResult)}`);
      }

      const loadId = (loadResult as any).load?.id || data.id;

      // ✅ Log de deducciones automáticas generadas
      if ((loadResult as any)?.automatic_deductions) {
        const deductions = (loadResult as any).automatic_deductions;
        console.log('✅ useCreateLoad - Automatic deductions generated:', deductions);
      }

      // Handle temporary documents upload (outside ACID transaction for performance)
      if (data.temporaryDocuments && data.temporaryDocuments.length > 0) {
        console.log('📄 useCreateLoad - Processing temporary documents post-ACID');
        try {
          await uploadTemporaryDocuments(data.temporaryDocuments, loadId, data.load_number);
          console.log('✅ useCreateLoad - Temporary documents uploaded successfully');
        } catch (uploadError) {
          console.error('❌ useCreateLoad - Error uploading documents:', uploadError);
          // Don't fail the whole operation for document errors
          console.warn('⚠️ useCreateLoad - Continuing despite document upload errors');
        }
      }

      console.log('🚚 ========== MUTACIÓN COMPLETADA EXITOSAMENTE ==========');
      console.log('🆔 Load ID retornado:', loadId);
      return loadId;
    },
    onSuccess: async (loadId, variables) => {
      console.log('🎉 ========== ON SUCCESS EJECUTADO ==========');
      console.log('🎉 Load ID recibido:', loadId);
      console.log('🎉 Variables completas:', JSON.stringify(variables, null, 2));
      console.log('🔍 Modo:', variables.mode);
      console.log('🔍 Driver User ID:', variables.driver_user_id);
      console.log('🔍 Load ID original:', variables.id);
      console.log('🔍 typeof loadId:', typeof loadId);
      console.log('🔍 loadId value:', loadId);
      
      const isEdit = variables.mode === 'edit';
      console.log('🔍 ¿Es edición?', isEdit);
      
      // Verificar estado del hook de recálculo
      console.log('🔍 ========== VERIFICANDO HOOK RECÁLCULO ==========');
      console.log('🔍 recalculateUserPeriod disponible:', !!recalculateUserPeriod);
      console.log('🔍 recalculateUserPeriod.mutateAsync disponible:', !!recalculateUserPeriod?.mutateAsync);
      console.log('🔍 recalculateUserPeriod.isPending:', recalculateUserPeriod?.isPending);
      console.log('🔍 recalculateUserPeriod.error:', recalculateUserPeriod?.error);
      
      // Check recalculation conditions
      console.log('🔍 ========== VERIFICANDO CONDICIONES PARA RECÁLCULO ==========');
      console.log('🔍 isEdit:', isEdit);
      console.log('🔍 variables.driver_user_id:', variables.driver_user_id);
      console.log('🔍 typeof recalculateUserPeriod:', typeof recalculateUserPeriod);
      console.log('🔍 recalculateUserPeriod.mutateAsync:', typeof recalculateUserPeriod?.mutateAsync);

      // If editing and driver is assigned, recalculate their payment period
      if (isEdit && variables.driver_user_id) {
        console.log('🔄 ========== INICIANDO RECÁLCULO ==========');
        console.log('🔄 Condiciones cumplidas para recálculo automático');
        
        const recalculateParams = {
          userId: variables.driver_user_id,
          loadId: loadId
        };
        
        console.log('🔄 Parámetros de recálculo:', JSON.stringify(recalculateParams, null, 2));
        
        try {
          console.log('🔄 Llamando recalculateUserPeriod.mutateAsync...');
          const recalcResult = await recalculateUserPeriod.mutateAsync(recalculateParams);
          console.log('✅ User period recalculated automatically');
          console.log('✅ Resultado del recálculo:', recalcResult);
        } catch (recalcError) {
          console.error('❌ ========== ERROR EN RECÁLCULO ==========');
          console.error('❌ Error completo:', recalcError);
          console.error('❌ Error message:', recalcError instanceof Error ? recalcError.message : 'Unknown error');
          console.error('❌ Stack trace:', recalcError instanceof Error ? recalcError.stack : 'No stack');
          // Don't fail the main operation, just log the error
        }
      } else {
        console.log('🚫 ========== RECÁLCULO NO EJECUTADO ==========');
        console.log('🚫 Razones de no ejecución:');
        console.log('   - isEdit:', isEdit, '(debe ser true)');
        console.log('   - driver_user_id:', variables.driver_user_id, '(debe existir)');
        console.log('   - recalculateUserPeriod disponible:', !!recalculateUserPeriod);
        if (!isEdit) {
          console.log('🚫 No es modo edición');
        }
        if (!variables.driver_user_id) {
          console.log('🚫 No hay conductor asignado');
        }
      }
      
      // Standard cache invalidations
      console.log('🔄 Invalidando queries...');
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
      
      // Refetch inmediato para sincronización rápida
      await queryClient.refetchQueries({ queryKey: ['loads'] });
      console.log('✅ Queries invalidadas');
      
      console.log('🎉 ========== ON SUCCESS COMPLETADO ==========');
    },
    onError: (error: Error, variables) => {
      console.error('💥 ========== ON ERROR EJECUTADO ==========');
      console.error('💥 Error completo:', error);
      console.error('💥 Error message:', error.message);
      console.error('💥 Error stack:', error.stack);
      console.error('💥 Variables que causaron error:', JSON.stringify(variables, null, 2));
      console.error('💥 Tipo de error:', error.constructor.name);
      
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
      console.error('💥 ========== ON ERROR COMPLETADO ==========');
    },
  });
};