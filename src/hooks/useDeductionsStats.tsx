import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCache } from "./useCompanyCache";
import { useCalculatedPeriods } from "./useCalculatedPeriods";

interface DeductionsStats {
  activeTemplates: number;
  totalMonthlyAmount: number;
  affectedDrivers: number;
}

interface DeductionsStatsFilters {
  activeTab: string;
  driverId?: string;
  expenseTypeId?: string;
  periodFilter?: {
    type: string;
    startDate?: string;
    endDate?: string;
    periodId?: string;
  };
}

export function useDeductionsStats(filters?: DeductionsStatsFilters) {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);

  return useQuery({
    queryKey: ['deductions-stats', user?.id, userCompany?.company_id, filters],
    queryFn: async (): Promise<DeductionsStats> => {
      if (!user?.id || !userCompany?.company_id) {
        return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
      }

      const companyId = userCompany.company_id;

      // ✅ Calcular estadísticas según el tab activo
      if (filters?.activeTab === 'period') {
        return await calculatePeriodDeductionsStats(
          companyId,
          filters,
          calculatedPeriods
        );
      } else if (filters?.activeTab === 'recurring') {
        return await calculateRecurringTemplatesStats(
          companyId,
          filters
        );
      }

      // Por defecto, mostrar stats de recurring templates (compatibilidad)
      return await calculateRecurringTemplatesStats(companyId, filters);

    },
    enabled: !!user?.id && !!userCompany?.company_id,
  });
}

// ====================================
// FUNCIÓN: Calcular stats de Period Deductions
// ====================================
async function calculatePeriodDeductionsStats(
  companyId: string,
  filters: DeductionsStatsFilters,
  calculatedPeriods: any
): Promise<DeductionsStats> {
  try {
    // ✅ Construir query base - ahora incluye TODAS las deducciones del período
    // (eventuales + generadas desde plantillas recurrentes)
    let query = supabase
      .from('expense_instances')
      .select('id, user_id, amount, expense_date, payment_period_id');

    // Aplicar filtro de conductor
    if (filters.driverId && filters.driverId !== 'all') {
      query = query.eq('user_id', filters.driverId);
    }

    // Aplicar filtro de tipo de gasto
    if (filters.expenseTypeId && filters.expenseTypeId !== 'all') {
      query = query.eq('expense_type_id', filters.expenseTypeId);
    }

    // Aplicar filtro de período
    if (filters.periodFilter) {
      if (filters.periodFilter.type === 'specific' && filters.periodFilter.periodId) {
        const periodId = filters.periodFilter.periodId;
        
        if (periodId.startsWith('calculated-')) {
          // Período calculado - usar fechas
          if (filters.periodFilter.startDate && filters.periodFilter.endDate) {
            query = query
              .gte('expense_date', filters.periodFilter.startDate)
              .lte('expense_date', filters.periodFilter.endDate);
          } else {
            return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
          }
        } else {
          // Período real de BD
          query = query.eq('payment_period_id', periodId);
        }
      } else if (filters.periodFilter.startDate && filters.periodFilter.endDate) {
        query = query
          .gte('expense_date', filters.periodFilter.startDate)
          .lte('expense_date', filters.periodFilter.endDate);
      } else if (filters.periodFilter.type === 'current' && calculatedPeriods?.current) {
        query = query
          .gte('expense_date', calculatedPeriods.current.period_start_date)
          .lte('expense_date', calculatedPeriods.current.period_end_date);
      } else if (filters.periodFilter.type === 'previous' && calculatedPeriods?.previous) {
        query = query
          .gte('expense_date', calculatedPeriods.previous.period_start_date)
          .lte('expense_date', calculatedPeriods.previous.period_end_date);
      } else if (filters.periodFilter.type !== 'all') {
        // Si no hay período válido y no es "all", retornar 0
        return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
      }
    } else if (calculatedPeriods?.current) {
      // Sin filtro, usar período actual por defecto
      query = query
        .gte('expense_date', calculatedPeriods.current.period_start_date)
        .lte('expense_date', calculatedPeriods.current.period_end_date);
    }

    const { data: deductions, error } = await query;

    if (error) throw error;
    if (!deductions || deductions.length === 0) {
      return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
    }

    // Calcular estadísticas
    const totalAmount = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
    const uniqueDrivers = new Set(deductions.map(d => d.user_id)).size;

    return {
      activeTemplates: deductions.length,
      totalMonthlyAmount: Math.round(totalAmount * 100) / 100,
      affectedDrivers: uniqueDrivers
    };
  } catch (error) {
    console.error('Error calculating period deductions stats:', error);
    return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
  }
}

// ====================================
// FUNCIÓN: Calcular stats de Recurring Templates
// ====================================
async function calculateRecurringTemplatesStats(
  companyId: string,
  filters?: DeductionsStatsFilters
): Promise<DeductionsStats> {
  try {
    // Obtener usuarios de la empresa
    const { data: companyUsers } = await supabase
      .from('user_company_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['driver', 'dispatcher'])
      .eq('is_active', true);

    if (!companyUsers || companyUsers.length === 0) {
      return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
    }

    const userIds = companyUsers.map(role => role.user_id);

    // Construir query de plantillas
    let query = supabase
      .from('expense_recurring_templates')
      .select('user_id, amount, frequency, expense_type_id')
      .in('user_id', userIds)
      .eq('is_active', true);

    // Aplicar filtro de conductor
    if (filters?.driverId && filters.driverId !== 'all') {
      query = query.eq('user_id', filters.driverId);
    }

    // Aplicar filtro de tipo de gasto
    if (filters?.expenseTypeId && filters.expenseTypeId !== 'all') {
      query = query.eq('expense_type_id', filters.expenseTypeId);
    }

    const { data: templates, error } = await query;

    if (error) throw error;
    if (!templates || templates.length === 0) {
      return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
    }

    // Calcular total mensual
    const totalMonthlyAmount = templates.reduce((sum, template) => {
      let monthlyAmount = 0;
      
      switch (template.frequency) {
        case 'weekly':
          monthlyAmount = template.amount * 4.33;
          break;
        case 'biweekly':
          monthlyAmount = template.amount * 2.17;
          break;
        case 'monthly':
          monthlyAmount = template.amount;
          break;
        default:
          monthlyAmount = template.amount;
      }
      
      return sum + monthlyAmount;
    }, 0);

    const affectedDrivers = new Set(templates.map(t => t.user_id)).size;

    return {
      activeTemplates: templates.length,
      totalMonthlyAmount: Math.round(totalMonthlyAmount * 100) / 100,
      affectedDrivers
    };
  } catch (error) {
    console.error('Error calculating recurring templates stats:', error);
    return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
  }
}