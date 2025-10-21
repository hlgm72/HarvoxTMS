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

      // 4. Verificar si el payroll quedó vacío después del recálculo
      console.log('🔍 [Cancel] Step 4: Checking if payroll is empty after recalculation');
      const { data: updatedPayrollData, error: updatedPayrollError } = await supabase
        .from('user_payrolls')
        .select('id, gross_earnings, other_income, fuel_expenses, total_deductions')
        .eq('id', payrollData.id)
        .maybeSingle();

      if (updatedPayrollError) {
        console.error('❌ [Cancel] Error checking updated payroll:', updatedPayrollError);
        return { recalculated: true, payrollDeleted: false };
      }

      // Si no existe más el payroll (fue eliminado por algún trigger), informar
      if (!updatedPayrollData) {
        console.log('✅ [Cancel] Payroll was deleted (by trigger or other mechanism)');
        return { recalculated: true, payrollDeleted: true };
      }

      console.log('✅ [Cancel] Updated payroll data:', updatedPayrollData);

      // Si el payroll está vacío (todos los valores en 0), eliminarlo
      const isEmpty = (
        (updatedPayrollData.gross_earnings || 0) === 0 &&
        (updatedPayrollData.other_income || 0) === 0 &&
        (updatedPayrollData.fuel_expenses || 0) === 0 &&
        (updatedPayrollData.total_deductions || 0) === 0
      );

      console.log('🔍 [Cancel] Is payroll empty?', isEmpty);

      if (isEmpty) {
        console.log('🔍 [Cancel] Step 5: Deleting empty payroll with ID:', payrollData.id);
        console.log('🔍 [Cancel] Payroll to delete:', updatedPayrollData);
        
        const { data: deleteData, error: deletePayrollError } = await supabase
          .from('user_payrolls')
          .delete()
          .eq('id', payrollData.id)
          .select();

        console.log('🔍 [Cancel] Delete result:', { data: deleteData, error: deletePayrollError });

        if (deletePayrollError) {
          console.error('❌ [Cancel] Error deleting empty payroll:', deletePayrollError);
          console.error('❌ [Cancel] Full error details:', JSON.stringify(deletePayrollError, null, 2));
          return { recalculated: true, payrollDeleted: false };
        }

        console.log('✅ [Cancel] Empty payroll deleted successfully');
        return { recalculated: true, payrollDeleted: true };
      }

      console.log('✅ [Cancel] Payroll recalculated but not empty - keeping it');
      return { recalculated: true, payrollDeleted: false };
    },
    onSuccess: (result) => {
      if (result.payrollDeleted) {
        showSuccess(
          t("deductions.notifications.success"),
          "Deducción cancelada y payroll eliminado (no tenía otras transacciones)"
        );
      } else {
        showSuccess(
          t("deductions.notifications.success"),
          "Deducción cancelada y payroll recalculado exitosamente"
        );
      }

      // Invalidar todas las queries relevantes
      queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['user-payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
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
