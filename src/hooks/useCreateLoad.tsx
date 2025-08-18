import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { formatDateInUserTimeZone, getTodayInUserTimeZone } from '@/lib/dateFormatting';

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

      // Save document record in database
      const { error: dbError } = await supabase
        .from('load_documents')
        .insert({
          load_id: loadId,
          document_type: doc.type,
          file_name: customFileName, // Use custom filename
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

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
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      // Starting ACID mutation with data
      
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

      // Get company_id from user's active role
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRoles?.company_id) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }

      // Prepare load data for ACID function
      const loadData = {
        ...(isEdit && { id: data.id }),
        load_number: data.load_number,
        po_number: data.po_number || '',
        driver_user_id: data.driver_user_id || '',
        internal_dispatcher_id: data.internal_dispatcher_id || '',
        client_id: data.client_id || '',
        client_contact_id: data.client_contact_id || '',
        total_amount: data.total_amount,
        commodity: data.commodity || '',
        weight_lbs: toNumber(data.weight_lbs),
        notes: data.notes || '',
        customer_name: data.customer_name || '',
        factoring_percentage: toNumber(data.factoring_percentage),
        dispatching_percentage: toNumber(data.dispatching_percentage),
        leasing_percentage: toNumber(data.leasing_percentage),
        company_id: userRoles.company_id
      };

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
            stop.scheduled_date) : '',
        scheduled_time: stop.scheduled_time || '',
        actual_date: stop.actual_date ? 
          (stop.actual_date instanceof Date ? 
            formatDateInUserTimeZone(stop.actual_date) : 
            stop.actual_date) : ''
      }));

      // ✅ USE ACID FUNCTION FOR ATOMIC OPERATION
      const loadDataWithStops = {
        ...loadData,
        stops: stopsData
      };
      
      const { data: result, error: acidError } = await supabase.rpc(
        'simple_load_operation',
        {
          load_data: loadDataWithStops
        }
      );

      if (acidError) {
        console.error('❌ useCreateLoad - ACID function error:', acidError);
        
        if (acidError.message.includes('ya existe')) {
          throw new Error(acidError.message);
        }
        throw new Error(`Error en operación ACID: ${acidError.message}`);
      }

      console.log('🔍 useCreateLoad - Full ACID result object:', JSON.stringify(result, null, 2));
      
      if (!(result as any)?.success) {
        console.error('❌ useCreateLoad - ACID operation failed. Result:', result);
        throw new Error(`La operación ACID no fue exitosa. Detalle: ${JSON.stringify(result)}`);
      }

      console.log('✅ useCreateLoad - ACID operation completed:', result);
      const loadId = (result as any).load_id;

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
    onSuccess: (loadId, variables) => {
      console.log('✅ useCreateLoad - Mutation successful, load ID:', loadId);
      
      // Invalidar todas las queries relacionadas con loads
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.refetchQueries({ queryKey: ['loads'] });
      
      // No mostramos toast aquí - se maneja en el componente
      console.log('✅ useCreateLoad - Load operation completed successfully');
    },
    onError: (error: Error) => {
      console.error('❌ useCreateLoad - Mutation error:', error);
      // No mostramos toast aquí - se maneja en el componente
    },
  });
};