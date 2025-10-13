import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFleetNotifications } from "@/components/notifications";

// Tipos para las exclusiones
export interface RecurringExpenseExclusion {
  id: string;
  user_id: string;
  recurring_template_id: string;
  payment_period_id: string;
  excluded_by: string;
  excluded_at: string;
  reason?: string;
  created_at: string;
}

export interface PaymentPeriodForExclusion {
  id: string;
  period_start_date: string;
  period_end_date: string;
  status: string;
  is_excluded: boolean;
}

// Hook para obtener períodos disponibles para exclusión
export const usePaymentPeriodsForExclusion = (userId: string, templateId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-periods-for-exclusion', user?.id, userId, templateId],
    queryFn: async () => {
      if (!user?.id || !userId || !templateId) return [];

      // Obtener la empresa del usuario actual
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userRoles || userRoles.length === 0) return [];
      
      const companyId = userRoles[0].company_id;

      // Obtener períodos abiertos de la empresa para este usuario
      const { data: periods, error: periodsError } = await supabase
        .from('user_payrolls')
        .select(`
          id,
          status,
        period:company_payment_periods!company_payment_period_id(
          period_start_date,
          period_end_date
        )
        `)
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: true });

      if (periodsError) throw periodsError;

      if (!periods || periods.length === 0) return [];

      // Obtener exclusiones existentes para esta plantilla
      const { data: exclusions, error: exclusionsError } = await supabase
        .from('recurring_expense_exclusions')
        .select('payment_period_id')
        .eq('user_id', userId)
        .eq('recurring_template_id', templateId);

      if (exclusionsError) throw exclusionsError;

      const excludedPeriodIds = new Set(exclusions?.map(e => e.payment_period_id) || []);

      // Mark periods as excluded
      const periodsWithExclusionStatus = periods.map(period => {
        const pData = period as any;
        return {
          id: pData.id,
          period_start_date: pData.period?.period_start_date,
          period_end_date: pData.period?.period_end_date,
          status: pData.status,
          is_excluded: excludedPeriodIds.has(pData.id)
        };
      });

      return periodsWithExclusionStatus as PaymentPeriodForExclusion[];
    },
    enabled: !!user?.id && !!userId && !!templateId,
  });
};

// Hook para excluir una deducción recurrente de un período
export const useExcludeRecurringExpense = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      templateId: string;
      periodId: string;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase.rpc('exclude_recurring_expense_from_period', {
        target_user_id: params.userId,
        template_id: params.templateId,
        period_id: params.periodId,
        exclusion_reason: params.reason
      });

      if (error) throw error;

      if (!(data as any)?.success) {
        throw new Error((data as any)?.message || 'Error excluyendo deducción');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      showSuccess(
        'Exclusión aplicada',
        `La deducción ha sido excluida del período exitosamente`
      );
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['payment-periods-for-exclusion', user?.id, variables.userId, variables.templateId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['recurring-expense-exclusions'] 
      });
    },
    onError: (error: any) => {
      showError('Error', error.message || 'No se pudo excluir la deducción');
    }
  });
};

// Hook para restaurar una deducción recurrente a un período
export const useRestoreRecurringExpense = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      templateId: string;
      periodId: string;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase.rpc('restore_recurring_expense_to_period', {
        target_user_id: params.userId,
        template_id: params.templateId,
        period_id: params.periodId
      });

      if (error) throw error;

      if (!(data as any)?.success) {
        throw new Error((data as any)?.message || 'Error restaurando deducción');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      showSuccess(
        'Deducción restaurada',
        `La deducción ha sido restaurada al período exitosamente`
      );
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['payment-periods-for-exclusion', user?.id, variables.userId, variables.templateId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['recurring-expense-exclusions'] 
      });
    },
    onError: (error: any) => {
      showError('Error', error.message || 'No se pudo restaurar la deducción');
    }
  });
};