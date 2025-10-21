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
        .select('id')
        .eq('company_payment_period_id', paymentPeriodId)
        .eq('user_id', userId)
        .maybeSingle();

      if (payrollError) {
        console.error('Error finding user payroll:', payrollError);
        throw new Error('No se pudo encontrar el payroll del usuario');
      }

      let payrollId = userPayroll?.id;

      // Si no existe payroll, crearlo
      if (!payrollId) {
        console.log('No payroll found - creating one for the user');
        
        const { data: newPayroll, error: createError } = await supabase
          .from('user_payrolls')
          .insert([{
            company_payment_period_id: paymentPeriodId,
            user_id: userId,
            company_id: companyData.company_id,
            payroll_role: 'company_driver'
          }])
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating user payroll:', createError);
          throw new Error('No se pudo crear el payroll del usuario');
        }

        payrollId = newPayroll.id;
      }

      // 6. Recalcular el payroll del usuario
      const { error: recalcError } = await supabase
        .rpc('calculate_user_payment_period_with_validation', {
          calculation_id: payrollId
        });

      if (recalcError) {
        console.error('Error recalculating payroll:', recalcError);
        showError(
          t("deductions.notifications.warning"),
          "La deducción fue reactivada pero hubo un problema al recalcular el payroll"
        );
      }

      return { paymentPeriodId, recalculated: !recalcError };
    },
    onSuccess: () => {
      showSuccess(
        t("deductions.notifications.success"),
        "Deducción reactivada y aplicada al payroll exitosamente"
      );

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
