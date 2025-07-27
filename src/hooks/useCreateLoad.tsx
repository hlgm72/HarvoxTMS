
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

// Function to assign payment period to a load based on its dates and driver
const assignPaymentPeriodToLoad = async (loadId: string): Promise<void> => {
  console.log('📅 assignPaymentPeriodToLoad - Starting for load:', loadId);
  
  try {
    // Get the load details including driver info
    const { data: loadData, error: loadError } = await supabase
      .from('loads')
      .select(`
        id,
        driver_user_id,
        pickup_date,
        delivery_date,
        created_by
      `)
      .eq('id', loadId)
      .single();

    if (loadError || !loadData) {
      console.error('❌ assignPaymentPeriodToLoad - Error getting load:', loadError);
      return;
    }

    console.log('📋 assignPaymentPeriodToLoad - Load data:', loadData);

    // Use the assigned driver or the user who created the load
    const userId = loadData.driver_user_id || loadData.created_by;
    
    if (!userId) {
      console.log('⚠️ assignPaymentPeriodToLoad - No user to assign period to');
      return;
    }

    // Get company ID from user roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_company_roles')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (roleError || !userRole) {
      console.error('❌ assignPaymentPeriodToLoad - Error getting user company:', roleError);
      return;
    }

    console.log('🏢 assignPaymentPeriodToLoad - Company ID:', userRole.company_id);

    // Determine target date (prefer pickup_date, fallback to delivery_date, then current date)
    const targetDate = loadData.pickup_date || loadData.delivery_date || getTodayInUserTimeZone();
    
    console.log('📅 assignPaymentPeriodToLoad - Target date:', targetDate);

    // Find the appropriate company payment period
    const { data: period, error: periodError } = await supabase
      .from('company_payment_periods')
      .select('id')
      .eq('company_id', userRole.company_id)
      .lte('period_start_date', targetDate)
      .gte('period_end_date', targetDate)
      .in('status', ['open', 'processing'])
      .limit(1)
      .single();

    if (periodError && periodError.code !== 'PGRST116') {
      console.error('❌ assignPaymentPeriodToLoad - Error finding period:', periodError);
      return;
    }

    let periodId = period?.id;

    // If no period found, try to generate one
    if (!periodId) {
      console.log('📅 assignPaymentPeriodToLoad - No period found, generating...');
      
      // Get company payment frequency to determine appropriate range
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('default_payment_frequency')
        .eq('id', userRole.company_id)
        .single();
      
      if (companyError) {
        console.error('❌ assignPaymentPeriodToLoad - Error getting company data:', companyError);
        return;
      }
      
      // Determine range based on payment frequency
      let rangeDays = 7; // default for weekly
      switch (companyData.default_payment_frequency) {
        case 'weekly':
          rangeDays = 7;
          break;
        case 'biweekly':
          rangeDays = 14;
          break;
        case 'monthly':
          rangeDays = 30;
          break;
        default:
          rangeDays = 7;
      }
      
      console.log(`📅 Using range of ±${rangeDays} days for ${companyData.default_payment_frequency} frequency`);
      
      const { data: generateResult, error: generateError } = await supabase.rpc(
        'generate_payment_periods',
        {
          company_id_param: userRole.company_id,
          from_date: formatDateInUserTimeZone(new Date(Date.parse(targetDate) - rangeDays * 24 * 60 * 60 * 1000)),
          to_date: formatDateInUserTimeZone(new Date(Date.parse(targetDate) + rangeDays * 24 * 60 * 60 * 1000))
        }
      );

      if (generateError) {
        console.error('❌ assignPaymentPeriodToLoad - Error generating periods:', generateError);
        return;
      }

      console.log('✅ assignPaymentPeriodToLoad - Generated periods result:', generateResult);

      // Try to find the period again
      const { data: newPeriod, error: newPeriodError } = await supabase
        .from('company_payment_periods')
        .select('id')
        .eq('company_id', userRole.company_id)
        .lte('period_start_date', targetDate)
        .gte('period_end_date', targetDate)
        .in('status', ['open', 'processing'])
        .limit(1)
        .single();

      if (newPeriodError) {
        console.error('❌ assignPaymentPeriodToLoad - Still no period found after generation:', newPeriodError);
        return;
      }

      periodId = newPeriod.id;
    }

    if (periodId) {
      console.log('📅 assignPaymentPeriodToLoad - Assigning period:', periodId);
      
      // Update the load with the payment period
      const { error: updateError } = await supabase
        .from('loads')
        .update({ payment_period_id: periodId })
        .eq('id', loadId);

      if (updateError) {
        console.error('❌ assignPaymentPeriodToLoad - Error updating load:', updateError);
        return;
      }

      console.log('✅ assignPaymentPeriodToLoad - Successfully assigned period:', periodId);
    } else {
      console.log('⚠️ assignPaymentPeriodToLoad - No period could be found or generated');
    }

  } catch (error) {
    console.error('❌ assignPaymentPeriodToLoad - Unexpected error:', error);
  }
};

