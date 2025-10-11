import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { formatCurrency } from "@/lib/dateFormatting";
import { useTranslation } from 'react-i18next';

export interface DriverCalculation {
  id: string;
  driver_user_id: string;
  gross_earnings: number;
  fuel_expenses: number;
  total_deductions: number;
  other_income: number;
  payment_status: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
}

export function useDriverPaymentActions() {
  const { showSuccess, showError } = useFleetNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation('common');

  const markDriverAsPaid = async (
    calculationId: string,
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    setIsLoading(true);
    try {
      // ✅ USE ENHANCED ACID FUNCTION
      const { data, error } = await supabase.rpc('mark_driver_as_paid_with_validation', {
        calculation_id: calculationId,
        payment_method_used: paymentMethod,
        payment_ref: paymentReference || null,
        notes: notes || null
      });

      if (error) {
        console.error('❌ Error marking driver as paid with ACID:', error);
        
        // Provide specific error messages
        let errorMessage = error.message;
        if (errorMessage.includes('Sin permisos')) {
          showError(t('payments.no_permissions'), t('payments.no_payment_permissions'));
        } else if (errorMessage.includes('Período bloqueado')) {
          showError(t('payments.period_locked'), t('payments.period_locked_desc'));
        } else if (errorMessage.includes('ya está marcado como pagado')) {
          showError(t('payments.already_paid'), t('payments.already_paid_desc'));
        } else if (errorMessage.includes('no permite el pago')) {
          showError(t('payments.invalid_state'), t('payments.invalid_state_desc'));
        } else {
          showError(t('messages.error'), errorMessage);
        }
        return { success: false, error: errorMessage };
      }

      const result = data as any;
      if (result?.success) {
        showSuccess(
          t("payments.payment_registered"), 
          t("payments.payment_registered_desc", { amount: formatCurrency(result.net_payment || 0) })
        );
        return { success: true, data };
      } else {
        showError(result?.message || t('messages.error'));
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('❌ Error in markDriverAsPaid ACID:', error);
      showError(error.message || "Error al registrar el pago ACID");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const calculateUserPeriod = async (calculationId: string) => {
    setIsLoading(true);
    try {
      // ✅ USE NEW IMPROVED V2 FUNCTION
      const { data, error } = await supabase.rpc('calculate_driver_payment_period_v2', {
        period_calculation_id: calculationId
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        showSuccess(
          t("payments.calculation_completed"), 
          t("payments.calculation_completed_desc", { amount: formatCurrency(result.net_payment || 0) })
        );
        return { success: true, data };
      } else {
        showError(result?.message || t('messages.error'));
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error calculating user period with ACID:', error);
      showError(error.message || "Error al calcular el período con ACID");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const markMultipleDriversAsPaid = async (
    calculations: DriverCalculation[],
    paymentMethod: string,
    paymentReference?: string,
    notes?: string
  ) => {
    setIsLoading(true);
    try {
      // Extract calculation IDs for ACID bulk operation
      const calculationIds = calculations
        .filter(calc => calc.payment_status !== 'paid')
        .map(calc => calc.id);

      if (calculationIds.length === 0) {
        showError(t("payments.no_pending_drivers"));
        return { success: false, error: "No pending drivers" };
      }

      // ✅ USE ACID FUNCTION FOR ATOMIC BULK PAYMENT
      const { data, error } = await supabase.rpc('mark_multiple_drivers_as_paid_with_validation', {
        calculation_ids: calculationIds,
        payment_method_used: paymentMethod,
        payment_ref: paymentReference || null,
        notes: notes || null
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        showSuccess(
          t("payments.bulk_payments_processed"), 
          result.message || t('payments.bulk_payments_processed')
        );
        return { 
          success: true, 
          successCount: result.success_count,
          errorCount: result.error_count,
          results: result.detailed_results 
        };
      } else {
        showError(result?.message || t("payments.bulk_payments_error"));
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error in ACID bulk payment:', error);
      showError(t("payments.bulk_payments_error"));
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const checkPeriodClosureStatus = async (periodId: string) => {
    try {
      const { data, error } = await supabase.rpc('can_close_payment_period', {
        period_id: periodId
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error checking period closure status:', error);
      return { success: false, error: error.message };
    }
  };

  const closePeriodWhenComplete = async (periodId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('close_payment_period_when_complete', {
        period_id: periodId
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showSuccess(t("payments.period_closed_auto"), result.message || t("payments.period_closed_auto_desc"));
        return { success: true, data };
      } else {
        showError(result?.message || t('messages.error'));
        return { success: false, error: result?.message };
      }
    } catch (error: any) {
      console.error('Error closing period:', error);
      showError(error.message || t('messages.error'));
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    markDriverAsPaid,
    calculateUserPeriod,
    markMultipleDriversAsPaid,
    checkPeriodClosureStatus,
    closePeriodWhenComplete,
    isLoading
  };
}