import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useRecalculateDeductions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodId, driverUserId }: { periodId: string; driverUserId?: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      console.log('🔄 Recalculando deducciones para período:', periodId, 'conductor:', driverUserId);
      
      if (driverUserId) {
        // Recalcular para un conductor específico
        const { data, error } = await supabase.rpc('force_recalculate_driver_deductions', {
          driver_id_param: driverUserId,
          period_id_param: periodId
        });

        if (error) {
          console.error('❌ Error recalculando deducciones del conductor:', error);
          throw error;
        }

        console.log('✅ Deducciones recalculadas para conductor:', data);
        return data;
      } else {
        // Recalcular para todo el período
        const { data, error } = await supabase.rpc('recalculate_driver_period_calculation', {
          calculation_id: periodId
        });

        if (error) {
          console.error('❌ Error recalculando período:', error);
          throw error;
        }

        console.log('✅ Período recalculado:', data);
        return data;
      }
    },
    onSuccess: (data) => {
      toast.success('Deducciones recalculadas exitosamente');
      
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
      queryClient.invalidateQueries({ queryKey: ['period-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      
      console.log('🔄 Cache invalidado después del recálculo');
    },
    onError: (error: Error) => {
      console.error('❌ Error en recálculo de deducciones:', error);
      toast.error(`Error recalculando deducciones: ${error.message}`);
    }
  });
};

// Hook para obtener información sobre deducciones incorrectas
export const useDeductionValidation = () => {
  return useMutation({
    mutationFn: async ({ periodStartDate, periodEndDate }: { periodStartDate: string; periodEndDate: string }) => {
      console.log('🔍 Validando deducciones para período:', periodStartDate, 'a', periodEndDate);
      
      // Consulta simplificada usando tablas existentes
      const { data, error } = await supabase
        .from('loads')
        .select(`
          id,
          total_amount,
          driver_user_id,
          owner_operators!inner(
            dispatching_percentage,
            factoring_percentage,
            leasing_percentage
          )
        `)
        .gte('created_at', periodStartDate)
        .lte('created_at', periodEndDate + ' 23:59:59');

      if (error) throw error;
      
      // Analizar discrepancias
      const validation = data?.map((load: any) => {
        const oo = load.owner_operators;
        
        const correctDispatching = Math.round(load.total_amount * (oo.dispatching_percentage || 0) / 100 * 100) / 100;
        const correctFactoring = Math.round(load.total_amount * (oo.factoring_percentage || 0) / 100 * 100) / 100;
        const correctLeasing = Math.round(load.total_amount * (oo.leasing_percentage || 0) / 100 * 100) / 100;
        
        return {
          load_id: load.id,
          total_amount: load.total_amount,
          driver_user_id: load.driver_user_id,
          dispatching_percentage: oo.dispatching_percentage,
          factoring_percentage: oo.factoring_percentage,
          leasing_percentage: oo.leasing_percentage,
          correct_dispatching: correctDispatching,
          correct_factoring: correctFactoring,
          correct_leasing: correctLeasing,
          // Para esta demo, asumimos que hay errores si los porcentajes no son estándar
          dispatching_discrepancy: correctDispatching !== Math.round(load.total_amount * 0.05 * 100) / 100,
          factoring_discrepancy: correctFactoring !== Math.round(load.total_amount * 0.03 * 100) / 100,
          leasing_discrepancy: correctLeasing !== Math.round(load.total_amount * 0.05 * 100) / 100
        };
      });

      const errors = validation?.filter((row: any) => 
        row.dispatching_discrepancy || row.factoring_discrepancy || row.leasing_discrepancy
      );

      console.log('🔍 Validación de deducciones:');
      console.log('  Total cargas:', validation?.length);
      console.log('  Cargas con posibles errores:', errors?.length);
      console.log('  Errores encontrados:', errors);

      return { validation, errors };
    }
  });
};