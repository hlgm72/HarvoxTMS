import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * NUEVO SISTEMA SIMPLIFICADO: user_payment_periods individuales
 * Ya no existe company_payment_periods
 * 
 * Este hook devuelve TODOS los períodos de TODOS los usuarios de una empresa
 * agrupados por período (start_date, end_date)
 */

export interface UserPaymentPeriod {
  id: string;
  user_id: string;
  company_id: string;
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  period_type: string;
  payment_date?: string;
  status: string;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
  gross_earnings: number;
  fuel_expenses: number;
  total_deductions: number;
  other_income: number;
  net_payment: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

// Para mantener compatibilidad, agrupamos períodos por fechas
export interface GroupedPeriod {
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  status: string;
  user_periods: UserPaymentPeriod[];
  total_net_payment: number;
  users_count: number;
}

export function useUserPaymentPeriods(companyId?: string, userId?: string) {
  return useQuery({
    queryKey: ['user-payment-periods', companyId, userId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      
      let query = supabase
        .from('user_payrolls')
        .select('*')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      // Si se especifica userId, filtrar solo por ese usuario
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserPaymentPeriod[];
    },
    enabled: !!companyId,
  });
}

// Hook para mantener compatibilidad con código antiguo
// Devuelve períodos agrupados por fechas
export function useCompanyPaymentPeriods(companyId?: string) {
  const { data: allUserPeriods, ...rest } = useUserPaymentPeriods(companyId);

  // Agrupar por período (start_date, end_date)
  const groupedPeriods: GroupedPeriod[] = allUserPeriods
    ? Object.values(
        allUserPeriods.reduce((acc, period) => {
          const key = `${period.period_start_date}-${period.period_end_date}`;
          if (!acc[key]) {
            acc[key] = {
              period_start_date: period.period_start_date,
              period_end_date: period.period_end_date,
              period_frequency: period.period_frequency,
              status: period.status,
              user_periods: [],
              total_net_payment: 0,
              users_count: 0,
            };
          }
          acc[key].user_periods.push(period);
          acc[key].total_net_payment += period.net_payment;
          acc[key].users_count += 1;
          return acc;
        }, {} as Record<string, GroupedPeriod>)
      )
    : [];

  return {
    data: groupedPeriods,
    ...rest,
  };
}