import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FinancialDataValidation {
  can_modify: boolean;
  is_locked: boolean;
  driver_is_paid?: boolean; // ⭐ NUEVO: Estado individual del conductor
  paid_drivers: number;
  total_drivers: number;
  warning_message: string;
}

/**
 * Hook para validar si se pueden modificar datos financieros en un período
 * Usa la función de base de datos can_modify_financial_data para verificar el estado
 */
export function useFinancialDataValidation(periodId: string | null, driverId?: string | null) {
  return useQuery<FinancialDataValidation>({
    queryKey: ['financial-data-validation', periodId, driverId],
    queryFn: async () => {
      if (!periodId) {
        return {
          can_modify: true,
          is_locked: false,
          driver_is_paid: false,
          paid_drivers: 0,
          total_drivers: 0,
          warning_message: 'No hay período seleccionado'
        };
      }

      console.log('🔒 Validating financial data access for period:', periodId, 'user:', driverId);
      
      // ⭐ USAR FUNCIÓN MEJORADA que considera el usuario individual
      const { data, error } = await supabase.rpc('can_modify_financial_data_with_user_check', {
        period_id: periodId,
        user_id_param: driverId || null
      });

      if (error) {
        console.error('❌ Error validating financial data access:', error);
        throw error;
      }

      console.log('✅ Financial data validation result:', data);
      return data as unknown as FinancialDataValidation;
    },
    enabled: !!periodId,
    staleTime: 30000, // Cache por 30 segundos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para verificar múltiples períodos de pago
 */
export function useMultiplePeriodsValidation(periodIds: string[]) {
  return useQuery<Record<string, FinancialDataValidation>>({
    queryKey: ['multiple-periods-validation', periodIds],
    queryFn: async () => {
      if (periodIds.length === 0) return {};

      console.log('🔒 Validating multiple periods:', periodIds);
      
      const results: Record<string, FinancialDataValidation> = {};
      
      // Ejecutar validaciones en paralelo
      const promises = periodIds.map(async (periodId) => {
        const { data, error } = await supabase.rpc('can_modify_financial_data', {
          period_id: periodId
        });
        
        if (error) {
          console.error(`❌ Error validating period ${periodId}:`, error);
          return { periodId, data: null };
        }
        
        return { periodId, data: data as unknown as FinancialDataValidation };
      });

      const responses = await Promise.all(promises);
      
      responses.forEach(({ periodId, data }) => {
        if (data) {
          results[periodId] = data;
        }
      });

      console.log('✅ Multiple periods validation results:', results);
      return results;
    },
    enabled: periodIds.length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });
}

/**
 * Hook simplificado que solo verifica si un período está bloqueado
 */
export function usePeriodLockStatus(periodId: string | null, driverId?: string | null) {
  const { data, isLoading, error } = useFinancialDataValidation(periodId, driverId);
  
  return {
    isLocked: data?.is_locked ?? false,
    driverIsPaid: data?.driver_is_paid ?? false, // ⭐ NUEVO: Estado del conductor
    canModify: data?.can_modify ?? true,
    warningMessage: data?.warning_message ?? '',
    paidDrivers: data?.paid_drivers ?? 0,
    totalDrivers: data?.total_drivers ?? 0,
    isLoading,
    error
  };
}