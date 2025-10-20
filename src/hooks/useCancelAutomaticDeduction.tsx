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

      // 2. Recalcular el payroll del usuario usando el RPC
      const { data: recalcData, error: recalcError } = await supabase
        .rpc('calculate_user_payment_period_with_validation', {
          calculation_id: paymentPeriodId
        });

      if (recalcError) {
        console.error('Error recalculating payroll:', recalcError);
        // No lanzamos error aquí porque la cancelación fue exitosa
        // Solo mostramos una advertencia
        showError(
          t("deductions.notifications.warning"),
          "La deducción fue cancelada pero hubo un problema al recalcular el payroll"
        );
      }

      // 3. Verificar si el payroll quedó vacío (sin transacciones)
      const { data: payrollData, error: payrollError } = await supabase
        .from('user_payrolls')
        .select(`
          id,
          gross_earnings,
          other_income,
          fuel_expenses,
          total_deductions
        `)
        .eq('id', paymentPeriodId)
        .single();

      if (payrollError) {
        console.error('Error checking payroll:', payrollError);
        return { recalculated: false, payrollDeleted: false };
      }

      // Si el payroll no tiene transacciones (todos los valores en 0), eliminarlo
      const isEmpty = (
        (payrollData.gross_earnings || 0) === 0 &&
        (payrollData.other_income || 0) === 0 &&
        (payrollData.fuel_expenses || 0) === 0 &&
        (payrollData.total_deductions || 0) === 0
      );

      if (isEmpty) {
        const { error: deletePayrollError } = await supabase
          .from('user_payrolls')
          .delete()
          .eq('id', paymentPeriodId);

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
