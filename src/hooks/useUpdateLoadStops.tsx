import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UpdateLoadStopsData {
  loadId: string;
  stops: any[];
}

export const useUpdateLoadStops = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateLoadStopsData) => {
      const { loadId, stops } = data;

      // First, delete existing stops for this load
      const { error: deleteError } = await supabase
        .from('load_stops')
        .delete()
        .eq('load_id', loadId);

      if (deleteError) {
        throw new Error(`Error eliminando paradas existentes: ${deleteError.message}`);
      }

      // Then, insert the new stops
      if (stops.length > 0) {
        const stopsToInsert = stops.map(stop => ({
          ...stop,
          load_id: loadId,
          // Ensure required fields have default values
          scheduled_date: stop.scheduled_date || null,
          actual_date: stop.actual_date || null,
          scheduled_time: stop.scheduled_time || null,
          actual_time: stop.actual_time || null
        }));

        const { error: insertError } = await supabase
          .from('load_stops')
          .insert(stopsToInsert);

        if (insertError) {
          throw new Error(`Error insertando nuevas paradas: ${insertError.message}`);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate loads queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
    onError: (error: Error) => {
      console.error('Error updating load stops:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};