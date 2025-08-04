import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { getTodayInUserTimeZone, formatDateInUserTimeZone } from '@/utils/dateUtils';
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

// Hook para obtener el período actual de empresa con auto-generación
export const useCurrentPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();

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

      // Buscar período actual abierto de la empresa
      let { data: period, error } = await supabase
        .from('company_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', targetCompanyId)
        .lte('period_start_date', currentDate)
        .gte('period_end_date', currentDate)
        .eq('status', 'open')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Si no existe período para la fecha actual, intentar generar uno
      if (!period) {
        const generatedPeriodId = await ensurePaymentPeriodExists({
          companyId: targetCompanyId,
          userId: user.id,
          targetDate: currentDate
        });

        // Si se generó exitosamente, buscar el período nuevamente
        if (generatedPeriodId) {
          const { data: newPeriod, error: newError } = await supabase
            .from('company_payment_periods')
            .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
            .eq('id', generatedPeriodId)
            .single();

          if (!newError) {
            period = newPeriod;
          }
        }
      }

      return period || null;
    },
    enabled: !!user,
  });
};

// Hook para obtener el período anterior de empresa
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

      // Buscar el período anterior (el período que terminó justo antes de la fecha actual)
      const { data: period, error } = await supabase
        .from('company_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', targetCompanyId)
        .lt('period_end_date', currentDate)
        .order('period_end_date', { ascending: false })
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

// Hook para obtener el siguiente período de pago con auto-generación
export const useNextPaymentPeriod = (companyId?: string) => {
  const { user } = useAuth();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();

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

      // Buscar el siguiente período (el período que comienza después de la fecha actual)
      let { data: period, error } = await supabase
        .from('company_payment_periods')
        .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
        .eq('company_id', targetCompanyId)
        .gt('period_start_date', currentDate)
        .order('period_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Si no existe período siguiente, intentar generar períodos futuros
      if (!period) {
        // Calcular fecha del próximo período (una semana después) manteniendo zona horaria
        const [year, month, day] = currentDate.split('-').map(Number);
        const nextPeriodDate = new Date(year, month - 1, day); // Crear fecha local
        nextPeriodDate.setDate(nextPeriodDate.getDate() + 7);
        const nextDateString = formatDateInUserTimeZone(nextPeriodDate);

        const generatedPeriodId = await ensurePaymentPeriodExists({
          companyId: targetCompanyId,
          userId: user.id,
          targetDate: nextDateString
        });

        // Si se generó exitosamente, buscar el siguiente período nuevamente
        if (generatedPeriodId) {
          const { data: newPeriod, error: newError } = await supabase
            .from('company_payment_periods')
            .select('id, company_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked')
            .eq('company_id', targetCompanyId)
            .gt('period_start_date', currentDate)
            .order('period_start_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!newError) {
            period = newPeriod;
          }
        }
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