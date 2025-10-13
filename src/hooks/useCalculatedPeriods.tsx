import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateCurrentPeriod, calculatePreviousPeriod, calculateNextPeriod } from '@/utils/periodCalculations';

export interface CalculatedPeriod {
  id: string;
  company_id: string;
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  status: string;
  period_type: string;
  is_calculated: boolean; // Flag para indicar que es calculado
}

/**
 * Hook separado para obtener períodos calculados dinámicamente
 * Estos se usan solo para mostrar en el dropdown, no para consultas a BD
 */
export const useCalculatedPeriods = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['calculated-periods', user?.id, companyId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Obtener la compañía del usuario si no se especifica
      let targetCompanyId = companyId;
      
      if (!targetCompanyId) {
        const { data: userCompanyRole, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (companyError || !userCompanyRole) {
          return { current: null, previous: null, next: null };
        }
        
        targetCompanyId = userCompanyRole.company_id;
      }

      // Obtener configuración de la empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('default_payment_frequency, payment_cycle_start_day')
        .eq('id', targetCompanyId)
        .single();

      if (companyError || !companyData) {
        return { current: null, previous: null, next: null };
      }

      const companyConfig = {
        default_payment_frequency: companyData.default_payment_frequency as 'weekly' | 'biweekly' | 'monthly',
        payment_cycle_start_day: companyData.payment_cycle_start_day || 1
      };

      // Calcular los tres períodos
      const currentCalc = calculateCurrentPeriod(companyConfig);
      const previousCalc = calculatePreviousPeriod(companyConfig);
      const nextCalc = calculateNextPeriod(companyConfig);

      const current: CalculatedPeriod = {
        id: 'calculated-current',
        company_id: targetCompanyId,
        period_start_date: currentCalc.startDate,
        period_end_date: currentCalc.endDate,
        period_frequency: currentCalc.frequency,
        status: 'calculated',
        period_type: 'regular',
        is_calculated: true
      };

      const previous: CalculatedPeriod = {
        id: 'calculated-previous',
        company_id: targetCompanyId,
        period_start_date: previousCalc.startDate,
        period_end_date: previousCalc.endDate,
        period_frequency: previousCalc.frequency,
        status: 'calculated',
        period_type: 'regular',
        is_calculated: true
      };

      const next: CalculatedPeriod = {
        id: 'calculated-next',
        company_id: targetCompanyId,
        period_start_date: nextCalc.startDate,
        period_end_date: nextCalc.endDate,
        period_frequency: nextCalc.frequency,
        status: 'calculated',
        period_type: 'regular',
        is_calculated: true
      };

      return { current, previous, next };
    },
    enabled: !!user,
  });
};

/**
 * Hook para obtener un período calculado específico
 */
export const useCalculatedPeriod = (type: 'current' | 'previous' | 'next', companyId?: string) => {
  const { data: periods } = useCalculatedPeriods(companyId);
  
  return periods?.[type] || null;
};