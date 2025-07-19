import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UpdateLoadData {
  loadId: string;
  load_number: string;
  broker_id: string;
  internal_dispatcher_id?: string | null;
  total_amount: number;
  commodity: string;
  weight_lbs?: number;
  notes?: string;
  stops?: any[];
}

export function useUpdateLoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateLoadData) => {
      // Actualizar la carga
      const { error: loadError } = await supabase
        .from("loads")
        .update({
          load_number: data.load_number,
          broker_id: data.broker_id,
          internal_dispatcher_id: data.internal_dispatcher_id,
          total_amount: data.total_amount,
          commodity: data.commodity,
          weight_lbs: data.weight_lbs,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.loadId);

      if (loadError) {
        throw new Error(`Error updating load: ${loadError.message}`);
      }

      // Si hay paradas, actualizarlas también
      if (data.stops && data.stops.length > 0) {
        // Eliminar paradas existentes
        const { error: deleteError } = await supabase
          .from("load_stops")
          .delete()
          .eq("load_id", data.loadId);

        if (deleteError) {
          throw new Error(`Error deleting existing stops: ${deleteError.message}`);
        }

        // Insertar nuevas paradas
        const stopsToInsert = data.stops.map((stop, index) => ({
          load_id: data.loadId,
          stop_number: index + 1,
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
          scheduled_date: stop.scheduled_date,
          scheduled_time: stop.scheduled_time,
        }));

        const { error: insertError } = await supabase
          .from("load_stops")
          .insert(stopsToInsert);

        if (insertError) {
          throw new Error(`Error inserting stops: ${insertError.message}`);
        }
      }

      return { loadId: data.loadId };
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "La carga ha sido actualizada correctamente.",
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      queryClient.invalidateQueries({ queryKey: ["load-stops"] });
    },
    onError: (error) => {
      console.error("Error updating load:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar la carga.",
        variant: "destructive",
      });
    },
  });
}