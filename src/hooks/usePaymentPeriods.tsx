import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface PaymentPeriod {
  id: string;
  driver_user_id: string;
  period_start_date: string;
  period_end_date: string;
  period_frequency: string;
  status: string;
  period_type: string;
  is_locked?: boolean;
  total_income?: number;
  driver_name?: string;
}

interface PaymentPeriodsFilters {
  driverUserId?: string;
  status?: string;
  includeDriverName?: boolean;
}

interface ReassignElementParams {
  elementType: 'load' | 'fuel_expense' | 'expense_instance' | 'other_income';
  elementId: string;
  newPeriodId: string;
}

// Hook principal que mantiene compatibilidad con la implementación anterior
export const usePaymentPeriods = (driverUserIdOrFilters?: string | PaymentPeriodsFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Determine if parameter is a string (driverUserId) or filters object
  const filters: PaymentPeriodsFilters = typeof driverUserIdOrFilters === 'string' 
    ? { driverUserId: driverUserIdOrFilters, includeDriverName: true }
    : driverUserIdOrFilters || {};

  const periodsQuery = useQuery({
    queryKey: ['payment-periods', user?.id, filters],
    queryFn: async (): Promise<PaymentPeriod[]> => {
      if (!user) throw new Error('User not authenticated');

      // Obtener la compañía del usuario
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

      // Obtener todos los usuarios de la compañía
      const { data: companyUsers, error: usersError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompanyRole.company_id)
        .eq('is_active', true);

      if (usersError) {
        throw new Error('Error obteniendo usuarios de la compañía');
      }

      const userIds = companyUsers.map(u => u.user_id);

      // Construir query base
      let query = supabase
        .from('payment_periods')
        .select('id, driver_user_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked, total_income')
        .in('driver_user_id', userIds)
        .order('period_start_date', { ascending: false });

      // Aplicar filtros adicionales
      if (filters?.driverUserId) {
        query = query.eq('driver_user_id', filters.driverUserId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: periods, error: periodsError } = await query;

      if (periodsError) {
        throw periodsError;
      }

      // Enriquecer con nombres de conductores si se solicita
      if (filters?.includeDriverName) {
        const driverIds = [...new Set(periods.map(p => p.driver_user_id))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', driverIds);

        return periods.map(period => {
          const profile = profiles?.find(p => p.user_id === period.driver_user_id);
          return {
            ...period,
            driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar'
          };
        });
      }

      return periods;
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
      toast({
        title: "Reasignación exitosa",
        description: (data && typeof data === 'object' && data.message) || "El elemento ha sido reasignado correctamente",
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la reasignación",
        description: error.message || "No se pudo reasignar el elemento",
        variant: "destructive",
      });
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

// Hook para obtener el período actual
export const useCurrentPaymentPeriod = (driverUserId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-payment-period', user?.id, driverUserId],
    queryFn: async (): Promise<PaymentPeriod | null> => {
      if (!user) throw new Error('User not authenticated');

      const currentDate = new Date().toISOString().split('T')[0];
      
      // Si se especifica un conductor, buscar su período actual
      if (driverUserId) {
        const { data: period, error } = await supabase
          .from('payment_periods')
          .select('id, driver_user_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked, total_income')
          .eq('driver_user_id', driverUserId)
          .lte('period_start_date', currentDate)
          .gte('period_end_date', currentDate)
          .eq('status', 'open')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return period || null;
      }

      // Si no hay conductor específico, obtener el período más común de la compañía
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

      // Obtener todos los usuarios de la compañía
      const { data: companyUsers, error: usersError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompanyRole.company_id)
        .eq('is_active', true);

      if (usersError) {
        return null;
      }

      const userIds = companyUsers.map(u => u.user_id);

      // Buscar períodos actuales abiertos
      const { data: periods, error: periodsError } = await supabase
        .from('payment_periods')
        .select('id, driver_user_id, period_start_date, period_end_date, period_frequency, status, period_type, is_locked, total_income')
        .in('driver_user_id', userIds)
        .lte('period_start_date', currentDate)
        .gte('period_end_date', currentDate)
        .eq('status', 'open')
        .limit(1);

      if (periodsError) {
        throw periodsError;
      }

      return periods.length > 0 ? periods[0] : null;
    },
    enabled: !!user,
  });
};