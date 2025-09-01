import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CleanupResult {
  success: boolean;
  message: string;
  period_id?: string;
  deleted_by?: string;
  deleted_at?: string;
  data_found?: {
    loads: number;
    fuel_expenses: number;
    calculations: number;
  };
}

export function useEmergencyPeriodCleanup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('emergency_cleanup_week36_period');
      
      if (error) {
        throw error;
      }
      
      return data as unknown as CleanupResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Período problemático eliminado exitosamente", {
          description: result.message,
        });
        
        // Invalidar las queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
        queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      } else {
        toast.error("No se pudo eliminar el período", {
          description: result.message,
        });
      }
    },
    onError: (error: any) => {
      console.error('Error limpiando período:', error);
      toast.error("Error limpiando período problemático", {
        description: error.message || "Error desconocido",
      });
    },
  });
}