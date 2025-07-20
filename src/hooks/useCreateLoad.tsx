
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
}

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
        
        const { data: updatedLoad, error: loadError } = await supabase
          .from('loads')
          .update(loadData)
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
        
        const { data: newLoad, error: loadError } = await supabase
          .from('loads')
          .insert({
            ...loadData,
            status: 'created',
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

          const { error: stopsError } = await supabase
            .from('load_stops')
            .insert(stopsToInsert);

          if (stopsError) {
            console.error('❌ useCreateLoad - Error creating stops:', stopsError);
            throw new Error(`Error creando paradas: ${stopsError.message}`);
          }

          console.log('✅ useCreateLoad - Stops created successfully');
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
