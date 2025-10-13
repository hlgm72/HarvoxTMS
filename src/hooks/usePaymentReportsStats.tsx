import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCache } from "./useCompanyCache";
import { useCalculatedPeriods } from "./useCalculatedPeriods";
import { calculateNetPayment } from "@/lib/paymentCalculations";

interface PaymentReportsStats {
  totalReports: number;
  totalDrivers: number;
  totalNetPayment: number;
  pendingReports: number;
}

interface PaymentReportsStatsFilters {
  driverId?: string;
  status?: string;
  periodFilter?: {
    type: string;
    startDate?: string;
    endDate?: string;
    periodId?: string;
  };
}

export function usePaymentReportsStats(filters?: PaymentReportsStatsFilters) {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { data: calculatedPeriods, isLoading: isCalculatedPeriodsLoading } = useCalculatedPeriods(userCompany?.company_id);

  return useQuery({
    queryKey: ['payment-reports-stats', user?.id, userCompany?.company_id, filters],
    queryFn: async (): Promise<PaymentReportsStats> => {
      if (!user?.id || !userCompany?.company_id) {
        return { totalReports: 0, totalDrivers: 0, totalNetPayment: 0, pendingReports: 0 };
      }

      // ✅ Si estamos filtrando por 'current' o 'previous', esperar a que calculatedPeriods esté listo
      const needsCalculatedPeriods = filters?.periodFilter?.type === 'current' || filters?.periodFilter?.type === 'previous';
      if (needsCalculatedPeriods && !calculatedPeriods) {
        console.log('⏳ Waiting for calculatedPeriods to load...');
        return { totalReports: 0, totalDrivers: 0, totalNetPayment: 0, pendingReports: 0 };
      }

      try {
        // Construir query base
        let query = supabase
          .from('user_payrolls')
          .select(`
            *,
            period:company_payment_periods!company_payment_period_id(
              period_start_date,
              period_end_date,
              period_frequency
            )
          `)
          .eq('company_id', userCompany.company_id);

        // Aplicar filtro de conductor
        if (filters?.driverId && filters.driverId !== 'all') {
          query = query.eq('user_id', filters.driverId);
        }

        // Aplicar filtro de estado
        if (filters?.status && filters.status !== 'all') {
          switch (filters.status) {
            case 'pending':
              query = query.is('calculated_at', null);
              break;
            case 'calculated':
              query = query.not('calculated_at', 'is', null).neq('payment_status', 'paid');
              break;
            case 'paid':
              query = query.eq('payment_status', 'paid');
              break;
            case 'failed':
              query = query.eq('payment_status', 'failed');
              break;
            case 'negative':
              query = query.eq('has_negative_balance', true);
              break;
            case 'approved':
              query = query.eq('payment_status', 'approved');
              break;
          }
        }

        const { data: payrolls, error } = await query;

        if (error) throw error;
        if (!payrolls || payrolls.length === 0) {
          return { totalReports: 0, totalDrivers: 0, totalNetPayment: 0, pendingReports: 0 };
        }

        // Filtrar por período en el cliente si es necesario
        let filteredPayrolls = payrolls;

        if (filters?.periodFilter) {
          const pf = filters.periodFilter;

          if (pf.type === 'current' && calculatedPeriods?.current) {
            filteredPayrolls = filteredPayrolls.filter((p: any) => {
              const periodStart = p.period?.period_start_date;
              const periodEnd = p.period?.period_end_date;
              return periodStart === calculatedPeriods.current.period_start_date &&
                     periodEnd === calculatedPeriods.current.period_end_date;
            });
          } else if (pf.type === 'previous' && calculatedPeriods?.previous) {
            filteredPayrolls = filteredPayrolls.filter((p: any) => {
              const periodStart = p.period?.period_start_date;
              const periodEnd = p.period?.period_end_date;
              return periodStart === calculatedPeriods.previous.period_start_date &&
                     periodEnd === calculatedPeriods.previous.period_end_date;
            });
          } else if (pf.type === 'specific' && pf.periodId) {
            if (pf.periodId.startsWith('calculated-')) {
              // Período calculado - usar fechas
              if (pf.startDate && pf.endDate) {
                filteredPayrolls = filteredPayrolls.filter((p: any) => {
                  const periodStart = p.period?.period_start_date;
                  const periodEnd = p.period?.period_end_date;
                  return periodStart >= pf.startDate! && periodEnd <= pf.endDate!;
                });
              }
            } else {
              // Período real de BD - filtrar por company_payment_period_id
              filteredPayrolls = filteredPayrolls.filter((p: any) => 
                p.company_payment_period_id === pf.periodId
              );
            }
          } else if (pf.startDate && pf.endDate) {
            // Filtro personalizado por fechas
            filteredPayrolls = filteredPayrolls.filter((p: any) => {
              const periodStart = p.period?.period_start_date;
              const periodEnd = p.period?.period_end_date;
              return periodStart <= pf.endDate! && periodEnd >= pf.startDate!;
            });
          }
        }

        // Calcular estadísticas
        const totalNetPayment = filteredPayrolls.reduce((sum, p) => sum + calculateNetPayment(p), 0);
        const uniqueDrivers = new Set(filteredPayrolls.map(p => p.user_id)).size;
        const pendingReports = filteredPayrolls.filter(p => !p.calculated_at).length;

        return {
          totalReports: filteredPayrolls.length,
          totalDrivers: uniqueDrivers,
          totalNetPayment: Math.round(totalNetPayment * 100) / 100,
          pendingReports
        };
      } catch (error) {
        console.error('Error calculating payment reports stats:', error);
        return { totalReports: 0, totalDrivers: 0, totalNetPayment: 0, pendingReports: 0 };
      }
    },
    enabled: !!user?.id && !!userCompany?.company_id && 
             (!filters?.periodFilter || 
              filters.periodFilter.type === 'all' ||
              (filters.periodFilter.type === 'current' && !!calculatedPeriods?.current) ||
              (filters.periodFilter.type === 'previous' && !!calculatedPeriods?.previous) ||
              (filters.periodFilter.type !== 'current' && filters.periodFilter.type !== 'previous')),
  });
}
