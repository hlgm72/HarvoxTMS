import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFleetNotifications } from '@/components/notifications';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';

export interface CreateOtherIncomeData {
  user_id: string;
  payment_period_id?: string;
  description: string;
  amount: number;
  income_type: string;
  income_date: string;
  reference_number?: string;
  notes?: string;
  status?: 'pending' | 'approved' | 'rejected';
  applied_to_role: 'driver' | 'dispatcher' | 'operations_manager' | 'company_owner';
}

export interface UpdateOtherIncomeData extends Partial<CreateOtherIncomeData> {
  id: string;
}

export function useOtherIncome(filters: { driverId?: string; periodId?: string; status?: string; startDate?: string; endDate?: string; userRole?: string } = {}) {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();

  return useQuery({
    queryKey: ['other-income', user?.id, selectedCompany?.id, filters],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) {
        throw new Error('User or company not found');
      }

      let query = supabase
        .from('other_income')
        .select('*')
        .order('income_date', { ascending: false });

      // Aplicar filtros
      if (filters.driverId && filters.driverId !== 'all') {
        query = query.eq('user_id', filters.driverId);
      }

      if (filters.periodId && filters.periodId !== 'all') {
        query = query.eq('payment_period_id', filters.periodId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Filter by date range
      if (filters.startDate) {
        query = query.gte('income_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('income_date', filters.endDate);
      }

      // Filter by user role
      if (filters.userRole && filters.userRole !== 'all') {
        query = query.eq('applied_to_role', filters.userRole as any);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching other income:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });
}

export function useCreateOtherIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();

  return useMutation({
    mutationFn: async (data: CreateOtherIncomeData) => {
      console.log('🔍 Creating other income with ACID guarantees...');
      
      // ✅ USE ACID FUNCTION FOR ATOMIC OPERATION
      const { data: result, error } = await supabase.rpc(
        'create_other_income_with_validation',
        {
          income_data: {
            user_id: data.user_id,
            description: data.description,
            amount: data.amount,
            income_type: data.income_type,
            income_date: data.income_date,
            reference_number: data.reference_number || '',
            notes: data.notes || '',
            applied_to_role: data.applied_to_role,
            status: data.status || 'approved'
          }
        }
      );

      if (error) {
        console.error('Error creating other income with ACID:', error);
        throw new Error(error.message || 'Error al crear el ingreso con ACID');
      }

      console.log('✅ Other income created with ACID:', result);
      
      // Verificar que el resultado es un objeto válido
      if (result && typeof result === 'object' && 'success' in result) {
        return (result as any).income;
      }
      
      throw new Error('Respuesta inválida del servidor');
    },
    // 🚀 OPTIMISTIC UPDATE: Actualizar UI inmediatamente
    onMutate: async (newIncome) => {
      // Cancelar queries en progreso para evitar que sobrescriban nuestro optimistic update
      await queryClient.cancelQueries({ queryKey: ['other-income'] });
      await queryClient.cancelQueries({ queryKey: ['payment-calculations-reports'] });
      
      // Guardar snapshot del estado anterior por si necesitamos revertir
      const previousOtherIncome = queryClient.getQueryData(['other-income']);
      
      // Crear un temporary ID para el nuevo income
      const optimisticIncome = {
        id: `temp-${Date.now()}`,
        ...newIncome,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: newIncome.status || 'approved',
        reference_number: newIncome.reference_number || '',
        notes: newIncome.notes || ''
      };
      
      // Actualizar optimísticamente el cache de other-income
      queryClient.setQueryData(['other-income'], (old: any) => {
        if (!old) return [optimisticIncome];
        return [optimisticIncome, ...old];
      });
      
      console.log('🚀 Optimistic update applied for new other income');
      
      // Retornar contexto con el snapshot para poder revertir si falla
      return { previousOtherIncome, optimisticIncome };
    },
    // ❌ Si hay error, revertir al estado anterior
    onError: (error, newIncome, context) => {
      console.error('❌ Error creating other income, reverting optimistic update:', error);
      
      if (context?.previousOtherIncome) {
        queryClient.setQueryData(['other-income'], context.previousOtherIncome);
      }
      
      showError('No se pudo crear el ingreso');
    },
    onSuccess: async (result) => {
      showSuccess('Ingreso adicional creado exitosamente');
      
      // Invalidar todas las queries de other-income sin importar los filtros
      queryClient.invalidateQueries({ 
        queryKey: ['other-income'] 
      });
      // Invalidar también los cálculos del período del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['user-period-calculations']
      });
      // Invalidar los resúmenes de períodos de pago para actualizar contadores
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['all-payment-periods-summary'] 
      });
      // Invalidar semanas disponibles para actualizar filtros
      queryClient.invalidateQueries({ queryKey: ['available-weeks'] });
      // Invalidar Payment Report Dialog queries
      queryClient.invalidateQueries({ queryKey: ['period-other-income'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculation-detail'] });
      // Invalidar Financial Summary
      queryClient.invalidateQueries({ queryKey: ['driver-financial-summary'] });
      // 🔧 CRÍTICO: Invalidar payment-calculations-reports para refrescar PaymentReports.tsx
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
    }
  });
}

export function useUpdateOtherIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateOtherIncomeData) => {
      console.log('Updating other income with data:', { id, ...data });
      
      // ✅ USE ACID FUNCTION FOR ATOMIC UPDATE - Updated signature
      const { data: result, error } = await supabase.rpc(
        'update_other_income_with_validation',
        {
          update_data: { id, ...data }
        }
      );

      if (error) {
        console.error('Error updating other income with ACID:', error);
        throw new Error(error.message || 'Error al actualizar el ingreso con ACID');
      }

      if (!(result as any)?.success) {
        throw new Error('La actualización ACID no fue exitosa');
      }

      return (result as any).income;
    },
    // 🚀 OPTIMISTIC UPDATE: Actualizar UI inmediatamente
    onMutate: async (updatedIncome) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['other-income'] });
      await queryClient.cancelQueries({ queryKey: ['payment-calculations-reports'] });
      await queryClient.cancelQueries({ queryKey: ['payment-calculation-detail'] });
      
      // Guardar snapshot del estado anterior
      const previousOtherIncome = queryClient.getQueryData(['other-income']);
      const previousCalculationDetail = queryClient.getQueryData(['payment-calculation-detail', updatedIncome.id]);
      
      // Actualizar optimísticamente el cache de other-income
      queryClient.setQueryData(['other-income'], (old: any) => {
        if (!old) return old;
        return old.map((income: any) => 
          income.id === updatedIncome.id 
            ? { ...income, ...updatedIncome, updated_at: new Date().toISOString() }
            : income
        );
      });
      
      console.log('🚀 Optimistic update applied for other income:', updatedIncome.id);
      
      // Retornar contexto con snapshots
      return { previousOtherIncome, previousCalculationDetail };
    },
    // ❌ Si hay error, revertir al estado anterior
    onError: (error, updatedIncome, context) => {
      console.error('❌ Error updating other income, reverting optimistic update:', error);
      
      if (context?.previousOtherIncome) {
        queryClient.setQueryData(['other-income'], context.previousOtherIncome);
      }
      if (context?.previousCalculationDetail) {
        queryClient.setQueryData(['payment-calculation-detail', updatedIncome.id], context.previousCalculationDetail);
      }
      
      showError('No se pudo actualizar el ingreso');
    },
    onSuccess: () => {
      showSuccess('Ingreso adicional actualizado exitosamente');
      
      // Invalidar todas las queries de other-income sin importar los filtros
      queryClient.invalidateQueries({ 
        queryKey: ['other-income'] 
      });
      // Invalidar también los cálculos del período del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['user-period-calculations']
      });
      // Invalidar los resúmenes de períodos de pago para actualizar contadores
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['all-payment-periods-summary'] 
      });
      // Invalidar semanas disponibles para actualizar filtros
      queryClient.invalidateQueries({ queryKey: ['available-weeks'] });
      // Invalidar Payment Report Dialog queries
      queryClient.invalidateQueries({ queryKey: ['period-other-income'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculation-detail'] });
      // Invalidar Financial Summary
      queryClient.invalidateQueries({ queryKey: ['driver-financial-summary'] });
      // 🔧 CRÍTICO: Invalidar payment-calculations-reports para refrescar PaymentReports.tsx
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
    }
  });
}

