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
      const { error: updateError } = await supabase
        .from('expense_instances')
        .update({ 
          status: 'cancelled',
          notes: cancellationNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseInstanceId);

      if (updateError) throw updateError;

      // 2. Obtener el user_payroll correspondiente a este periodo y usuario
      const { data: payrollData, error: payrollError } = await supabase
        .from('user_payrolls')
        .select('id, gross_earnings, other_income, fuel_expenses, total_deductions')
        .eq('user_id', userId)
        .eq('company_payment_period_id', paymentPeriodId)
        .maybeSingle();

      if (payrollError) {
        console.error('Error fetching payroll:', payrollError);
        return { recalculated: false, payrollDeleted: false };
      }

      // Si no existe payroll, no hay nada más que hacer
      if (!payrollData) {
        return { recalculated: false, payrollDeleted: false };
      }

      // 3. Recalcular el payroll del usuario usando el RPC
      const { error: recalcError } = await supabase
        .rpc('calculate_user_payment_period_with_validation', {
          calculation_id: paymentPeriodId
        });

      if (recalcError) {
        console.error('Error recalculating payroll:', recalcError);
        showError(
          t("deductions.notifications.warning"),
          "La deducción fue cancelada pero hubo un problema al recalcular el payroll"
        );
        return { recalculated: false, payrollDeleted: false };
      }

      // 4. Verificar si el payroll quedó vacío después del recálculo
      const { data: updatedPayrollData, error: updatedPayrollError } = await supabase
        .from('user_payrolls')
        .select('id, gross_earnings, other_income, fuel_expenses, total_deductions')
        .eq('id', payrollData.id)
        .maybeSingle();

      if (updatedPayrollError) {
        console.error('Error checking updated payroll:', updatedPayrollError);
        return { recalculated: true, payrollDeleted: false };
      }

      // Si no existe más el payroll (fue eliminado por algún trigger), informar
      if (!updatedPayrollData) {
        return { recalculated: true, payrollDeleted: true };
      }

      // Si el payroll está vacío (todos los valores en 0), eliminarlo
      const isEmpty = (
        (updatedPayrollData.gross_earnings || 0) === 0 &&
        (updatedPayrollData.other_income || 0) === 0 &&
        (updatedPayrollData.fuel_expenses || 0) === 0 &&
        (updatedPayrollData.total_deductions || 0) === 0
      );

      if (isEmpty) {
        const { error: deletePayrollError } = await supabase
          .from('user_payrolls')
          .delete()
          .eq('id', payrollData.id);

        if (deletePayrollError) {
          console.error('Error deleting empty payroll:', deletePayrollError);
          return { recalculated: true, payrollDeleted: false };
        }

        return { recalculated: true, payrollDeleted: true };
      }

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
