import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useLoadDocumentManagementACID } from '@/hooks/useLoadDocumentManagementACID';
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';
import { formatDateInUserTimeZone, getTodayInUserTimeZone } from '@/lib/dateFormatting';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';

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

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      // Starting ACID mutation with data
      
      console.log('🔍 useCreateLoad - Received data for mutation:', data);
      console.log('🔍 useCreateLoad - Dispatcher ID being sent:', data.internal_dispatcher_id);
      console.log('🔍 useCreateLoad - Mapped to internal_dispatcher_id:', data.internal_dispatcher_id || '');
      console.log('🔍 useCreateLoad - Raw data object:', JSON.stringify(data, null, 2));
      
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
      
      // Prepare stops data
      const stopsData = (data.stops || []).map(stop => ({
        stop_number: stop.stop_number,
        stop_type: stop.stop_type,
        company_name: stop.company_name,
        address: stop.address,
        city: stop.city,
        state: stop.state,
        zip_code: stop.zip_code,
        reference_number: stop.reference_number || '',
        contact_name: stop.contact_name || '',
        contact_phone: stop.contact_phone || '',
        special_instructions: stop.special_instructions || '',
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
      // 2. Crear los driver_period_calculations para el conductor correcto
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
      console.log('🔍 useCreateLoad - Calling SQL function with data:', {
        operation_type: isEdit ? 'UPDATE' : 'CREATE',
        has_driver: !!loadDataForRPC.driver_user_id,
        pickup_date: loadDataForRPC.pickup_date,
        delivery_date: loadDataForRPC.delivery_date
      });
      
      const { data: loadResult, error: loadError } = await supabase.rpc(
        'simple_load_operation_with_deductions',
        {
          load_data: loadDataForRPC,
          stops_data: stopsData,
          load_id: isEdit ? data.id : null
        }
      );

      if (loadError) {
        console.error('❌ useCreateLoad - Load operation error:', loadError);
        
        if (loadError.message.includes('ya existe')) {
          throw new Error(loadError.message);
        }
        throw new Error(`Error en operación de carga: ${loadError.message}`);
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

      console.log('✅ useCreateLoad - ACID operation completed successfully');
      return loadId;
    },
    onSuccess: async (loadId, variables) => {
      console.log('✅ useCreateLoad - Mutation successful, load ID:', loadId);
      
      // Los triggers automáticos se encargan del recálculo completo
      // Solo necesitamos invalidar el cache para mostrar datos actualizados
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
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
      queryClient.refetchQueries({ queryKey: ['loads'] });
      
      console.log('✅ useCreateLoad - Cache invalidated - triggers handle automatic recalculation');
      
      // No mostramos toast aquí - se maneja en el componente
      console.log('✅ useCreateLoad - Load operation completed successfully');
    },
    onError: (error: Error) => {
      console.error('❌ useCreateLoad - Mutation error:', error);
      // No mostramos toast aquí - se maneja en el componente
    },
  });
};