export const useCreateLoad = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      console.log('🚛 useCreateLoad - Starting mutation with data:', data);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const isEdit = data.mode === 'edit' && data.id;
      const isCreate = data.mode === 'create' || data.mode === 'duplicate';

      // Prepare load data
      const loadData = {
        load_number: data.load_number,
        po_number: data.po_number || null,
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
            return {
              load_id: currentLoad.id,
              stop_number: stop.stop_number,
              stop_type: stop.stop_type,
              company_name: stop.company_name,
              address: stop.address,
              city: stop.city,
              state: stop.state,
              zip_code: stop.zip_code,
              reference_number: stop.reference_number,
              contact_name: stop.contact_name,
              contact_phone: stop.contact_phone,
              special_instructions: stop.special_instructions,
              scheduled_date: stop.scheduled_date ? 
                (stop.scheduled_date instanceof Date ? 
                  formatDateInUserTimeZone(stop.scheduled_date) : 
                  stop.scheduled_date) : null,
              actual_date: stop.actual_date ? 
                (stop.actual_date instanceof Date ? 
                  formatDateInUserTimeZone(stop.actual_date) : 
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
          
          // Assign payment period after updating stops
          await assignPaymentPeriodToLoad(currentLoad.id);
        } else {
          console.log('📍 useCreateLoad - No stops to process for edit mode');
        }

      } else {
        // For create and duplicate modes
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
          console.log('📍 useCreateLoad - Raw data.stops:', JSON.stringify(data.stops, null, 2));
          
          const stopsToInsert = data.stops.map(stop => {
            const processedStop = {
              load_id: currentLoad.id,
              stop_number: stop.stop_number,
              stop_type: stop.stop_type,
              company_name: stop.company_name,
              address: stop.address,
              city: stop.city,
              state: stop.state,
              zip_code: stop.zip_code,
              reference_number: stop.reference_number,
              contact_name: stop.contact_name,
              contact_phone: stop.contact_phone,
              special_instructions: stop.special_instructions,
              scheduled_date: stop.scheduled_date ? 
                (stop.scheduled_date instanceof Date ? 
                  formatDateInUserTimeZone(stop.scheduled_date) : 
                  stop.scheduled_date) : null,
              actual_date: stop.actual_date ? 
                (stop.actual_date instanceof Date ? 
                  formatDateInUserTimeZone(stop.actual_date) : 
                  stop.actual_date) : null,
            };
            console.log('📍 useCreateLoad - Processing stop:', JSON.stringify(stop, null, 2));
            console.log('📍 useCreateLoad - Processed to:', JSON.stringify(processedStop, null, 2));
            return processedStop;
          });

          console.log('📍 useCreateLoad - Data stops received for creation:', data.stops);
          console.log('📍 useCreateLoad - Stops to insert for creation:', JSON.stringify(stopsToInsert, null, 2));

          // 🔍 DEBUG: Let's test what happens when we try to insert directly
          console.log('🔍 DEBUG: About to attempt INSERT into load_stops...');
          console.log('🔍 DEBUG: Current load ID:', currentLoad.id);
          console.log('🔍 DEBUG: User ID:', user.id);
          
          // Try a simple test first
          console.log('🔍 DEBUG: Testing simple load_stops query first...');
          const { data: testData, error: testError } = await supabase
            .from('load_stops')
            .select('id')
            .limit(1);
          
          if (testError) {
            console.error('🔍 DEBUG: Simple SELECT failed:', testError);
          } else {
            console.log('🔍 DEBUG: Simple SELECT worked:', testData);
          }

          console.log('🔍 DEBUG: Now attempting INSERT...');
          const { error: stopsError } = await supabase
            .from('load_stops')
            .insert(stopsToInsert);

          if (stopsError) {
            console.error('❌ useCreateLoad - Error creating stops:', stopsError);
            console.error('🔍 DEBUG: Full error object:', JSON.stringify(stopsError, null, 2));
            console.error('🔍 DEBUG: Error code:', stopsError.code);
            console.error('🔍 DEBUG: Error details:', stopsError.details);
            console.error('🔍 DEBUG: Error hint:', stopsError.hint);
            throw new Error(`Error creando paradas: ${stopsError.message}`);
          }

          console.log('✅ useCreateLoad - Stops created successfully');
          
          // Now assign the payment period based on the stops
          await assignPaymentPeriodToLoad(currentLoad.id);
        } else {
          console.warn('⚠️ useCreateLoad - No stops data provided:', {
            hasStops: !!data.stops,
            stopsLength: data.stops?.length,
            stopsData: data.stops
          });
        }

        // Handle temporary documents for new loads (create and duplicate)
        if (isCreate && data.temporaryDocuments && data.temporaryDocuments.length > 0) {
          console.log('📄 useCreateLoad - Processing temporary documents:', data.temporaryDocuments);
          await uploadTemporaryDocuments(data.temporaryDocuments, currentLoad.id, data.load_number);
        }
      }

      return currentLoad.id;
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
