import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { formatDateInUserTimeZone, formatMediumDate, convertUserDateToUTC } from '@/lib/dateFormatting';

export interface FuelStatsFilters {
  periodId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  periodFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  enabled?: boolean;
}

export function useFuelStats(filters: FuelStatsFilters = {}) {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { enabled = true, ...queryFilters } = filters;

  return useQuery({
    queryKey: ['fuel-stats', user?.id, selectedCompany?.id, queryFilters],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) {
        throw new Error('User or company not found');
      }

      // Construir la consulta base - simplificada para evitar problemas de relaciones
      let query = supabase
        .from('fuel_expenses')
        .select(`
          total_amount,
          gallons_purchased,
          price_per_gallon,
          fuel_type,
          status,
          transaction_date,
          driver_user_id
        `);

      // ✅ Aplicar filtros - detectar períodos calculados y usar fechas en su lugar
      const isCalculatedPeriod = queryFilters.periodId?.startsWith('calculated-');
      
      if (queryFilters.periodId && queryFilters.periodId !== 'all' && !isCalculatedPeriod) {
        // Usar periodId real de la base de datos
        query = query.eq('payment_period_id', queryFilters.periodId);
      } else if (isCalculatedPeriod || !queryFilters.periodId || queryFilters.startDate || queryFilters.endDate) {
        // Si es período calculado o no hay periodId, usar fechas si están disponibles
        if (queryFilters.startDate && queryFilters.endDate) {
          const startUTC = convertUserDateToUTC(new Date(queryFilters.startDate));
          const endUTC = convertUserDateToUTC(new Date(queryFilters.endDate));
          query = query
            .gte('transaction_date', startUTC.split('T')[0])
            .lte('transaction_date', endUTC.split('T')[0]);
        } else if (queryFilters.startDate) {
          query = query.gte('transaction_date', queryFilters.startDate);
        } else if (queryFilters.endDate) {
          query = query.lte('transaction_date', queryFilters.endDate);
        }
      }

      if (queryFilters.driverId && queryFilters.driverId !== 'all') {
        query = query.eq('driver_user_id', queryFilters.driverId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching fuel stats:', error);
        throw error;
      }

      if (!data) return null;

      // Filtrar solo datos de conductores de la empresa actual
      // Esto es una simplificación - en producción necesitarías una consulta más robusta
      const companyData = data;

      // Calcular estadísticas
      const totalExpenses = companyData.length;
      const totalAmount = companyData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      const totalGallons = companyData.reduce((sum, item) => sum + (item.gallons_purchased || 0), 0);
      
      const averagePricePerGallon = totalGallons > 0 ? totalAmount / totalGallons : 0;
      
      // Estadísticas por estado
      const byStatus = companyData.reduce((acc, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Estadísticas por tipo de combustible
      const byFuelType = companyData.reduce((acc, item) => {
        const type = item.fuel_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calcular comparación de períodos según la frecuencia
      let currentPeriodData = {
        amount: 0,
        gallons: 0,
        count: 0
      };
      let previousPeriodData = {
        amount: 0,
        gallons: 0,
        count: 0
      };
      
      // Si tenemos fechas de período, calcular current y previous
      if (queryFilters.startDate && queryFilters.endDate) {
        const startDate = new Date(queryFilters.startDate);
        const endDate = new Date(queryFilters.endDate);
        
        // Calcular datos del período actual
        const currentExpenses = companyData.filter(item => {
          const transactionDate = item.transaction_date;
          return transactionDate >= queryFilters.startDate && transactionDate <= queryFilters.endDate;
        });
        
        currentPeriodData = {
          amount: currentExpenses.reduce((sum, item) => sum + (item.total_amount || 0), 0),
          gallons: currentExpenses.reduce((sum, item) => sum + (item.gallons_purchased || 0), 0),
          count: currentExpenses.length
        };
        
        // Calcular fechas del período anterior según la frecuencia
        let previousStart: Date;
        let previousEnd: Date;
        
        const frequency = queryFilters.periodFrequency || 'weekly';
        const periodDuration = endDate.getTime() - startDate.getTime();
        
        if (frequency === 'weekly') {
          // 7 días antes
          previousEnd = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000);
          previousStart = new Date(previousEnd.getTime() - periodDuration);
        } else if (frequency === 'biweekly') {
          // 14 días antes
          previousEnd = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000);
          previousStart = new Date(previousEnd.getTime() - periodDuration);
        } else if (frequency === 'monthly') {
          // Mes anterior
          previousStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, startDate.getDate());
          previousEnd = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
        } else if (frequency === 'quarterly') {
          // Trimestre anterior
          previousStart = new Date(startDate.getFullYear(), startDate.getMonth() - 3, startDate.getDate());
          previousEnd = new Date(endDate.getFullYear(), endDate.getMonth() - 3, endDate.getDate());
        } else if (frequency === 'yearly') {
          // Año anterior
          previousStart = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
          previousEnd = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        } else {
          // Default: usar la misma duración del período
          previousEnd = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000);
          previousStart = new Date(previousEnd.getTime() - periodDuration);
        }
        
        // Convertir a formato de fecha para comparación
        const previousStartStr = formatDateInUserTimeZone(previousStart);
        const previousEndStr = formatDateInUserTimeZone(previousEnd);
        
        // Calcular datos del período anterior
        const previousExpenses = companyData.filter(item => {
          const transactionDate = item.transaction_date;
          return transactionDate >= previousStartStr && transactionDate <= previousEndStr;
        });
        
        previousPeriodData = {
          amount: previousExpenses.reduce((sum, item) => sum + (item.total_amount || 0), 0),
          gallons: previousExpenses.reduce((sum, item) => sum + (item.gallons_purchased || 0), 0),
          count: previousExpenses.length
        };
      }

      // Tendencia mensual (últimos 6 meses) - mantener para compatibilidad
      const now = new Date();
      const monthlyData = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = formatDateInUserTimeZone(date);
        const monthEnd = formatDateInUserTimeZone(new Date(date.getFullYear(), date.getMonth() + 1, 0));
        
        const monthExpenses = companyData.filter(item => {
          const transactionDate = item.transaction_date;
          return transactionDate >= monthStart && transactionDate <= monthEnd;
        });

        const monthTotal = monthExpenses.reduce((sum, item) => sum + (item.total_amount || 0), 0);
        const monthGallons = monthExpenses.reduce((sum, item) => sum + (item.gallons_purchased || 0), 0);

        monthlyData.push({
          month: formatMediumDate(date),
          amount: monthTotal,
          gallons: monthGallons,
          count: monthExpenses.length,
          averagePrice: monthGallons > 0 ? monthTotal / monthGallons : 0
        });
      }

      return {
        totalExpenses,
        totalAmount,
        totalGallons,
        averagePricePerGallon,
        byStatus,
        byFuelType,
        monthlyData,
        pending: byStatus.pending || 0,
        approved: byStatus.approved || 0,
        verified: byStatus.verified || 0,
        currentPeriod: currentPeriodData,
        previousPeriod: previousPeriodData,
        periodFrequency: queryFilters.periodFrequency
      };
    },
    enabled: !!user?.id && !!selectedCompany?.id && enabled,
  });
}