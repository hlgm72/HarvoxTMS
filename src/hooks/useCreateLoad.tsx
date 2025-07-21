
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CreateLoadData {
  id?: string;
  mode?: 'create' | 'edit';
  load_number: string;
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
      
      console.log('⬆️ Uploading to storage:', filePath);
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file);

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      console.log('🚛 useCreateLoad - Starting mutation with data:', data);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const isEdit = data.mode === 'edit' && data.id;

      // Prepare load data
      const loadData = {
        load_number: data.load_number,
        driver_user_id: data.driver_user_id,
        internal_dispatcher_id: data.internal_dispatcher_id,
        client_id: data.client_id || null,
        client_contact_id: data.client_contact_id || null,
        total_amount: data.total_amount,
        commodity: data.commodity || null,
        weight_lbs: data.weight_lbs || null,
        notes: data.notes || null,
        customer_name: data.customer_name || null,
        factoring_percentage: data.factoring_percentage || null,
        dispatching_percentage: data.dispatching_percentage || null,
        leasing_percentage: data.leasing_percentage || null,
      };

      let currentLoad: any;

      if (isEdit) {
        console.log('🔄 useCreateLoad - Updating existing load:', data.id);
        
        // Para modo edición, también determinar el estado automáticamente
        let updatedStatus: string | undefined;
        
        if (loadData.driver_user_id && loadData.driver_user_id.trim() !== '') {
          // Si se asigna un conductor, cambiar a 'assigned'
          updatedStatus = 'assigned';
          console.log('🚛 useCreateLoad - Driver assigned in edit, updating status to "assigned"');
        } else if (data.stops && data.stops.length >= 2) {
          // Si tiene paradas pero no conductor, es 'route_planned'
          updatedStatus = 'route_planned';
          console.log('📍 useCreateLoad - Route planned in edit but no driver, updating status to "route_planned"');
        } else {
          // Si no tiene conductor ni paradas completas, volver a 'created'
          updatedStatus = 'created';
          console.log('📝 useCreateLoad - No driver or incomplete route in edit, updating status to "created"');
        }

        const dataToUpdate = updatedStatus ? { ...loadData, status: updatedStatus } : loadData;
        console.log('📊 useCreateLoad - Updating with status:', updatedStatus);
        
        const { data: updatedLoad, error: loadError } = await supabase
          .from('loads')
          .update(dataToUpdate)
          .eq('id', data.id)
          .select()
          .single();

        if (loadError) {
          console.error('❌ useCreateLoad - Error updating load:', loadError);
          throw new Error(`Error actualizando carga: ${loadError.message}`);
        }

        console.log('✅ useCreateLoad - Load updated successfully:', updatedLoad);
        currentLoad = updatedLoad;

        // Handle stops for edit mode
        if (data.stops && data.stops.length > 0) {
          console.log('📍 useCreateLoad - Processing stops for edit mode');
          
          // First, delete existing stops
          console.log('🗑️ useCreateLoad - Deleting existing stops for load:', data.id);
          const { error: deleteError } = await supabase
            .from('load_stops')
            .delete()
            .eq('load_id', data.id);

          if (deleteError) {
            console.error('❌ useCreateLoad - Error deleting existing stops:', deleteError);
            throw new Error(`Error eliminando paradas existentes: ${deleteError.message}`);
          }

          console.log('✅ useCreateLoad - Existing stops deleted successfully');

          // Then, insert new stops (excluding temporary id)
          const stopsToInsert = data.stops.map(stop => {
            const { id, ...stopWithoutId } = stop;
            return {
              ...stopWithoutId,
              load_id: currentLoad.id,
              scheduled_date: stop.scheduled_date ? 
                (stop.scheduled_date instanceof Date ? 
                  stop.scheduled_date.toISOString().split('T')[0] : 
                  stop.scheduled_date) : null,
              actual_date: stop.actual_date ? 
                (stop.actual_date instanceof Date ? 
                  stop.actual_date.toISOString().split('T')[0] : 
                  stop.actual_date) : null,
            };
          });

          console.log('📍 useCreateLoad - Data stops received for edit:', data.stops);
          console.log('📍 useCreateLoad - Stops to insert for edit:', stopsToInsert);

          console.log('📍 useCreateLoad - Inserting new stops:', stopsToInsert);

          const { error: stopsError } = await supabase
            .from('load_stops')
            .insert(stopsToInsert);

          if (stopsError) {
            console.error('❌ useCreateLoad - Error creating new stops:', stopsError);
            throw new Error(`Error creando nuevas paradas: ${stopsError.message}`);
          }

          console.log('✅ useCreateLoad - New stops created successfully for edit mode');
        } else {
          console.log('📍 useCreateLoad - No stops to process for edit mode');
        }

      } else {
        console.log('➕ useCreateLoad - Creating new load');
        
        // Determinar el estado inicial basado en los datos disponibles
        let initialStatus = 'created';
        
        if (loadData.driver_user_id) {
          // Si tiene conductor asignado, cambiar a 'assigned'
          initialStatus = 'assigned';
          console.log('🚛 useCreateLoad - Driver assigned, setting status to "assigned"');
        } else if (data.stops && data.stops.length >= 2) {
          // Si tiene paradas definidas pero no conductor, es 'route_planned'
          initialStatus = 'route_planned';
          console.log('📍 useCreateLoad - Route planned but no driver, setting status to "route_planned"');
        }
        
        console.log('📊 useCreateLoad - Initial status determined:', initialStatus);
        
        const { data: newLoad, error: loadError } = await supabase
          .from('loads')
          .insert({
            ...loadData,
            status: initialStatus,
            created_by: user.id
          })
          .select()
          .single();

        if (loadError) {
          console.error('❌ useCreateLoad - Error creating load:', loadError);
          
          if (loadError.code === '23505' && loadError.message.includes('loads_load_number_key')) {
            throw new Error(`El número de carga "${data.load_number}" ya existe. Por favor use un número diferente.`);
          }
          throw new Error(`Error creando carga: ${loadError.message}`);
        }

        console.log('✅ useCreateLoad - Load created successfully:', newLoad);
        currentLoad = newLoad;

        // Handle stops for new loads (excluding temporary id)
        if (data.stops && data.stops.length > 0) {
          console.log('📍 useCreateLoad - Creating stops for new load');
          
          const stopsToInsert = data.stops.map(stop => {
            const { id, ...stopWithoutId } = stop;
            return {
              ...stopWithoutId,
              load_id: currentLoad.id,
              scheduled_date: stop.scheduled_date ? 
                (stop.scheduled_date instanceof Date ? 
                  stop.scheduled_date.toISOString().split('T')[0] : 
                  stop.scheduled_date) : null,
              actual_date: stop.actual_date ? 
                (stop.actual_date instanceof Date ? 
                  stop.actual_date.toISOString().split('T')[0] : 
                  stop.actual_date) : null,
            };
          });

          console.log('📍 useCreateLoad - Data stops received for creation:', data.stops);
          console.log('📍 useCreateLoad - Stops to insert for creation:', stopsToInsert);

          const { error: stopsError } = await supabase
            .from('load_stops')
            .insert(stopsToInsert);

          if (stopsError) {
            console.error('❌ useCreateLoad - Error creating stops:', stopsError);
            throw new Error(`Error creando paradas: ${stopsError.message}`);
          }

          console.log('✅ useCreateLoad - Stops created successfully');
        }

        // Handle temporary documents for new loads
        if (data.temporaryDocuments && data.temporaryDocuments.length > 0) {
          console.log('📄 useCreateLoad - Processing temporary documents:', data.temporaryDocuments);
          await uploadTemporaryDocuments(data.temporaryDocuments, currentLoad.id, data.load_number);
        }
      }

      return currentLoad.id;
    },
    onSuccess: (loadId, variables) => {
      console.log('✅ useCreateLoad - Mutation successful, load ID:', loadId);
      
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      
      const isEdit = variables.mode === 'edit';
      toast({
        title: "Éxito",
        description: isEdit ? "Carga actualizada exitosamente" : "Carga creada exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error('❌ useCreateLoad - Mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
