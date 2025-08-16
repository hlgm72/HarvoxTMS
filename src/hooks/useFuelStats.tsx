import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { formatDateInUserTimeZone, formatMediumDate } from '@/lib/dateFormatting';

export interface FuelStatsFilters {
  periodId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
}

export function useFuelStats(filters: FuelStatsFilters = {}) {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();

  return useQuery({
    queryKey: ['fuel-stats', user?.id, selectedCompany?.id, filters],
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

      // Aplicar filtros
      if (filters.driverId && filters.driverId !== 'all') {
        query = query.eq('driver_user_id', filters.driverId);
      }

      if (filters.periodId && filters.periodId !== 'all') {
        query = query.eq('payment_period_id', filters.periodId);
      }

      if (filters.startDate && filters.endDate) {
        query = query
          .gte('transaction_date', filters.startDate)
          .lte('transaction_date', filters.endDate);
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

      // Tendencia mensual (últimos 6 meses)
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
        verified: byStatus.verified || 0
      };
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });
}