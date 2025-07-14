import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CreateLoadData {
  load_number: string;
  driver_user_id: string;
  broker_id?: string;
  total_amount: number;
  commodity?: string;
  pickup_date?: string;
  delivery_date?: string;
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
}

export const useCreateLoad = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLoadData): Promise<string> => {
      if (!user) throw new Error('User not authenticated');

      // Crear la carga
      const { data: newLoad, error: loadError } = await supabase
        .from('loads')
        .insert({
          load_number: data.load_number,
          driver_user_id: data.driver_user_id,
          broker_id: data.broker_id || null,
          total_amount: data.total_amount,
          commodity: data.commodity || null,
          pickup_date: data.pickup_date || null,
          delivery_date: data.delivery_date || null,
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
        throw new Error(`Error creando carga: ${loadError.message}`);
      }

      // Crear paradas si se proporcionaron
      const stops = [];
      
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
          scheduled_date: data.pickup_date || null
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
          scheduled_date: data.delivery_date || null
        });
      }

      if (stops.length > 0) {
        const { error: stopsError } = await supabase
          .from('load_stops')
          .insert(stops);

        if (stopsError) {
          console.error('Error creando paradas:', stopsError);
          // No lanzamos error porque la carga ya se creó
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