export function useDeleteOtherIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (id: string) => {
      // ✅ USE ACID FUNCTION FOR ATOMIC DELETION
      const { data: result, error } = await supabase.rpc(
        'delete_other_income_with_validation',
        {
          income_id: id
        }
      );

      if (error) {
        console.error('Error deleting other income with ACID:', error);
        throw new Error(error.message || 'Error al eliminar el ingreso con ACID');
      }

      if (!(result as any)?.success) {
        throw new Error('La eliminación ACID no fue exitosa');
      }

      return result;
    },
    // 🚀 OPTIMISTIC UPDATE: Actualizar UI inmediatamente
    onMutate: async (deletedId) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['other-income'] });
      await queryClient.cancelQueries({ queryKey: ['payment-calculations-reports'] });
      
      // Guardar snapshot del estado anterior
      const previousOtherIncome = queryClient.getQueryData(['other-income']);
      
      // Remover optimísticamente del cache
      queryClient.setQueryData(['other-income'], (old: any) => {
        if (!old) return old;
        return old.filter((income: any) => income.id !== deletedId);
      });
      
      console.log('🚀 Optimistic delete applied for other income:', deletedId);
      
      // Retornar contexto con el snapshot
      return { previousOtherIncome, deletedId };
    },
    // ❌ Si hay error, revertir al estado anterior
    onError: (error, deletedId, context) => {
      console.error('❌ Error deleting other income, reverting optimistic update:', error);
      
      if (context?.previousOtherIncome) {
        queryClient.setQueryData(['other-income'], context.previousOtherIncome);
      }
      
      showError('No se pudo eliminar el ingreso');
    },
    onSuccess: async (result) => {
      showSuccess('Ingreso adicional eliminado exitosamente');
      
      // Invalidar todas las queries de other-income sin importar los filtros
      queryClient.invalidateQueries({ 
        queryKey: ['other-income'] 
      });
      // Invalidar también los cálculos del período del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['user-period-calculations'] 
      });
      // Invalidar los resúmenes de períodos de pago para actualizar contadores
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['all-payment-periods-summary'] 
      });
      // Invalidar semanas disponibles para actualizar filtros
      queryClient.invalidateQueries({ queryKey: ['available-weeks'] });
      // Invalidar Payment Report Dialog queries
      queryClient.invalidateQueries({ queryKey: ['period-other-income'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculation-detail'] });
      // Invalidar Financial Summary
      queryClient.invalidateQueries({ queryKey: ['driver-financial-summary'] });
      // 🔧 CRÍTICO: Invalidar payment-calculations-reports para refrescar PaymentReports.tsx
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
    }
  });
}