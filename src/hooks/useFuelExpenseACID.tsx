import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';

interface FuelExpenseData {
  payment_period_id: string;
  driver_user_id: string;
  transaction_date?: string;
  gallons_purchased?: number;
  price_per_gallon?: number;
  total_amount?: number;
  station_name?: string;
  station_state?: string;
  card_last_five?: string;
  fuel_type?: string;
  fees?: number;
  discount_amount?: number;
  gross_amount?: number;
  notes?: string;
  receipt_url?: string;
  is_verified?: boolean;
  status?: string;
}

interface CreateOrUpdateFuelExpenseParams {
  expenseData: FuelExpenseData;
  expenseId?: string; // Si existe, es update; si no, es create
}

export const useFuelExpenseACID = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateOrUpdateFuelExpenseParams): Promise<void> => {
      console.log('🔄 useFuelExpenseACID - Procesando gasto:', params);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_or_update_fuel_expense_with_validation', {
        expense_data: params.expenseData as any,
        expense_id: params.expenseId || null
      });

      if (error) {
        console.error('❌ useFuelExpenseACID - Error:', error);
        throw new Error(error.message);
      }

      if (!(data as any)?.success) {
        console.error('❌ useFuelExpenseACID - RPC error:', (data as any)?.message);
        throw new Error((data as any)?.message || 'Error procesando gasto de combustible');
      }

      console.log('✅ useFuelExpenseACID - Operación exitosa:', data);
    },
    onSuccess: (_, params) => {
      const isUpdate = !!params.expenseId;
      console.log(`✅ useFuelExpenseACID - ${isUpdate ? 'Actualización' : 'Creación'} completada`);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats'] });
      queryClient.invalidateQueries({ queryKey: ['driver-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      
      showSuccess(
        isUpdate 
          ? 'Gasto de combustible actualizado exitosamente'
          : 'Gasto de combustible creado exitosamente'
      );
    },
    onError: (error: Error) => {
      console.error('❌ useFuelExpenseACID - Error:', error);
      showError(`Error: ${error.message}`);
    },
  });
};