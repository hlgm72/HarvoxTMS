import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useTranslation } from "react-i18next";

interface CancelAutomaticDeductionParams {
  expenseInstanceId: string;
  userId: string;
  paymentPeriodId: string;
  cancellationNote: string;
}

export function useCancelAutomaticDeduction() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('payments');

  return useMutation({
    mutationFn: async ({ 
      expenseInstanceId, 
      userId, 
      paymentPeriodId,
      cancellationNote 
    }: CancelAutomaticDeductionParams) => {
      // 1. Cambiar el status a 'cancelled' en lugar de eliminar
      console.log('🔍 [Cancel] Step 1: Updating expense instance to cancelled');
      const { error: updateError } = await supabase
        .from('expense_instances')
        .update({ 
          status: 'cancelled',
          notes: cancellationNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseInstanceId);

      if (updateError) {
        console.error('❌ [Cancel] Error updating expense instance:', updateError);
        throw updateError;
      }
      console.log('✅ [Cancel] Expense instance updated successfully');

      // 2. Obtener el user_payroll correspondiente a este periodo y usuario
      console.log('🔍 [Cancel] Step 2: Fetching user_payroll for:', { userId, paymentPeriodId });
      const { data: payrollData, error: payrollError } = await supabase
        .from('user_payrolls')
        .select('id, gross_earnings, other_income, fuel_expenses, total_deductions')
        .eq('user_id', userId)
        .eq('company_payment_period_id', paymentPeriodId)
        .maybeSingle();

      if (payrollError) {
        console.error('❌ [Cancel] Error fetching payroll:', payrollError);
        return { recalculated: false, payrollDeleted: false };
      }

      // Si no existe payroll, no hay nada más que hacer
      if (!payrollData) {
        console.log('⚠️ [Cancel] No payroll found - deduction cancelled but no payroll to delete');
        return { recalculated: false, payrollDeleted: false };
      }

      console.log('✅ [Cancel] Payroll found:', payrollData);

      // 3. Recalcular el payroll del usuario usando el RPC con el user_payroll_id correcto
      console.log('🔍 [Cancel] Step 3: Recalculating payroll with ID:', payrollData.id);
      const { error: recalcError } = await supabase
        .rpc('calculate_user_payment_period_with_validation', {
          calculation_id: payrollData.id  // Usar el ID del user_payroll, no el company_payment_period_id
        });

      if (recalcError) {
        console.error('❌ [Cancel] Error recalculating payroll:', recalcError);
        showError(
          t("deductions.notifications.warning"),
          "La deducción fue cancelada pero hubo un problema al recalcular el payroll"
        );
        return { recalculated: false, payrollDeleted: false };
      }
      console.log('✅ [Cancel] Payroll recalculated successfully');

      // 4. ✅ NUEVO: Mantener el payroll aunque quede vacío (net_pay=0)
      // Esto permite marcar el payroll manualmente como PAGADO más tarde
      // Al pagarlo, las instancias 'cancelled' se marcarán como 'applied' y todo será inmutable
      console.log('✅ [Cancel] Payroll recalculado exitosamente - manteniendo payroll aunque esté vacío');
      return { recalculated: true, payrollDeleted: false };
    },
    onSuccess: (result) => {
      showSuccess(
        t("deductions.notifications.success"),
        "Deducción cancelada y payroll recalculado. Puedes marcar el período como pagado para hacer esta instancia inmutable."
      );

      // Invalidar todas las queries relevantes para refrescar la UI
      queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['user-payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
      
      // 🚨 CRÍTICO - Invalidar queries de cálculos y resúmenes de períodos
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-payment-periods-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculation-detail'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
      queryClient.invalidateQueries({ queryKey: ['expense-instances'] });
      queryClient.invalidateQueries({ queryKey: ['period-deductions'] });
      
      // Refetch inmediato para actualización rápida de UI
      queryClient.refetchQueries({ queryKey: ['user-period-calculations'] });
      queryClient.refetchQueries({ queryKey: ['consolidated-drivers'] });
      queryClient.refetchQueries({ queryKey: ['payment-calculation-detail'] });
      queryClient.refetchQueries({ queryKey: ['period-deductions'] });
    },
    onError: (error: any) => {
      console.error('Error canceling automatic deduction:', error);
      showError(
        t("deductions.notifications.error"),
        error.message || "No se pudo cancelar la deducción automática"
      );
    }
  });
}
