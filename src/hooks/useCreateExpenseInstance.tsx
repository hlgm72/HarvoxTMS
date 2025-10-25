import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreateExpenseInstanceData {
  payment_period_id: string;
  expense_type_id: string;
  user_id: string;
  amount: number;
  description?: string;
  expense_date?: string;
}

export function useCreateExpenseInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseData: CreateExpenseInstanceData) => {
      const { data, error } = await supabase.rpc('create_expense_instance_with_validation', {
        expense_data: expenseData as any
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('✅ Deducción creada exitosamente');
      
      // Invalidar todas las queries relacionadas para que se actualicen automáticamente
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['driver-payment-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-integrity'] });
      
      // Invalidar queries específicas del conductor
      queryClient.invalidateQueries({ 
        queryKey: ['user-period-calculations', variables.user_id] 
      });
      
      // Invalidar queries del período específico
      queryClient.invalidateQueries({ 
        queryKey: ['payment-period-summary', variables.payment_period_id] 
      });
      
      // Invalidar semanas disponibles para actualizar filtros
      queryClient.invalidateQueries({ queryKey: ['available-weeks'] });
    },
    onError: (error: any) => {
      console.error('Error creating expense instance:', error);
      
      // Manejo de errores específicos
      const errorMessage = error.message || 'Error desconocido';
      
      if (errorMessage.includes('ERROR_USER_NOT_AUTHENTICATED')) {
        toast.error('❌ Usuario no autenticado');
      } else if (errorMessage.includes('ERROR_PAYMENT_PERIOD_REQUIRED')) {
        toast.error('❌ Período de pago requerido');
      } else if (errorMessage.includes('ERROR_PAYMENT_PERIOD_NOT_FOUND')) {
        toast.error('❌ Período de pago no encontrado');
      } else if (errorMessage.includes('ERROR_NO_PERMISSIONS_MANAGE_EXPENSE_INSTANCES')) {
        toast.error('❌ Sin permisos para gestionar deducciones');
      } else if (errorMessage.includes('ERROR_AMOUNT_REQUIRED')) {
        toast.error('❌ Monto requerido');
      } else if (errorMessage.includes('ERROR_EXPENSE_TYPE_REQUIRED')) {
        toast.error('❌ Tipo de gasto requerido');
      } else if (errorMessage.includes('ERROR_USER_ID_REQUIRED')) {
        toast.error('❌ ID de usuario requerido');
      } else {
        toast.error(`❌ Error creando deducción: ${errorMessage}`);
      }
    },
  });
}