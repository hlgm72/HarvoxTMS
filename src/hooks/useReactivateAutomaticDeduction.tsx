import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useTranslation } from "react-i18next";

interface ReactivateAutomaticDeductionParams {
  expenseInstanceId: string;
  userId: string;
  expenseDate: string;
  reactivationNote: string;
}

export function useReactivateAutomaticDeduction() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('payments');

  return useMutation({
    mutationFn: async ({ 
      expenseInstanceId, 
      userId, 
      expenseDate,
      reactivationNote 
    }: ReactivateAutomaticDeductionParams) => {
      // 1. Cambiar el status a 'planned'
      const { error: updateError } = await supabase
        .from('expense_instances')
        .update({ 
          status: 'planned',
          notes: reactivationNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseInstanceId);

      if (updateError) throw updateError;

      // 2. Obtener la compañía del usuario
      const { data: companyData, error: companyError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (companyError || !companyData) {
        throw new Error('No se pudo obtener la compañía del usuario');
      }

      // 3. Asegurar que existe un payment_period para esta fecha
      // Usar la función RPC que crea el período si no existe
      const { data: periodData, error: periodError } = await supabase
        .rpc('create_payment_period_if_needed', {
          target_company_id: companyData.company_id,
          target_date: expenseDate
        });

      if (periodError) {
        console.error('Error ensuring payment period:', periodError);
        throw new Error('No se pudo crear o encontrar el período de pago');
      }

      const paymentPeriodId = periodData;

      // 4. Actualizar la instancia con el payment_period_id
      const { error: linkError } = await supabase
        .from('expense_instances')
        .update({ 
          payment_period_id: paymentPeriodId
        })
        .eq('id', expenseInstanceId);

      if (linkError) throw linkError;

      // 5. Buscar el user_payroll correspondiente
      const { data: userPayroll, error: payrollError } = await supabase
        .from('user_payrolls')
        .select('id, gross_earnings, other_income, fuel_expenses, total_deductions')
        .eq('company_payment_period_id', paymentPeriodId)
        .eq('user_id', userId)
        .maybeSingle();

      if (payrollError) {
        console.error('Error finding user payroll:', payrollError);
        throw new Error('No se pudo encontrar el payroll del usuario');
      }

      // Si no existe payroll, no hay nada que recalcular
      if (!userPayroll) {
        console.log('No payroll found - deduction reactivated but no payroll to recalculate');
        return { paymentPeriodId, recalculated: false, payrollDeleted: false };
      }

      // 6. Recalcular el payroll del usuario
      const { error: recalcError } = await supabase
        .rpc('calculate_user_payment_period_with_validation', {
          calculation_id: userPayroll.id
        });

      if (recalcError) {
        console.error('Error recalculating payroll:', recalcError);
        showError(
          t("deductions.notifications.warning"),
          "La deducción fue reactivada pero hubo un problema al recalcular el payroll"
        );
        return { paymentPeriodId, recalculated: false, payrollDeleted: false };
      }

      // 7. Verificar si el payroll quedó vacío después del recálculo
      const { data: updatedPayrollData, error: updatedPayrollError } = await supabase
        .from('user_payrolls')
        .select('id, gross_earnings, other_income, fuel_expenses, total_deductions')
        .eq('id', userPayroll.id)
        .maybeSingle();

      if (updatedPayrollError) {
        console.error('Error checking updated payroll:', updatedPayrollError);
        return { paymentPeriodId, recalculated: true, payrollDeleted: false };
      }

      // Si no existe más el payroll (fue eliminado por algún trigger), informar
      if (!updatedPayrollData) {
        console.log('Payroll was deleted (by trigger or other mechanism)');
        return { paymentPeriodId, recalculated: true, payrollDeleted: true };
      }

      // Si el payroll está vacío (todos los valores en 0), eliminarlo
      const isEmpty = (
        (updatedPayrollData.gross_earnings || 0) === 0 &&
        (updatedPayrollData.other_income || 0) === 0 &&
        (updatedPayrollData.fuel_expenses || 0) === 0 &&
        (updatedPayrollData.total_deductions || 0) === 0
      );

      if (isEmpty) {
        console.log('Deleting empty payroll with ID:', userPayroll.id);
        
        const { error: deletePayrollError } = await supabase
          .from('user_payrolls')
          .delete()
          .eq('id', userPayroll.id);

        if (deletePayrollError) {
          console.error('Error deleting empty payroll:', deletePayrollError);
          return { paymentPeriodId, recalculated: true, payrollDeleted: false };
        }

        console.log('Empty payroll deleted successfully');
        return { paymentPeriodId, recalculated: true, payrollDeleted: true };
      }

      return { paymentPeriodId, recalculated: true, payrollDeleted: false };
    },
    onSuccess: (result) => {
      if (result.payrollDeleted) {
        showSuccess(
          t("deductions.notifications.success"),
          "Deducción reactivada y payroll eliminado (quedó vacío tras recalcular)"
        );
      } else {
        showSuccess(
          t("deductions.notifications.success"),
          "Deducción reactivada y aplicada al payroll exitosamente"
        );
      }

      // Invalidar todas las queries relevantes
      queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['user-payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['company-payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['deductions-stats'] });
    },
    onError: (error: any) => {
      console.error('Error reactivating automatic deduction:', error);
      showError(
        t("deductions.notifications.error"),
        error.message || "No se pudo reactivar la deducción automática"
      );
    }
  });
}
