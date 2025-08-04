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
      // Si no hay payment_period_id, intentar generar uno automáticamente
      let finalData = { ...data };
      
      if (!data.payment_period_id && selectedCompany?.id && data.user_id && data.income_date) {
        console.log('🔍 Auto-generating payment period for other income');
        
        const targetDate = formatDateInUserTimeZone(new Date(data.income_date));
        const generatedPeriodId = await ensurePaymentPeriodExists({
          companyId: selectedCompany.id,
          userId: data.user_id,
          targetDate
        });
        
        if (generatedPeriodId) {
          finalData.payment_period_id = generatedPeriodId;
          console.log('✅ Auto-assigned payment period:', generatedPeriodId);
        } else {
          throw new Error('No se pudo encontrar o generar un período de pago para esta fecha');
        }
      }

      // Validar que tenemos payment_period_id
      if (!finalData.payment_period_id) {
        throw new Error('No se pudo asignar un período de pago. Verifique la fecha del ingreso.');
      }

      const { data: result, error } = await supabase
        .from('other_income')
        .insert({
          user_id: finalData.user_id,
          payment_period_id: finalData.payment_period_id,
          description: finalData.description,
          amount: finalData.amount,
          income_type: finalData.income_type,
          income_date: finalData.income_date,
          reference_number: finalData.reference_number,
          notes: finalData.notes,
          applied_to_role: finalData.applied_to_role,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating other income:', error);
        throw error;
      }

      return result;
    },
    onSuccess: async (result) => {
      showSuccess('Otro ingreso creado exitosamente');
      
      // Ejecutar recálculo manual del período
      if (result.payment_period_id) {
        console.log('🔄 Ejecutando recálculo manual del período:', result.payment_period_id);
        try {
          const { error: recalcError } = await supabase.rpc('recalculate_payment_period_totals', {
            target_period_id: result.payment_period_id
          });
          if (recalcError) {
            console.error('Error en recálculo manual:', recalcError);
          } else {
            console.log('✅ Recálculo manual exitoso');
          }
        } catch (err) {
          console.error('Error ejecutando recálculo:', err);
        }
      }
      
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
      const { data: result, error } = await supabase
        .from('other_income')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating other income:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      showSuccess('Ingreso actualizado exitosamente');
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
      // Primero obtener información del ingreso antes de eliminarlo
      const { data: incomeData, error: getError } = await supabase
        .from('other_income')
        .select('payment_period_id')
        .eq('id', id)
        .single();

      if (getError) {
        console.error('Error getting other income data:', getError);
        throw getError;
      }

      const { error } = await supabase
        .from('other_income')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting other income:', error);
        throw error;
      }

      return incomeData;
    },
    onSuccess: async (incomeData) => {
      showSuccess('Ingreso eliminado exitosamente');
      
      // Ejecutar recálculo manual del período
      if (incomeData?.payment_period_id) {
        console.log('🔄 Ejecutando recálculo manual tras eliminación:', incomeData.payment_period_id);
        try {
          const { error: recalcError } = await supabase.rpc('recalculate_payment_period_totals', {
            target_period_id: incomeData.payment_period_id
          });
          if (recalcError) {
            console.error('Error en recálculo manual:', recalcError);
          } else {
            console.log('✅ Recálculo manual exitoso tras eliminación');
          }
        } catch (err) {
          console.error('Error ejecutando recálculo:', err);
        }
      }
      
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