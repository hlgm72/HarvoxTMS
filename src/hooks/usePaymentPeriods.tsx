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

      // Construir query base para períodos - ahora trabaja directamente con user_payment_periods
      // Agruparemos manualmente después
      let query = supabase
        .from('user_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked, user_id')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      // Aplicar filtros adicionales
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: userPeriods, error: periodsError } = await query;

      if (periodsError) {
        throw periodsError;
      }

      // Agrupar por período (start_date, end_date, frequency) para compatibilidad
      const groupedByPeriod = (userPeriods || []).reduce((acc: any[], period) => {
        const key = `${period.period_start_date}-${period.period_end_date}`;
        const existing = acc.find(p => `${p.period_start_date}-${p.period_end_date}` === key);
        
        if (!existing) {
          acc.push({
            id: period.id, // Usar el primer ID como representativo
            company_id: period.company_id,
            period_start_date: period.period_start_date,
            period_end_date: period.period_end_date,
            period_frequency: period.period_frequency,
            status: period.status,
            period_type: period.period_type,
            is_locked: period.is_locked
          });
        }
        return acc;
      }, []);

      return groupedByPeriod;
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

// Hook para obtener el período actual de empresa - solo devuelve períodos reales de BD
export const useCurrentPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-company-payment-period', user?.id, companyId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
      if (!user) throw new Error('User not authenticated');

      const currentDate = getTodayInUserTimeZone();
      
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

      // Buscar período actual abierto de la empresa que incluya la fecha actual
      let { data: period, error } = await supabase
        .from('company_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', targetCompanyId)
        .lte('period_start_date', currentDate)
        .gte('period_end_date', currentDate)
        .in('status', ['open', 'processing'])
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return period || null;
    },
    enabled: !!user,
  });
};

// Hook para obtener el período anterior de empresa - solo devuelve períodos reales de BD
export const usePreviousPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['previous-company-payment-period', user?.id, companyId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
      if (!user) throw new Error('User not authenticated');

      const currentDate = getTodayInUserTimeZone();
      
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

      console.log('🔍 usePreviousPaymentPeriod - Fetching previous period:', {
        currentDate,
        targetCompanyId
      });
      
      // Buscar el período anterior más reciente de user_payment_periods
      const { data: period, error } = await supabase
        .from('user_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', targetCompanyId)
        .lt('period_end_date', currentDate)
        .order('period_end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 usePreviousPaymentPeriod - DB Result:', {
        period,
        error,
        period_start_date: period?.period_start_date,
        period_end_date: period?.period_end_date,
        status: period?.status
      });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return period || null;
    },
    enabled: !!user,
  });
};

// Hook para obtener el siguiente período de pago - solo devuelve períodos reales de BD
export const useNextPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['next-company-payment-period', user?.id, companyId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
      if (!user) throw new Error('User not authenticated');

      const currentDate = getTodayInUserTimeZone();
      
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

      // Buscar el siguiente período de user_payment_periods
      let { data: period, error } = await supabase
        .from('user_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', targetCompanyId)
        .gt('period_start_date', currentDate)
        .order('period_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return period || null;
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