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

export function useOtherIncome(filters: { driverId?: string; periodId?: string; status?: string } = {}) {
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
    onSuccess: async (result) => {
      showSuccess('Otro ingreso creado exitosamente con ACID');
      
      queryClient.invalidateQueries({ 
        queryKey: ['other-income', user?.id, selectedCompany?.id] 
      });
      // Invalidar también los cálculos del período del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['driver-period-calculations'] 
      });
      // Invalidar los resúmenes de períodos de pago para actualizar contadores
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['all-payment-periods-summary'] 
      });
    },
    onError: (error) => {
      console.error('Error creating other income:', error);
      showError('No se pudo crear el ingreso');
    },
  });
}

export function useUpdateOtherIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateOtherIncomeData) => {
      // ✅ USE ACID FUNCTION FOR ATOMIC UPDATE
      const { data: result, error } = await supabase.rpc(
        'update_other_income_with_validation',
        {
          income_id: id,
          income_data: data
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
    onSuccess: () => {
      showSuccess('Ingreso actualizado exitosamente con ACID');
      queryClient.invalidateQueries({ 
        queryKey: ['other-income', user?.id, selectedCompany?.id] 
      });
      // Invalidar también los cálculos del período del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['driver-period-calculations'] 
      });
      // Invalidar los resúmenes de períodos de pago para actualizar contadores
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['all-payment-periods-summary'] 
      });
    },
    onError: (error) => {
      console.error('Error updating other income:', error);
      showError('No se pudo actualizar el ingreso');
    },
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
    onSuccess: async (result) => {
      showSuccess('Ingreso eliminado exitosamente con ACID');
      
      queryClient.invalidateQueries({ 
        queryKey: ['other-income', user?.id, selectedCompany?.id] 
      });
      // Invalidar también los cálculos del período del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['driver-period-calculations'] 
      });
      // Invalidar los resúmenes de períodos de pago para actualizar contadores
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['all-payment-periods-summary'] 
      });
    },
    onError: (error) => {
      console.error('Error deleting other income:', error);
      showError('No se pudo eliminar el ingreso');
    },
  });
}