import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CreateLoadData {
  load_number: string;
  driver_user_id: string;
  internal_dispatcher_id?: string | null;
  broker_id?: string;
  total_amount: number;
  commodity?: string;
  weight_lbs?: number;
  notes?: string;
  customer_name?: string;
  factoring_percentage?: number;
  dispatching_percentage?: number;
  leasing_percentage?: number;
  
  // Para las paradas
  pickup_address?: string;
  pickup_city?: string;
  pickup_state?: string;
  pickup_zip?: string;
  pickup_company?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_zip?: string;
  delivery_company?: string;
  
  // Array completo de paradas
  stops?: any[];
}

export const useCreateLoad = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      console.log('🚛 useCreateLoad - Starting mutation with data:', data);
      if (!user) throw new Error('User not authenticated');

      // Crear la carga
      const { data: newLoad, error: loadError } = await supabase
        .from('loads')
        .insert({
          load_number: data.load_number,
          driver_user_id: data.driver_user_id,
          internal_dispatcher_id: data.internal_dispatcher_id,
          broker_id: data.broker_id || null,
          total_amount: data.total_amount,
          commodity: data.commodity || null,
          weight_lbs: data.weight_lbs || null,
          notes: data.notes || null,
          customer_name: data.customer_name || null,
          factoring_percentage: data.factoring_percentage || null,
          dispatching_percentage: data.dispatching_percentage || null,
          leasing_percentage: data.leasing_percentage || null,
          status: 'created',
          created_by: user.id
        })
        .select()
        .single();

      if (loadError) {
        console.error('❌ useCreateLoad - Error creating load:', {
          loadError,
          code: loadError.code,
          message: loadError.message,
          details: loadError.details,
          hint: loadError.hint,
          data: data
        });
        
        // Verificar si es un error de número de carga duplicado
        if (loadError.code === '23505' && loadError.message.includes('loads_load_number_unique')) {
          throw new Error(`El número de carga "${data.load_number}" ya existe. Por favor use un número diferente.`);
        }
        throw new Error(`Error creando carga: ${loadError.message}`);
      }

      console.log('✅ useCreateLoad - Load created successfully:', newLoad);
      // Crear paradas si se proporcionaron
      let stops = [];
      
      // Priorizar el array completo de paradas si está disponible
      if (data.stops && data.stops.length > 0) {
        stops = data.stops.map(stop => ({
          ...stop,
          load_id: newLoad.id,
          // Convertir fechas de Date a string si es necesario
          scheduled_date: stop.scheduled_date ? 
            (stop.scheduled_date instanceof Date ? 
              stop.scheduled_date.toISOString().split('T')[0] : 
              stop.scheduled_date) : null,
          actual_date: stop.actual_date ? 
            (stop.actual_date instanceof Date ? 
              stop.actual_date.toISOString().split('T')[0] : 
              stop.actual_date) : null,
          scheduled_time: stop.scheduled_time || null,
          actual_time: stop.actual_time || null
        }));
      } else {
        // Fallback: crear paradas básicas si solo se proporcionaron pickup/delivery
        if (data.pickup_address && data.pickup_city && data.pickup_state) {
          stops.push({
            load_id: newLoad.id,
            stop_type: 'pickup',
            stop_number: 1,
            address: data.pickup_address,
            city: data.pickup_city,
            state: data.pickup_state,
            zip_code: data.pickup_zip || null,
            company_name: data.pickup_company || null,
            scheduled_date: null
          });
        }

        if (data.delivery_address && data.delivery_city && data.delivery_state) {
          stops.push({
            load_id: newLoad.id,
            stop_type: 'delivery',
            stop_number: 2,
            address: data.delivery_address,
            city: data.delivery_city,
            state: data.delivery_state,
            zip_code: data.delivery_zip || null,
            company_name: data.delivery_company || null,
            scheduled_date: null
          });
        }
      }

      if (stops.length > 0) {
        const { error: stopsError } = await supabase
          .from('load_stops')
          .insert(stops);

        if (stopsError) {
          console.error('❌ useCreateLoad - Error creating stops:', {
            stopsError,
            code: stopsError.code,
            message: stopsError.message,
            stops
          });
          throw new Error(`Error creando paradas: ${stopsError.message}`);
        }
      }

      return newLoad.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast({
        title: "Éxito",
        description: "Carga creada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};