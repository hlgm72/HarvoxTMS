import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { getTodayInUserTimeZone, formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { usePaymentPeriodGenerator } from './usePaymentPeriodGenerator';

export interface PaymentPeriod {
  id: string;
  company_id: string;
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  status: string;
  period_type: string;
  is_locked?: boolean;
}

interface PaymentPeriodsFilters {
  companyId?: string;
  status?: string;
}

interface ReassignElementParams {
  elementType: 'load' | 'fuel_expense' | 'expense_instance' | 'other_income';
  elementId: string;
  newPeriodId: string;
}

// Hook principal actualizado para company_payment_periods
export const usePaymentPeriods = (companyIdOrFilters?: string | PaymentPeriodsFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  // Determine if parameter is a string (companyId) or filters object
  const filters: PaymentPeriodsFilters = typeof companyIdOrFilters === 'string' 
    ? { companyId: companyIdOrFilters }
    : companyIdOrFilters || {};

  const periodsQuery = useQuery({
    queryKey: ['company-payment-periods', user?.id, filters],
    queryFn: async (): Promise<PaymentPeriod[]> => {
      if (!user) throw new Error('User not authenticated');

      // Obtener la compañía del usuario si no se especifica
      let companyId = filters.companyId;
      
      if (!companyId) {
        const { data: userCompanyRole, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (companyError || !userCompanyRole) {
          throw new Error('No se pudo obtener la compañía del usuario');
        }
        
        companyId = userCompanyRole.company_id;
      }

      // Construir query base para períodos de empresa
      let query = supabase
        .from('company_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      // Aplicar filtros adicionales
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: periods, error: periodsError } = await query;

      if (periodsError) {
        throw periodsError;
      }

      return periods || [];
    },
    enabled: !!user,
  });

  const reassignMutation = useMutation({
    mutationFn: async (params: ReassignElementParams) => {
      const { data, error } = await supabase.rpc('reassign_to_payment_period', {
        element_type: params.elementType,
        element_id: params.elementId,
        new_period_id: params.newPeriodId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      showSuccess('El elemento ha sido reasignado correctamente');
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
    onError: (error: any) => {
      showError(error.message || 'No se pudo reasignar el elemento');
    },
  });

  // Mantener compatibilidad con la interfaz anterior
  return {
    ...periodsQuery,
    paymentPeriods: periodsQuery.data,
    reassignElement: reassignMutation.mutate,
    isReassigningElement: reassignMutation.isPending,
  };
};

// Hook para obtener el período actual calculado dinámicamente
export const useCurrentPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-company-payment-period', user?.id, companyId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
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
          return null;
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
        return null;
      }

      // Importar y usar el calculador de períodos
      const { calculateCurrentPeriod } = await import('@/utils/periodCalculations');
      
      const calculatedPeriod = calculateCurrentPeriod({
        default_payment_frequency: companyData.default_payment_frequency as 'weekly' | 'biweekly' | 'monthly',
        payment_cycle_start_day: companyData.payment_cycle_start_day || 1
      });

      // Devolver período calculado dinámicamente en formato PaymentPeriod
      return {
        id: 'calculated-current',
        company_id: targetCompanyId,
        period_start_date: calculatedPeriod.startDate,
        period_end_date: calculatedPeriod.endDate,
        period_frequency: calculatedPeriod.frequency,
        status: 'calculated',
        period_type: 'regular'
      };
    },
    enabled: !!user,
  });
};

// Hook para obtener el período anterior calculado dinámicamente
export const usePreviousPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['previous-company-payment-period', user?.id, companyId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
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
          return null;
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
        return null;
      }

      // Importar y usar el calculador de períodos
      const { calculatePreviousPeriod } = await import('@/utils/periodCalculations');
      
      const calculatedPeriod = calculatePreviousPeriod({
        default_payment_frequency: companyData.default_payment_frequency as 'weekly' | 'biweekly' | 'monthly',
        payment_cycle_start_day: companyData.payment_cycle_start_day || 1
      });

      // Devolver período calculado dinámicamente en formato PaymentPeriod
      return {
        id: 'calculated-previous',
        company_id: targetCompanyId,
        period_start_date: calculatedPeriod.startDate,
        period_end_date: calculatedPeriod.endDate,
        period_frequency: calculatedPeriod.frequency,
        status: 'calculated',
        period_type: 'regular'
      };
    },
    enabled: !!user,
  });
};

// Hook para obtener el próximo período calculado dinámicamente
export const useNextPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['next-company-payment-period', user?.id, companyId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
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
          return null;
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
        return null;
      }

      // Importar y usar el calculador de períodos
      const { calculateNextPeriod } = await import('@/utils/periodCalculations');
      
      const calculatedPeriod = calculateNextPeriod({
        default_payment_frequency: companyData.default_payment_frequency as 'weekly' | 'biweekly' | 'monthly',
        payment_cycle_start_day: companyData.payment_cycle_start_day || 1
      });

      // Devolver período calculado dinámicamente en formato PaymentPeriod
      return {
        id: 'calculated-next',
        company_id: targetCompanyId,
        period_start_date: calculatedPeriod.startDate,
        period_end_date: calculatedPeriod.endDate,
        period_frequency: calculatedPeriod.frequency,
        status: 'calculated',
        period_type: 'regular'
      };
    },
    enabled: !!user,
  });
};

export const useReassignElement = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (params: ReassignElementParams) => {
      const { data, error } = await supabase.rpc('reassign_to_payment_period', {
        element_type: params.elementType,
        element_id: params.elementId,
        new_period_id: params.newPeriodId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      showSuccess('El elemento ha sido reasignado correctamente');
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
    onError: (error: any) => {
      showError(error.message || 'No se pudo reasignar el elemento');
    },
  });
};